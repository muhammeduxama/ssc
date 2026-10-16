"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { isFile, saveUpload, uploadProblem } from "@/lib/files";
import { queueMail } from "@/lib/mail/send";
import { requireDocs } from "@/lib/mail/templates";
import { ACCREDITATIONS, NOTIFY_PREFS, QUALIFICATIONS, normalisePostcode } from "@/lib/mechanic/profile";
import { createSession, getSession, IMPERSONATOR_COOKIE, isStaff, secureCookies, SESSION_COOKIE } from "@/lib/session";

export type Result = { ok: boolean; message: string; errors?: Record<string, string> };

/** Staff may edit any mechanic; a mechanic only themself. */
async function authorise(targetId: number, staffOnly = false) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (isStaff(s)) return s;
  if (!staffOnly && s.role === "mechanic" && s.id === String(targetId)) return s;
  throw new Error("forbidden");
}
const refresh = (id: number) => {
  revalidatePath(`/admin/mechanics/${id}`);
  revalidatePath("/mechanic/profile");
};
const laravelHash = async (pw: string) => (await bcrypt.hash(pw, 10)).replace(/^\$2[ab]\$/, "$2y$");

const skillsSchema = z.object({
  work_history_years: z.coerce.number({ message: "Years must be a number" }).min(0).max(50, "Between 0 and 50 years"),
  work_history_description: z.string().trim().min(1, "Tell customers about yourself").max(2000),
  post_code: z.string().trim().min(1, "Postcode is required").max(10),
  street: z.string().trim().min(1, "Street is required"),
  travel_radius: z.coerce.number({ message: "Radius must be a number" }),
  fname: z.string().trim().min(1, "First name is required"),
  lname: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email"),
  city: z.string().trim().optional(),
});

/** MechanicController@skills / ProfileController@skills */
export async function saveSkills(id: number, _: Result | null, form: FormData): Promise<Result> {
  await authorise(id);
  const mobile = form.get("mobile_mechanic_service");
  const garage = form.get("collection_and_delivery");
  if (!mobile && !garage) return { ok: false, message: "Choose at least one service type.", errors: { service_type: "Choose at least one service type." } };
  const p = skillsSchema.safeParse(Object.fromEntries(form));
  if (!p.success) {
    const errors = Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  const pc = await db.postcodes.findFirst({ where: { postcode: normalisePostcode(p.data.post_code) }, include: { cities: { include: { counties: true } } } });
  if (!pc) return { ok: false, message: "Postcode is incorrect", errors: { post_code: "Postcode is incorrect" } };
  const clash = await db.users.findFirst({ where: { email: p.data.email, NOT: { id: BigInt(id) } }, select: { id: true } });
  if (clash) return { ok: false, message: "That email is already used by another account.", errors: { email: "Already in use" } };
  const serviceType = `${mobile ? "Mobile Mechanic Service," : ""}${garage ? "Collection and Delivery" : ""}`;
  await db.users.update({
    where: { id: BigInt(id) },
    data: {
      experience: p.data.work_history_years,
      note: p.data.work_history_description,
      post_code: p.data.post_code,
      fname: p.data.fname,
      lname: p.data.lname,
      phone: p.data.phone,
      company: p.data.company ?? null,
      email: p.data.email,
      street: p.data.street,
      county: pc.cities?.counties?.name ?? null,
      city: p.data.city ?? null,
      radius: p.data.travel_radius,
      service_type: serviceType,
      lat: pc.lat,
      long: pc.long,
      updated_at: new Date(),
    },
  });
  refresh(id);
  return { ok: true, message: "Profile updated." };
}

/** ...@dp: profile picture (≤400×400 in Laravel; enforced client-side). */
export async function saveProfilePicture(id: number, form: FormData): Promise<Result> {
  await authorise(id);
  const f = form.get("profile_picture");
  if (!isFile(f) || !/^image\/(jpeg|png|jpg)$/.test(f.type)) return { ok: false, message: "Upload a JPG or PNG image." };
  const path = await saveUpload(f, "blogs/users");
  await db.users.update({ where: { id: BigInt(id) }, data: { profile_photo_path: path, updated_at: new Date() } });
  refresh(id);
  return { ok: true, message: "Profile picture updated." };
}

/** ...@qualification: replaces qualifications and accreditations. */
export async function saveQualifications(id: number, quals: { type: string; name: string }[], accs: string[]): Promise<Result> {
  await authorise(id);
  const now = new Date();
  const q = quals.filter((x) => QUALIFICATIONS.includes(x.type));
  const a = [...new Set(accs.filter((x) => ACCREDITATIONS.includes(x)))];
  await db.$transaction([
    db.userqualifications.deleteMany({ where: { user_id: BigInt(id) } }),
    db.userqualifications.createMany({ data: q.map((x) => ({ user_id: BigInt(id), qualification: x.type, name: x.name.trim() || "Qualification name not provided", created_at: now, updated_at: now })) }),
    db.useraccreditations.deleteMany({ where: { user_id: BigInt(id) } }),
    db.useraccreditations.createMany({ data: a.map((x) => ({ user_id: BigInt(id), accreditation: x, created_at: now, updated_at: now })) }),
  ]);
  refresh(id);
  return { ok: true, message: "Qualifications saved." };
}

/** ...@per_booking */
export async function savePreference(id: number, pref: string): Promise<Result> {
  await authorise(id);
  if (!NOTIFY_PREFS.includes(pref)) return { ok: false, message: "Choose a preference." };
  await db.users.update({ where: { id: BigInt(id) }, data: { per_booking: pref, updated_at: new Date() } });
  refresh(id);
  return { ok: true, message: "Preference saved." };
}

/** Types of work covered (category_user). The Laravel handler was empty; this saves it. */
export async function saveCategories(id: number, ids: number[]): Promise<Result> {
  await authorise(id);
  const now = new Date();
  await db.$transaction([
    db.category_user.deleteMany({ where: { user_id: BigInt(id) } }),
    db.category_user.createMany({ data: [...new Set(ids)].map((c) => ({ user_id: BigInt(id), maincategory_id: BigInt(c), created_at: now, updated_at: now })) }),
  ]);
  refresh(id);
  return { ok: true, message: "Work types saved." };
}

/** ...@uploadDocuments: one requiredoc row per uploaded file (form keys are document ids). */
export async function uploadMechanicDocuments(id: number, form: FormData): Promise<Result> {
  await authorise(id);
  for (const [, value] of form.entries()) if (isFile(value) && uploadProblem(value)) return { ok: false, message: uploadProblem(value)! };
  const now = new Date();
  let n = 0;
  for (const [key, value] of form.entries()) {
    if (!/^\d+$/.test(key) || !isFile(value)) continue;
    const path = await saveUpload(value, "ssc/mechanic");
    await db.requiredocs.create({ data: { user_id: BigInt(id), document_id: BigInt(key), document: path, status: "pending", created_at: now, updated_at: now } });
    n++;
  }
  refresh(id);
  return n ? { ok: true, message: `${n} document${n === 1 ? "" : "s"} uploaded.` } : { ok: false, message: "Choose at least one file." };
}

// ---------------- staff only ----------------

/** ...@approved / @rejected */
export async function setDocumentStatus(userId: number, docId: number, status: "approved" | "rejected" | "pending"): Promise<Result> {
  await authorise(userId, true);
  await db.requiredocs.update({ where: { id: BigInt(docId) }, data: { status, updated_at: new Date() } });
  refresh(userId);
  return { ok: true, message: `Document ${status}.` };
}

/** ...@changeStatus / @createAccount */
export async function setMechanicStatus(id: number, active: boolean): Promise<Result> {
  await authorise(id, true);
  await db.users.update({ where: { id: BigInt(id) }, data: { status: active, updated_at: new Date() } });
  revalidatePath("/admin/mechanics");
  refresh(id);
  return { ok: true, message: "Status change successfully." };
}

/** ...@changePassword */
export async function adminSetPassword(id: number, password: string, confirm: string): Promise<Result> {
  await authorise(id, true);
  if (password.length < 8) return { ok: false, message: "Use at least 8 characters." };
  if (password !== confirm) return { ok: false, message: "Passwords don’t match." };
  await db.users.update({ where: { id: BigInt(id) }, data: { password: await laravelHash(password), updated_at: new Date() } });
  return { ok: true, message: "Password changed." };
}

/** ...@deleteMechanic / @delete */
export async function deleteMechanic(id: number): Promise<Result> {
  await authorise(id, true);
  try {
    await db.users.delete({ where: { id: BigInt(id) } });
  } catch {
    return { ok: false, message: "This mechanic has records that prevent deletion." };
  }
  revalidatePath("/admin/mechanics");
  return { ok: true, message: "Mechanic deleted successfully..!" };
}

/** ...@sendEmail: RequireDocMailJob */
export async function sendRequiredDocsEmail(id: number): Promise<Result> {
  await authorise(id, true);
  const u = await db.users.findUnique({ where: { id: BigInt(id) }, select: { email: true, api_token: true } });
  if (!u?.api_token || !u.email) return { ok: false, message: "This mechanic has no login token yet." };
  queueMail(requireDocs(u.email, u.api_token), 20_000);
  return { ok: true, message: "Email Sent Successfully..!" };
}

/** ...@store_seo */
export async function saveMechanicSeo(id: number, seo: { title: string; keywords: string; description: string; schema: string }): Promise<Result> {
  await authorise(id, true);
  const now = new Date();
  const existing = await db.mechanicpages.findFirst({ where: { user_id: BigInt(id) } });
  const data = { page_title: seo.title, seo_keywords: seo.keywords, seo_description: seo.description, schema_code: seo.schema, updated_at: now };
  if (existing) await db.mechanicpages.update({ where: { id: existing.id }, data });
  else await db.mechanicpages.create({ data: { ...data, user_id: BigInt(id), created_at: now } });
  refresh(id);
  return { ok: true, message: "Mechanic profile is updated with this seo content" };
}

/** ...@mechanicLogin / ClientController@clientLogin: act as this user, keep the admin session to return to. */
export async function loginAsUser(id: number) {
  const s = await getSession();
  if (!s || !isStaff(s)) redirect("/login");
  const u = await db.users.findUnique({ where: { id: BigInt(id) } });
  if (!u) redirect("/admin/mechanics");
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  if (current) jar.set(IMPERSONATOR_COOKIE, current, { httpOnly: true, sameSite: "lax", secure: secureCookies, path: "/", maxAge: 60 * 60 * 8 });
  await createSession({ kind: "user", id: String(u.id), role: Number(u.role_id) === 1 ? "mechanic" : "customer", name: `${u.fname} ${u.lname}`.trim(), email: u.email });
  redirect("/dashboard");
}

export async function stopImpersonating() {
  const jar = await cookies();
  const back = jar.get(IMPERSONATOR_COOKIE)?.value;
  if (!back) redirect("/login");
  jar.set(SESSION_COOKIE, back, { httpOnly: true, sameSite: "lax", secure: secureCookies, path: "/", maxAge: 60 * 60 * 24 * 7 });
  jar.delete(IMPERSONATOR_COOKIE);
  redirect("/dashboard");
}
