import "server-only";
import { db } from "@/lib/db";

export const QUALIFICATIONS = ["NVQ Level 1", "NVQ Level 2", "NVQ Level 3", "City Guide Level 1", "City Guide Level 2", "City Guide Level 3", "EV / HEV Qualification / Training", "Other Qualification"];
export const ACCREDITATIONS = ["ATA Level 2", "ATA Level 3", "ATA Level 4", "Other Accreditation"];
export const NOTIFY_PREFS = ["Per Booking Emails", "No Emails"];

export const serviceTypeLabel = (t: string | null) =>
  t === "Mobile Mechanic Service," ? "Mobile mechanic" : t === "Collection and Delivery" || t === "Mobile Mechanic Service,Collection and Delivery" ? "Garage mechanic" : "Not given";

/** Postcodes are stored without spaces, upper case (e.g. RG28LL). */
export const normalisePostcode = (p: string) => p.replace(/\s+/g, "").toUpperCase();

export async function getMechanicProfile(id: number) {
  const u = await db.users.findUnique({
    where: { id: BigInt(id) },
    include: {
      requiredocs: { include: { documents: true }, orderBy: { id: "desc" } },
      userqualifications: true,
      useraccreditations: true,
      category_user: true,
      mechanicpages: { take: 1 },
    },
  });
  if (!u || Number(u.role_id) !== 1) return null;
  const [documents, categories, completed, progress, reviews] = await Promise.all([
    db.documents.findMany({ orderBy: { id: "asc" } }),
    db.maincategories.findMany({ where: { status: true }, orderBy: { id: "asc" } }),
    db.orderassigns.count({ where: { user_id: u.id, status: "completed" } }),
    db.orderassigns.count({ where: { user_id: u.id, status: "assigned" } }),
    db.reviews.findMany({ where: { user_id: u.id }, orderBy: { id: "desc" }, take: 20 }),
  ]);
  const seo = u.mechanicpages[0];
  return {
    id: Number(u.id),
    fname: u.fname,
    lname: u.lname,
    email: u.email,
    phone: u.phone,
    company: u.company ?? "",
    street: u.street ?? "",
    houseNo: u.house_no ?? "",
    city: u.city ?? "",
    county: u.county ?? "",
    postcode: u.post_code ?? "",
    radius: u.radius ?? 15,
    experience: u.experience ?? 0,
    about: u.note ?? "",
    serviceType: u.service_type ?? "",
    perBooking: u.per_booking ?? "",
    photo: u.profile_photo_path,
    active: u.status,
    apiToken: u.api_token,
    joined: u.created_at?.toISOString() ?? null,
    stats: { completed, progress },
    qualifications: u.userqualifications.map((q) => ({ type: q.qualification, name: q.name ?? "" })),
    accreditations: u.useraccreditations.map((a) => a.accreditation),
    categoryIds: u.category_user.map((c) => Number(c.maincategory_id)),
    categories: categories.map((c) => ({ id: Number(c.id), title: c.title })),
    documents: documents.map((d) => ({ id: Number(d.id), name: d.name, mandatory: d.mandatory, image: d.type === "1" })),
    uploads: u.requiredocs.map((r) => ({ id: Number(r.id), documentId: Number(r.document_id), name: r.documents?.name ?? "Document", file: r.document, status: r.status, expiry: r.expiry?.toISOString() ?? null })),
    seo: { title: seo?.page_title ?? "", keywords: seo?.seo_keywords ?? "", description: seo?.seo_description ?? "", schema: seo?.schema_code ?? "" },
    reviews: reviews.map((r) => ({ id: Number(r.id), overall: r.overall, quality: r.quality, punctuality: r.punctuality, communication: r.communication, review: r.review ?? "", response: r.response ?? "", city: r.city ?? "", at: r.created_at?.toISOString() ?? null })),
  };
}
export type MechanicProfile = NonNullable<Awaited<ReturnType<typeof getMechanicProfile>>>;

export type MechanicFilter = "all" | "mobile" | "garage" | "incomplete" | "requests";

/** Admin\Mechanic\MechanicController list methods. */
export async function listMechanics(filter: MechanicFilter, q?: string) {
  const where =
    filter === "mobile"
      ? { role_id: 1, service_type: "Mobile Mechanic Service," }
      : filter === "garage"
        ? { OR: [{ role_id: 1, service_type: "Collection and Delivery" }, { service_type: "Mobile Mechanic Service,Collection and Delivery" }] }
        : filter === "incomplete"
          ? { role_id: 1, service_type: null }
          : filter === "requests"
            ? { role_id: 1, status: false }
            : { role_id: 1 };
  const rows = await db.users.findMany({ where, orderBy: { id: "asc" }, include: { requiredocs: { include: { documents: { select: { name: true } } } } } });
  const t = q?.trim().toLowerCase();
  return rows
    .map((m) => ({
      id: Number(m.id),
      company: m.company ?? "",
      postcode: m.post_code ?? "",
      city: m.city ?? "",
      name: `${m.fname} ${m.lname}`.trim(),
      email: m.email,
      phone: m.phone,
      type: serviceTypeLabel(m.service_type),
      active: m.status,
      docs: m.requiredocs.filter((r) => r.documents).map((r) => ({ name: r.documents!.name.split(/\s+/).slice(0, 3).join(" "), status: r.status })),
      joined: m.created_at?.toISOString() ?? null,
    }))
    .filter((m) => !t || [m.id, m.company, m.postcode, m.city, m.name, m.email, m.phone].join(" ").toLowerCase().includes(t));
}
