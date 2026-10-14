"use server";
import { Prisma } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@/lib/crud/engine";
import { db } from "@/lib/db";
import { isFile, resolvePublic, saveUpload, uploadProblem } from "@/lib/files";
import { requireStaff } from "@/lib/guard";
import { queueMail } from "@/lib/mail/send";
import { generalEmail, joinNetwork, reviewForMechanic } from "@/lib/mail/templates";
import { parseCsv } from "@/lib/csv";

export type Result = { ok: boolean; message: string };
const dec = (v: number | string) => new Prisma.Decimal(v);
const num = z.coerce.number().finite();

async function setting() {
  let s = await db.settings.findFirst({ orderBy: { id: "desc" } });
  if (!s) {
    const now = new Date();
    s = await db.settings.create({ data: { labour_rate: dec(60), labour_hour_limit: dec(1), mot: dec(0), mot_discount: dec(0), mot_discount_percent: dec(0), garage_comission: dec(0), max_commission: 0, created_at: now, updated_at: now } });
  }
  return s;
}

// ---------------- Prices ----------------

/** FixedPriceController@servicePricesUpdate */
export async function saveFixedPrices(serviceId: number, labourHour: string, parts: Record<string, string>): Promise<Result> {
  await requireStaff();
  const h = num.safeParse(labourHour);
  if (!h.success) return { ok: false, message: "Labour hour must be a number." };
  const now = new Date();
  await db.services.update({ where: { id: BigInt(serviceId) }, data: { labour_hour: dec(h.data), updated_at: now } });
  for (const [id, price] of Object.entries(parts)) {
    const p = num.safeParse(price);
    if (p.success) await db.parts.update({ where: { id: BigInt(id) }, data: { price: dec(p.data), updated_at: now } });
  }
  revalidatePath("/admin/prices/fixed");
  return { ok: true, message: "Price is successfully updated" };
}

type Range = { make: string[]; fuel: string; yearFrom: string; yearTo: string; engineFrom: string; engineTo: string };
const rangeOf = (a: string, b: string) => (a === "ALL" || b === "ALL" ? "ALL" : Number(a) < Number(b) ? `${a}-${b}` : `${b}-${a}`);

async function upsertPrice(partId: bigint, price: number, r: Range) {
  const make = r.make.includes("ALL") ? ["ALL"] : r.make;
  const data = { price: dec(price), make: JSON.stringify(make), fuel: r.fuel, year: rangeOf(r.yearFrom, r.yearTo), engine: rangeOf(r.engineFrom, r.engineTo), updated_at: new Date() };
  const existing = await db.prices.findFirst({ where: { part_id: partId } });
  if (existing) await db.prices.update({ where: { id: existing.id }, data });
  else await db.prices.create({ data: { ...data, part_id: partId, created_at: new Date() } });
}

/** RangePriceController@setRangePrice */
export async function saveRangePrices(serviceId: number, labourHour: string, r: Range, parts: Record<string, string>): Promise<Result> {
  await requireStaff();
  const h = num.safeParse(labourHour);
  if (!h.success) return { ok: false, message: "The labour hour must be a number." };
  if (!r.make.length) return { ok: false, message: "The make field is required." };
  const svc = await db.services.update({ where: { id: BigInt(serviceId) }, data: { labour_hour: dec(h.data), updated_at: new Date() } });
  for (const [id, price] of Object.entries(parts)) {
    const p = num.safeParse(price);
    if (p.success && p.data > 0) await upsertPrice(BigInt(id), p.data, r);
  }
  revalidatePath("/admin/prices/range");
  return { ok: true, message: `Range price is set against (${svc.name})` };
}

/** RangePriceController@setRangePriceQuote: learn prices from an admin quote. */
export async function saveQuotePrices(adminQuoteId: number, r: Range): Promise<Result> {
  await requireStaff();
  if (!r.make.length) return { ok: false, message: "The make field is required." };
  const q = await db.adminquotes.update({ where: { id: BigInt(adminQuoteId) }, data: { saved: "yes", updated_at: new Date() }, include: { adminquotedetails: true } });
  for (const labour of q.adminquotedetails.filter((d) => d.type === "labour")) {
    const svc = await db.services.findFirst({ where: { name: labour.name } });
    if (!svc) continue;
    await db.services.update({ where: { id: svc.id }, data: { labour_hour: dec(Number(labour.price) / 60), updated_at: new Date() } });
    for (const d of q.adminquotedetails.filter((x) => x.type === "part")) {
      const part = await db.parts.findFirst({ where: { service_id: svc.id, name: d.name } });
      if (part) await upsertPrice(part.id, Number(d.price), { ...r, make: r.make });
    }
  }
  revalidatePath("/admin/data/quote-prices");
  return { ok: true, message: "Price is set according to this quotation" };
}

/** QuoteDataController@adminQuoteReject */
export async function skipQuotePrices(adminQuoteId: number): Promise<Result> {
  await requireStaff();
  await db.adminquotes.update({ where: { id: BigInt(adminQuoteId) }, data: { saved: "yes", updated_at: new Date() } });
  revalidatePath("/admin/data/quote-prices");
  return { ok: true, message: "Quote prices are not saved for this quote." };
}

/** RequestController: labour / part price requests (carprices). */
export async function decideCarPrice(id: number, decision: "accept" | "reject"): Promise<Result> {
  await requireStaff();
  const cp = await db.carprices.findUnique({ where: { id: BigInt(id) } });
  if (!cp) return { ok: false, message: "Request not found." };
  const now = new Date();
  if (decision === "reject") {
    await db.carprices.update({ where: { id: cp.id }, data: { status: "rejected", updated_at: now } });
    revalidatePath("/admin/data/labour-requests");
    revalidatePath("/admin/data/part-requests");
    return { ok: true, message: `${cp.type} request is rejected successfully`.toUpperCase() };
  }
  if (cp.type === "labour") {
    const s = await db.services.findFirst({ where: { name: cp.name } });
    if (s) await db.services.update({ where: { id: s.id }, data: { labour_hour: cp.value, updated_at: now } });
    await db.carprices.update({ where: { id: cp.id }, data: { status: "accepted", updated_at: now } });
    revalidatePath("/admin/data/labour-requests");
    return { ok: true, message: `Labour rate is updated for "${cp.name}"`.toUpperCase() };
  }
  // Laravel's part accept was an unfinished stub ("module is not ready yet"); here it updates the part's default price.
  const part = await db.parts.findFirst({ where: { name: cp.name } });
  if (part) await db.parts.update({ where: { id: part.id }, data: { price: cp.value, updated_at: now } });
  await db.carprices.update({ where: { id: cp.id }, data: { status: "accepted", updated_at: now } });
  revalidatePath("/admin/data/part-requests");
  return { ok: true, message: part ? `Default price updated for "${cp.name}"` : `No part named "${cp.name}" — marked accepted` };
}

// ---------------- Vehicle data ----------------

/** ModelRequestsController@approve / @reject / @addkeywords */
export async function decideModelRequest(id: number, decision: "approve" | "reject" | "keyword", modelId?: number): Promise<Result> {
  await requireStaff();
  const data = await db.modeldatas.findUnique({ where: { id: BigInt(id) } });
  if (!data) return { ok: false, message: "Request not found." };
  const now = new Date();
  if (decision === "approve") {
    const exists = await db.modals.findFirst({ where: { name: data.name, make_id: data.make_id } });
    if (!exists) await db.modals.create({ data: { make_id: data.make_id, name: data.name, slug: slugify(data.name), status: true, created_at: now, updated_at: now } });
  }
  if (decision === "keyword") {
    if (!modelId) return { ok: false, message: "Choose the model to attach this name to." };
    const m = await db.modals.findUnique({ where: { id: BigInt(modelId) } });
    if (!m) return { ok: false, message: "Model not found." };
    await db.modals.update({ where: { id: m.id }, data: { search_keywords: m.search_keywords ? `${m.search_keywords},${data.name}` : data.name, updated_at: now } });
    await db.cars.updateMany({ where: { model: data.name }, data: { model: m.name, updated_at: now } });
  }
  await db.modeldatas.delete({ where: { id: data.id } });
  revalidatePath("/admin/data/model-requests");
  return { ok: true, message: decision === "reject" ? "Request removed." : "Model list updated." };
}

/** ExceptionCase::checkMake */
async function findOrCreateMake(name: string) {
  const value = name.toUpperCase().includes("MERCEDES") ? "Mercedes-benz" : name.trim();
  const m = await db.makes.findFirst({ where: { name: value } });
  if (m) return m;
  const now = new Date();
  return db.makes.create({ data: { name: value, slug: slugify(value), status: true, created_at: now, updated_at: now } });
}

/** ModelController@bulKData: unknown models go to the "Car requests" queue (modeldatas), as in Laravel. */
export async function bulkModels(make: string, models: string[]): Promise<Result> {
  await requireStaff();
  if (!make.trim() || !models.length) return { ok: false, message: "Enter a make and at least one model." };
  const mk = await findOrCreateMake(make);
  const now = new Date();
  let queued = 0;
  for (const name of models.map((m) => m.trim()).filter(Boolean)) {
    const found = await db.modals.findFirst({ where: { make_id: mk.id, OR: [{ name: { contains: name } }, { search_keywords: { contains: name } }] } });
    if (!found) {
      await db.modeldatas.create({ data: { make_id: mk.id, name, status: "pending", created_at: now, updated_at: now } });
      queued++;
    }
  }
  return { ok: true, message: `Model list is updated with new data (${queued} sent to car requests).` };
}

/** ImportDataController@upload: CSV columns [_, make, model, year, engine, fuel] → cars (source "E"). */
export async function importCars(form: FormData): Promise<Result> {
  await requireStaff();
  const f = form.get("csv");
  if (!isFile(f) || !/\.csv$/i.test(f.name)) return { ok: false, message: "Invalid File Type." };
  const rows = parseCsv(await f.text()).slice(1);
  const now = new Date();
  let added = 0;
  for (const r of rows) {
    const [, make, model, year, engine, fuel] = r.map((x) => (x ?? "").trim());
    if (!make || !model) continue;
    const mk = await findOrCreateMake(make);
    const exists = await db.cars.findFirst({ where: { make: { contains: mk.name }, model: { contains: model }, year, engine: { contains: engine }, fuel: { contains: fuel } }, select: { id: true } });
    if (exists) continue;
    await db.cars.create({ data: { make: mk.name, model, year, engine, fuel, source: "E", oil_capacity: dec(5), coil_pack: 1, spark_plug: 4, glow_plug: 4, status: true, created_at: now, updated_at: now } });
    added++;
  }
  revalidatePath("/admin/r/cars");
  return { ok: true, message: `Data is Imported Successful. ${added} new cars added.` };
}

/** ServiceController@importCSV (disabled in Laravel; implemented with the same column layout). */
export async function importServices(form: FormData): Promise<Result> {
  await requireStaff();
  const f = form.get("csv");
  if (!isFile(f) || !/\.csv$/i.test(f.name)) return { ok: false, message: "Invalid File Type." };
  const rows = parseCsv(await f.text()).slice(1);
  const now = new Date();
  let n = 0;
  for (const r of rows) {
    if (!r[1] || !/^\d+$/.test(r[7] ?? "")) continue;
    await db.services.create({
      data: { name: r[1], parent: r[2] || null, description: r[3] || null, maincategory_id: BigInt(r[7]), status: r[6] === "active", discount: 10, is_popular: r[13] === "yes", essential: r[12] === "1", labour_hour: dec(1), created_at: now, updated_at: now },
    });
    n++;
  }
  revalidatePath("/admin/r/services");
  return { ok: true, message: `${n} services imported.` };
}

/** SitemapController@store: writes the file into Laravel's public root. */
export async function uploadSitemap(form: FormData): Promise<Result> {
  await requireStaff();
  const f = form.get("sitemape_file");
  if (!isFile(f) || !/^[\w.-]+\.xml$/i.test(f.name)) return { ok: false, message: "Upload an .xml sitemap file." };
  await writeFile(resolvePublic(f.name), Buffer.from(await f.arrayBuffer()));
  return { ok: true, message: `${f.name} uploaded to the site root.` };
}

// ---------------- Settings ----------------

/** SettingController@motUpdate / comissionUpdate / limitUpdate / hourUpdate */
export async function saveSetting(kind: "mot" | "commission" | "limit" | "hour", v: Record<string, string>): Promise<Result> {
  await requireStaff();
  const s = await setting();
  const n = (k: string) => num.parse(v[k]);
  try {
    const now = new Date();
    if (kind === "mot") {
      const mot = n("mot");
      const disc = n("mot_discount");
      await db.settings.update({ where: { id: s.id }, data: { mot: dec(mot), mot_discount: dec(disc), mot_discount_percent: dec(mot ? (disc / mot) * 100 : 0), updated_at: now } });
    }
    if (kind === "commission") await db.settings.update({ where: { id: s.id }, data: { garage_comission: dec(n("garage_comission")), max_commission: n("max_comission"), updated_at: now } });
    if (kind === "limit") await db.settings.update({ where: { id: s.id }, data: { labour_hour_limit: dec(n("labour_hour_limit")), updated_at: now } });
    if (kind === "hour") await db.settings.update({ where: { id: s.id }, data: { labour_rate: dec(n("labour_rate")), updated_at: now } });
  } catch {
    return { ok: false, message: "All fields are required and must be numbers." };
  }
  revalidatePath("/admin/settings/labour");
  return { ok: true, message: "Settings saved." };
}

/** SettingController@postcodeUpdate: find-or-create county and city, then move the postcode. */
export async function savePostcode(id: number, v: { postcode: string; lat: string; long: string; city: string; county: string }): Promise<Result> {
  await requireStaff();
  if (!v.postcode || !v.city || !v.county || !v.lat || !v.long) return { ok: false, message: "All fields are required." };
  const now = new Date();
  const county = (await db.counties.findFirst({ where: { name: { contains: v.county } } })) ?? (await db.counties.create({ data: { name: v.county, created_at: now, updated_at: now } }));
  const city =
    (await db.cities.findFirst({ where: { name: { contains: v.city } } })) ??
    (await db.cities.findFirst({ where: { name: slugify(v.city) } })) ??
    (await db.cities.create({ data: { county_id: county.id, slug: slugify(v.city), name: v.city, page_title: v.city, labour_rate: dec(0), created_at: now, updated_at: now } }));
  await db.postcodes.update({ where: { id: BigInt(id) }, data: { postcode: v.postcode, lat: dec(v.lat), long: dec(v.long), city_id: city.id, county_id: county.id, updated_at: now } });
  revalidatePath("/admin/settings/postcodes");
  return { ok: true, message: "County, City and postcode modifications are saved now." };
}

// ---------------- Stripe ----------------

/** HomeController@update (admin only) */
export async function saveStripe(v: { publish_key: string; secret_key: string; client_id: string }): Promise<Result> {
  await requireStaff(true);
  if (!v.publish_key || !v.client_id) return { ok: false, message: "All fields are required." };
  const s = await db.stripes.findFirst();
  const now = new Date();
  const data = { publishable_key: v.publish_key, client_id: v.client_id, updated_at: now, ...(v.secret_key ? { secret_key: v.secret_key } : {}) };
  if (s) await db.stripes.update({ where: { id: s.id }, data });
  else if (v.secret_key) await db.stripes.create({ data: { ...data, secret_key: v.secret_key, created_at: now } });
  else return { ok: false, message: "The secret key is required." };
  revalidatePath("/admin/payments/stripe");
  return { ok: true, message: "Stripe keys saved." };
}

// ---------------- Reviews ----------------

const reviewSchema = z.object({ quality: z.coerce.number().int().min(1).max(5), punctuality: z.coerce.number().int().min(1).max(5), communication: z.coerce.number().int().min(1).max(5), overall: z.coerce.number().int().min(1).max(5), review: z.string().trim().min(1) });

/** ReviewController@store: admin adds a review on a completed order and notifies the mechanic. */
export async function addReview(orderId: number, v: Record<string, string>): Promise<Result> {
  await requireStaff();
  const p = reviewSchema.safeParse(v);
  if (!p.success) return { ok: false, message: "Rate all four areas (1–5) and write the review." };
  const order = await db.orders.findUnique({ where: { id: BigInt(orderId) }, include: { orderassigns: { take: 1, include: { users: true } } } });
  const mech = order?.orderassigns[0]?.users;
  if (!order || !mech) return { ok: false, message: "That order has no assigned mechanic." };
  const now = new Date();
  const r = await db.reviews.create({ data: { order_id: order.id, user_id: mech.id, ...p.data, created_at: now, updated_at: now } });
  queueMail(reviewForMechanic({ company: mech.company ?? `${mech.fname} ${mech.lname}`, email: mech.email }, { ...p.data, order_id: Number(r.order_id), token: order.token }));
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Review is added successfully and notification is also sent to mechanic" };
}

export async function updateReview(id: number, v: Record<string, string>): Promise<Result> {
  await requireStaff();
  const p = reviewSchema.safeParse(v);
  if (!p.success) return { ok: false, message: "Rate all four areas (1–5) and write the review." };
  await db.reviews.update({ where: { id: BigInt(id) }, data: { ...p.data, updated_at: new Date() } });
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Review is successfully updated" };
}

export async function deleteReview(id: number): Promise<Result> {
  await requireStaff();
  await db.reviews.delete({ where: { id: BigInt(id) } });
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Review is successfully deleted!" };
}

// ---------------- Notifications ----------------

export async function markNotification(id: number | "all"): Promise<Result> {
  await requireStaff();
  if (id === "all") await db.notifications.updateMany({ where: { seen: false }, data: { seen: true } });
  else await db.notifications.update({ where: { id: BigInt(id) }, data: { seen: true } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Marked as read." };
}

// ---------------- Mailbox ----------------

/** MailController@sendMail: save the email + attachments, then send one by one (12s apart, like the queue). */
export async function sendGeneralMail(form: FormData): Promise<Result> {
  await requireStaff();
  const all = form.get("checked") === "1";
  const subject = String(form.get("subject") ?? "").trim();
  const message = String(form.get("message") ?? "");
  const toRaw = String(form.get("to") ?? "").trim();
  if (!all && !toRaw) return { ok: false, message: "The to field is required." };
  const recipients = all
    ? (await db.users.findMany({ where: { role_id: 1, status: true }, select: { email: true } })).map((u) => u.email)
    : toRaw.split(",").map((e) => e.trim()).filter(Boolean);
  const now = new Date();
  for (const f of form.getAll("attach")) if (isFile(f) && uploadProblem(f)) return { ok: false, message: uploadProblem(f)! };
  const email = await db.emails.create({ data: { subject, to: all ? "All Mechanics" : toRaw, message, created_at: now, updated_at: now } });
  const files: { src: string; type: string }[] = [];
  for (const f of form.getAll("attach")) {
    if (!isFile(f)) continue;
    const src = await saveUpload(f, "ssc/email/attach");
    const type = (f.name.split(".").pop() ?? "").toLowerCase();
    await db.emailfiles.create({ data: { email_id: email.id, src, type, created_at: now, updated_at: now } });
    files.push({ src, type });
  }
  recipients.forEach((to, i) => queueMail(generalEmail(to, subject, message, files), (i + 1) * 12_000));
  revalidatePath("/admin/mail");
  return { ok: true, message: `Email queued for ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.` };
}

export async function deleteMails(ids: number[]): Promise<Result> {
  await requireStaff();
  await db.emailfiles.deleteMany({ where: { email_id: { in: ids.map(BigInt) } } });
  await db.emails.deleteMany({ where: { id: { in: ids.map(BigInt) } } });
  revalidatePath("/admin/mail");
  return { ok: true, message: `${ids.length} deleted.` };
}

/** MailController@sendJoinNetwork */
export async function sendJoinNetwork(emails: string, subject: string): Promise<Result> {
  await requireStaff();
  const list = emails.split(",").map((e) => e.trim()).filter(Boolean);
  if (!list.length) return { ok: false, message: "The emails field is required." };
  const subj = subject.trim() || "JOIN OUR NETWORK, BE PART OF UK's FAVOURITE GARAGE & MOBILE MECHANIC NETWORK";
  list.forEach((to, i) => queueMail(joinNetwork(to, subj), (i + 1) * 20_000));
  return { ok: true, message: "Email will be sent in background using queue" };
}

/** DocMailController@store */
export async function saveDocMail(subject: string, description: string): Promise<Result> {
  await requireStaff();
  if (!subject.trim() || !description.trim()) return { ok: false, message: "Subject and description are required." };
  const now = new Date();
  const d = await db.docmails.findFirst({ orderBy: { id: "desc" } });
  if (d) await db.docmails.update({ where: { id: d.id }, data: { subject, description, updated_at: now } });
  else await db.docmails.create({ data: { subject, description, created_at: now, updated_at: now } });
  return { ok: true, message: "Required documents email saved." };
}
