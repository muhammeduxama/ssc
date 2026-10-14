"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { distanceMiles } from "@/lib/geo";
import { isFile, saveUpload } from "@/lib/files";
import { commissionFor, settings } from "@/lib/mechanic/jobs";
import { queueMail } from "@/lib/mail/send";
import { cardDeclined, followOnQuote, newQuotation, orderCompleted, requestAccepted, reviewResponse } from "@/lib/mail/templates";
import { getSession } from "@/lib/session";
import { slotStart } from "@/lib/time";
import { assignOrder } from "@/lib/mechanic/assign";

export type Result = { ok: boolean; message: string; link?: string };
const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);

async function mechanic() {
  const s = await getSession();
  if (!s || s.role !== "mechanic") redirect("/login");
  return BigInt(s.id);
}
/** An assignment that belongs to the signed-in mechanic. */
async function ownAssign(assignId: number) {
  const me = await mechanic();
  const a = await db.orderassigns.findFirst({ where: { id: BigInt(assignId), user_id: me } });
  if (!a) throw new Error("not your job");
  return a;
}
const bump = async (assignId: bigint, delta: number) => {
  const a = await db.orderassigns.findUnique({ where: { id: assignId } });
  await db.orderassigns.update({ where: { id: assignId }, data: { price: dec(Number(a?.price ?? 0) + delta), updated_at: new Date() } });
};
const refreshJob = (id: number | bigint) => revalidatePath(`/mechanic/jobs/${id}`);

// ---------------------------------------------------------------- requests

/** AppController@orderAccept: take the booking at a customer slot. */
export async function acceptJob(requestId: number, slotId: number): Promise<Result> {
  const me = await mechanic();
  const req = await db.orderrequests.findFirst({ where: { id: BigInt(requestId), user_id: me }, include: { users: { include: { requiredocs: { select: { status: true } } } } } });
  if (!req) return { ok: false, message: "Request not found." };
  const docs = req.users.requiredocs;
  if (!docs.length) return { ok: false, message: "Please upload your required documents before you accept any job.", link: "/mechanic/profile" };
  if (!docs.every((d) => d.status === "approved")) return { ok: false, message: "Documents are waiting for approval! Please wait for your documents to be approved." };
  const slot = await db.timeslots.findUnique({ where: { id: BigInt(slotId) } });
  if (!slot || slot.order_id !== req.order_id) return { ok: false, message: "Please select both time and date accurately" };

  const res = await assignOrder(req.order_id, me, slot, req.id);
  if (!res.ok) return res;
  const assign = res.assign;
  revalidatePath("/mechanic/requests");
  return { ok: true, message: "You have successfully accepted this order.", link: `/mechanic/jobs/${assign.id}` };
}

/** AppController@rejectRequestReason */
export async function rejectJob(requestId: number, reason: string): Promise<Result> {
  const me = await mechanic();
  if (reason.trim().length < 5) return { ok: false, message: "Reason must have minimum 5 characters" };
  const req = await db.orderrequests.findFirst({ where: { id: BigInt(requestId), user_id: me } });
  if (!req) return { ok: false, message: "Request not found." };
  const now = new Date();
  await db.orderrequests.update({ where: { id: req.id }, data: { status: "rejected", updated_at: now } });
  const r = await db.orderrequestrejects.findFirst({ where: { orderrequest_id: req.id } });
  if (r) await db.orderrequestrejects.update({ where: { id: r.id }, data: { reason, updated_at: now } });
  else await db.orderrequestrejects.create({ data: { orderrequest_id: req.id, reason, created_at: now, updated_at: now } });
  revalidatePath("/mechanic/requests");
  return { ok: true, message: "Thanks, the customer won’t see this request from you any more." };
}

// ---------------------------------------------------------------- schedule

/** AppController@visitUpdate: free date + time. */
export async function updateVisit(assignId: number, date: string, time: string): Promise<Result> {
  const a = await ownAssign(assignId);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { ok: false, message: "Select a valid date" };
  if (!time) return { ok: false, message: "Select a valid time" };
  const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "");
  const start = slotStart(label, time);
  await db.orderassigns.update({ where: { id: a.id }, data: { date: label, time, start_at: start, end_at: start ? new Date(start.getTime() + 2 * 3600_000) : null, updated_at: new Date() } });
  refreshJob(assignId);
  return { ok: true, message: "Date and time updated successfully" };
}

/** AppController@updateQuoteSchedule: pick one of the customer's slots; emails the customer again. */
export async function updateVisitFromSlot(assignId: number, slotId: number): Promise<Result> {
  const a = await ownAssign(assignId);
  const slot = await db.timeslots.findUnique({ where: { id: BigInt(slotId) } });
  if (!slot || slot.order_id !== a.order_id) return { ok: false, message: "Please select both time and date accurately" };
  await db.orderassigns.update({ where: { id: a.id }, data: { time: slot.time, date: slot.date, start_at: slot.start_at, end_at: slot.end_at, updated_at: new Date() } });
  const order = await db.orders.findUniqueOrThrow({ where: { id: a.order_id }, include: { users: true, orderpayments: { take: 1 } } });
  const m = await db.users.findUniqueOrThrow({ where: { id: a.user_id } });
  queueMail(requestAccepted(order.users, m, { id: order.id, paid: order.orderpayments.length > 0 }, slot), 20_000);
  refreshJob(assignId);
  return { ok: true, message: "You have successfully updated your visit schedule." };
}

// ---------------------------------------------------------------- work lines

/** AppController@addLabour: minutes × settings.labour_hour_limit (as the app computes it). */
export async function addLabour(assignId: number, description: string, minutes: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (description.trim().length < 1) return { ok: false, message: "Enter labour to proceed" };
  const s = await settings();
  const price = minutes * s.labourHourLimit;
  if (price < 1) return { ok: false, message: "Select labour hour or minutes to proceed" };
  await db.assignlabours.create({ data: { orderassign_id: a.id, description, labour: dec(price), created_at: new Date(), updated_at: new Date() } });
  await bump(a.id, price);
  refreshJob(assignId);
  return { ok: true, message: "Labour added." };
}

/** AppController@editLabour (added labour) / @addAssignLabour (booked service) */
export async function editLabour(assignId: number, kind: "labour" | "service", id: number, description: string, price: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (!description.trim() || !(price >= 0)) return { ok: false, message: "Enter a description and a price." };
  if (kind === "labour") {
    const l = await db.assignlabours.findFirst({ where: { id: BigInt(id), orderassign_id: a.id } });
    if (!l) return { ok: false, message: "Labour not found." };
    await bump(a.id, price - Number(l.labour));
    await db.assignlabours.update({ where: { id: l.id }, data: { description, labour: dec(price), updated_at: new Date() } });
  } else {
    const s = await db.assignservices.findFirst({ where: { id: BigInt(id), orderassign_id: a.id } });
    if (!s) return { ok: false, message: "Service not found." };
    await bump(a.id, price - Number(s.labour));
    await db.assignservices.update({ where: { id: s.id }, data: { name: description, labour: dec(price), updated_at: new Date() } });
  }
  refreshJob(assignId);
  return { ok: true, message: "Updated." };
}

/** AppController@deleteLabour / @deleteService (a removed service keeps its parts as loose parts). */
export async function deleteLabour(assignId: number, kind: "labour" | "service", id: number): Promise<Result> {
  const a = await ownAssign(assignId);
  const now = new Date();
  if (kind === "labour") {
    const l = await db.assignlabours.findFirst({ where: { id: BigInt(id), orderassign_id: a.id } });
    if (!l) return { ok: false, message: "Labour not found." };
    await bump(a.id, -Number(l.labour));
    await db.assignlabours.delete({ where: { id: l.id } });
  } else {
    const s = await db.assignservices.findFirst({ where: { id: BigInt(id), orderassign_id: a.id }, include: { assignserviceparts: true } });
    if (!s) return { ok: false, message: "Service not found." };
    await bump(a.id, -Number(s.labour));
    for (const p of s.assignserviceparts.filter((x) => x.name !== "MOT")) await db.assignparts.create({ data: { orderassign_id: a.id, description: p.name, price: p.price, created_at: now, updated_at: now } });
    await db.assignserviceparts.deleteMany({ where: { assignservice_id: s.id } });
    await db.assignservices.delete({ where: { id: s.id } });
  }
  refreshJob(assignId);
  return { ok: true, message: "Deleted." };
}

/** AppController@addPart */
export async function addPart(assignId: number, description: string, price: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (!description.trim() || !(price > 0)) return { ok: false, message: "Enter part name and price." };
  await db.assignparts.create({ data: { orderassign_id: a.id, description, price: dec(price), created_at: new Date(), updated_at: new Date() } });
  await bump(a.id, price);
  refreshJob(assignId);
  return { ok: true, message: "Part added." };
}

/** Edit a part (Laravel's editAssignPart was a stub that echoed the request; this one saves). */
export async function editPart(assignId: number, kind: "part" | "servicepart", id: number, description: string, price: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (!description.trim() || !(price >= 0)) return { ok: false, message: "Enter part name and price." };
  if (kind === "part") {
    const p = await db.assignparts.findFirst({ where: { id: BigInt(id), orderassign_id: a.id } });
    if (!p) return { ok: false, message: "Part not found." };
    await bump(a.id, price - Number(p.price));
    await db.assignparts.update({ where: { id: p.id }, data: { description, price: dec(price), updated_at: new Date() } });
  } else {
    const p = await db.assignserviceparts.findFirst({ where: { id: BigInt(id), assignservices: { orderassign_id: a.id } } });
    if (!p) return { ok: false, message: "Part not found." };
    await bump(a.id, price - Number(p.price));
    await db.assignserviceparts.update({ where: { id: p.id }, data: { name: description, price: dec(price), updated_at: new Date() } });
  }
  refreshJob(assignId);
  return { ok: true, message: "Part updated." };
}

/** AppController@deletePart (new_part yes → loose part, no → a booked service's part) */
export async function deletePart(assignId: number, kind: "part" | "servicepart", id: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (kind === "part") {
    const p = await db.assignparts.findFirst({ where: { id: BigInt(id), orderassign_id: a.id } });
    if (!p) return { ok: false, message: "Part not found." };
    await bump(a.id, -Number(p.price));
    await db.assignparts.delete({ where: { id: p.id } });
  } else {
    const p = await db.assignserviceparts.findFirst({ where: { id: BigInt(id), assignservices: { orderassign_id: a.id } } });
    if (!p) return { ok: false, message: "Part not found." };
    await bump(a.id, -Number(p.price));
    await db.assignserviceparts.delete({ where: { id: p.id } });
  }
  refreshJob(assignId);
  return { ok: true, message: "Part removed." };
}

/** AppController@addPhoto (photo of removed parts) / @deletePhoto */
export async function addPhoto(assignId: number, form: FormData): Promise<Result> {
  const a = await ownAssign(assignId);
  const f = form.get("image");
  if (!isFile(f) || !f.type.startsWith("image/")) return { ok: false, message: "Your file is not uploaded" };
  const path = await saveUpload(f, "ssc/mechanic/app", true);
  await db.assignfiles.create({ data: { orderassign_id: a.id, image: path, description: String(form.get("description") ?? ""), created_at: new Date(), updated_at: new Date() } });
  refreshJob(assignId);
  return { ok: true, message: "Your file is uploaded" };
}
export async function deletePhoto(assignId: number, photoId: number): Promise<Result> {
  const a = await ownAssign(assignId);
  await db.assignfiles.deleteMany({ where: { id: BigInt(photoId), orderassign_id: a.id } });
  refreshJob(assignId);
  return { ok: true, message: "Photo removed." };
}

/** AppController@addMileage */
export async function setMileage(assignId: number, mileage: number): Promise<Result> {
  const a = await ownAssign(assignId);
  if (!(mileage >= 1)) return { ok: false, message: "Mileage is not valid" };
  await db.orderassigns.update({ where: { id: a.id }, data: { mileage: dec(mileage), updated_at: new Date() } });
  refreshJob(assignId);
  return { ok: true, message: "Mileage saved." };
}

/** AppController@addFault / @deleteFault */
export async function addFault(assignId: number, f: { description: string; urgency: string; code: string; fixed: boolean }): Promise<Result> {
  const a = await ownAssign(assignId);
  if (f.description.trim().length < 5) return { ok: false, message: "Fault description is required with minimun 5 characters" };
  if (!["Critical", "High", "Medium", "Low"].includes(f.urgency)) return { ok: false, message: "Urgency level is not selected" };
  await db.assignfaults.create({ data: { orderassign_id: a.id, description: f.description, urgency: f.urgency, trouble_code: f.code || null, fixed: f.fixed, created_at: new Date(), updated_at: new Date() } });
  refreshJob(assignId);
  return { ok: true, message: "Fault recorded." };
}
export async function deleteFault(assignId: number, id: number): Promise<Result> {
  const a = await ownAssign(assignId);
  await db.assignfaults.deleteMany({ where: { id: BigInt(id), orderassign_id: a.id } });
  refreshJob(assignId);
  return { ok: true, message: "Fault removed." };
}

// ---------------------------------------------------------------- charge

/**
 * AppController@chargePayment — Stripe Connect direct charge on the mechanic's account:
 * clone the platform customer + saved card onto the connected account, confirm a PaymentIntent
 * with the platform commission as application fee, then complete the order.
 */
export async function chargeCustomer(assignId: number, reason?: string): Promise<Result> {
  const a = await ownAssign(assignId);
  if (a.status !== "assigned") return { ok: false, message: "This job has already been completed." };
  if (!(Number(a.mileage) >= 1)) return { ok: false, message: "Mileage is mandatory" };
  const now = new Date();
  if (reason && reason.trim().length >= 5) {
    const ex = await db.assignexcuses.findFirst({ where: { orderassign_id: a.id } });
    if (ex) await db.assignexcuses.update({ where: { id: ex.id }, data: { reason, updated_at: now } });
    else await db.assignexcuses.create({ data: { orderassign_id: a.id, user_id: a.user_id, reason, created_at: now, updated_at: now } });
  }
  const [keys, s, conn, order] = await Promise.all([
    db.stripes.findFirst(),
    settings(),
    db.userstripes.findFirst({ where: { user_id: a.user_id } }),
    db.orders.findUniqueOrThrow({ where: { id: a.order_id }, include: { users: true, orderpayments: { take: 1 }, ordertracks: { include: { services: { select: { name: true } } } } } }),
  ]);
  const me = await db.users.findUniqueOrThrow({ where: { id: a.user_id } });
  if (!conn?.stripe_user_id) return { ok: false, message: `${me.fname} ${me.lname} you have not authorize your stripe account with Smart Servicing Centre` };
  const intentRow = order.orderpayments[0];
  if (!intentRow) return { ok: false, message: "The customer has not authorised a card for this booking yet." };
  if (!keys?.secret_key) return { ok: false, message: "Stripe is not configured." };

  const price = Number(a.price ?? 0);
  const fee = commissionFor(price, s);
  const stripe = new Stripe(keys.secret_key);
  try {
    const account = { stripeAccount: conn.stripe_user_id };
    const customer = await stripe.customers.create({ description: `Order #${order.id}` }, account);
    const pm = await stripe.paymentMethods.create({ customer: intentRow.customer_id, payment_method: intentRow.payment_method }, account);
    await stripe.paymentIntents.create(
      { amount: Math.round(price * 100), currency: "gbp", payment_method_types: ["card"], payment_method: pm.id, customer: customer.id, confirm: true, application_fee_amount: Math.round(fee * 100) },
      account,
    );
  } catch (e) {
    console.error("[charge] declined", e);
    queueMail(cardDeclined({ name: `${order.users.fname} ${order.users.lname}`, email: order.users.email }, order.id, price, order.ordertracks.map((t) => t.services.name).join(", ")), 20_000);
    return { ok: false, message: "Payment is declined by client side." };
  }

  await db.$transaction([
    db.orders.update({ where: { id: order.id }, data: { status: "completed", price: dec(price), updated_at: now } }),
    db.orderassigns.update({ where: { id: a.id }, data: { status: "completed", updated_at: now } }),
    db.orderpayments.update({ where: { id: intentRow.id }, data: { total_payment: dec(price), mechanic_payment: dec(price - fee), platform_fee: dec(fee), status: "Success", updated_at: now } }),
  ]);
  const full = await db.orderassigns.findUniqueOrThrow({ where: { id: a.id }, include: { assignservices: { include: { assignserviceparts: true } }, assignlabours: true, assignparts: true, assignfaults: { select: { id: true } } } });
  const car = parseCar(order.car_data);
  queueMail(
    orderCompleted(order.users, me, {
      id: order.id,
      token: order.token,
      price,
      faults: full.assignfaults.length > 0,
      car: `${carTitle(car)} ${car.reg ?? ""}`,
      labours: [
        ...full.assignservices.map((x) => ({ name: x.name, price: Number(x.labour) - x.assignserviceparts.filter((p) => p.name !== "MOT").reduce((t, p) => t + Number(p.price), 0) })),
        ...full.assignlabours.map((l) => ({ name: l.description ?? "", price: Number(l.labour) })),
      ],
      parts: [...full.assignservices.flatMap((x) => x.assignserviceparts.filter((p) => p.name !== "MOT").map((p) => ({ name: p.name, price: Number(p.price) }))), ...full.assignparts.map((p) => ({ name: p.description ?? "", price: Number(p.price) }))],
    }),
    20_000,
  );
  refreshJob(assignId);
  return { ok: true, message: "You have successfully charge your customer" };
}

// ---------------------------------------------------------------- follow-on quote (orderquotes)

async function quoteFor(assignId: bigint) {
  return (await db.orderquotes.findFirst({ where: { orderassign_id: assignId } })) ?? (await db.orderquotes.create({ data: { orderassign_id: assignId, price: dec(0), status: "incomplete quote", created_at: new Date(), updated_at: new Date() } }));
}

/** AppController@furtherLabourAdd / @furtherPartAdd */
export async function addFollowOnLine(assignId: number, kind: "labour" | "part", name: string, price: number, hours = 0): Promise<Result> {
  const a = await ownAssign(assignId);
  if (!name.trim()) return { ok: false, message: kind === "labour" ? "Service Name should not be empty" : "Part Name should not be empty" };
  if (!(price >= 1)) return { ok: false, message: kind === "labour" ? "Select labour hour or minutes to proceed" : "Enter part price to proceed" };
  const q = await quoteFor(a.id);
  const now = new Date();
  if (kind === "labour") await db.orderquotelabours.create({ data: { orderquote_id: q.id, service_name: name, labour_hour: Math.round(hours), labour_price: dec(price), created_at: now, updated_at: now } });
  else await db.orderquoteparts.create({ data: { orderquote_id: q.id, part_name: name, part_price: dec(price), created_at: now, updated_at: now } });
  await db.orderquotes.update({ where: { id: q.id }, data: { price: dec(Number(q.price) + price), updated_at: now } });
  refreshJob(assignId);
  return { ok: true, message: "Added to the follow-on quote." };
}

/** AppController@furtherLabourDelete / @furtherPartDelete */
export async function deleteFollowOnLine(assignId: number, kind: "labour" | "part", id: number): Promise<Result> {
  const a = await ownAssign(assignId);
  const q = await db.orderquotes.findFirst({ where: { orderassign_id: a.id } });
  if (!q) return { ok: false, message: "No quote." };
  const price =
    kind === "labour"
      ? Number((await db.orderquotelabours.findFirst({ where: { id: BigInt(id), orderquote_id: q.id } }))?.labour_price ?? 0)
      : Number((await db.orderquoteparts.findFirst({ where: { id: BigInt(id), orderquote_id: q.id } }))?.part_price ?? 0);
  if (kind === "labour") await db.orderquotelabours.deleteMany({ where: { id: BigInt(id), orderquote_id: q.id } });
  else await db.orderquoteparts.deleteMany({ where: { id: BigInt(id), orderquote_id: q.id } });
  await db.orderquotes.update({ where: { id: q.id }, data: { price: dec(Number(q.price) - price), updated_at: new Date() } });
  refreshJob(assignId);
  return { ok: true, message: "Removed." };
}

/** AppController@submitQuote: send the follow-on quote to the customer (SendQuoteJob). */
export async function sendFollowOnQuote(assignId: number): Promise<Result> {
  const a = await ownAssign(assignId);
  const q = await db.orderquotes.findFirst({ where: { orderassign_id: a.id }, include: { orderquotelabours: true, orderquoteparts: true } });
  if (!q || q.orderquotelabours.length < 1) return { ok: false, message: "Add labour before sending a quote" };
  await db.orderquotes.update({ where: { id: q.id }, data: { status: "Quotation Sent", updated_at: new Date() } });
  const o = await db.orders.findUniqueOrThrow({ where: { id: a.order_id }, include: { users: true, postcodes: { include: { cities: true } } } });
  const m = await db.users.findUniqueOrThrow({ where: { id: a.user_id } });
  queueMail(
    followOnQuote(o.users, m, { id: q.id, price: Number(q.price), labours: q.orderquotelabours.map((l) => l.service_name), parts: q.orderquoteparts.map((p) => p.part_name) }, `${o.postcodes.cities?.name ?? ""}, ${o.postcodes.postcode}`, parseCar(o.car_data)),
    20_000,
  );
  refreshJob(assignId);
  return { ok: true, message: "Quote sent to the customer." };
}

/** AppController@deleteFollowOnQuote */
export async function deleteFollowOnQuote(assignId: number): Promise<Result> {
  const a = await ownAssign(assignId);
  const q = await db.orderquotes.findFirst({ where: { orderassign_id: a.id } });
  if (q) {
    await db.orderquotelabours.deleteMany({ where: { orderquote_id: q.id } });
    await db.orderquoteparts.deleteMany({ where: { orderquote_id: q.id } });
    await db.orderquotes.delete({ where: { id: q.id } });
  }
  refreshJob(assignId);
  return { ok: true, message: "Follow-on quote removed." };
}

// ---------------------------------------------------------------- repair quote requests (orderrequestquotes)

async function ownRequest(id: number) {
  const me = await mechanic();
  const r = await db.orderrequests.findFirst({ where: { id: BigInt(id), user_id: me } });
  if (!r) throw new Error("not your request");
  return r;
}

/** QuoteRequest@addLabour / @addPart */
export async function addQuoteRequestLine(requestId: number, kind: "labour" | "part", name: string, price: number): Promise<Result> {
  const r = await ownRequest(requestId);
  if (!name.trim()) return { ok: false, message: "The name field is required." };
  if (!(price >= 0)) return { ok: false, message: "Enter a valid price." };
  const now = new Date();
  const q = (await db.orderrequestquotes.findFirst({ where: { orderrequest_id: r.id } })) ?? (await db.orderrequestquotes.create({ data: { orderrequest_id: r.id, status: "NOT DELIVERED", price: dec(0), created_at: now, updated_at: now } }));
  if (kind === "labour") await db.orderrequestquotelabours.create({ data: { orderrequestquote_id: q.id, name, price: dec(price), created_at: now, updated_at: now } });
  else await db.orderrequestquoteparts.create({ data: { orderrequestquote_id: q.id, name, price: dec(price), created_at: now, updated_at: now } });
  await db.orderrequestquotes.update({ where: { id: q.id }, data: { price: dec(Number(q.price) + price), updated_at: now } });
  revalidatePath(`/mechanic/quote-requests/${requestId}`);
  return { ok: true, message: "Added." };
}

/** QuoteRequest@deleteLabour / @deletePart */
export async function deleteQuoteRequestLine(requestId: number, kind: "labour" | "part", id: number): Promise<Result> {
  const r = await ownRequest(requestId);
  const q = await db.orderrequestquotes.findFirst({ where: { orderrequest_id: r.id } });
  if (!q) return { ok: false, message: "No quote." };
  const row = kind === "labour" ? await db.orderrequestquotelabours.findFirst({ where: { id: BigInt(id), orderrequestquote_id: q.id } }) : await db.orderrequestquoteparts.findFirst({ where: { id: BigInt(id), orderrequestquote_id: q.id } });
  if (!row) return { ok: false, message: "Line not found." };
  if (kind === "labour") await db.orderrequestquotelabours.delete({ where: { id: row.id } });
  else await db.orderrequestquoteparts.delete({ where: { id: row.id } });
  await db.orderrequestquotes.update({ where: { id: q.id }, data: { price: dec(Number(q.price) - Number(row.price)), updated_at: new Date() } });
  revalidatePath(`/mechanic/quote-requests/${requestId}`);
  return { ok: true, message: "Removed." };
}

/** QuoteRequest@sendRequest: deliver the quote to the customer (SendQuoteRequestJob). */
export async function sendQuoteRequestQuote(requestId: number): Promise<Result> {
  const r = await ownRequest(requestId);
  const q = await db.orderrequestquotes.findFirst({ where: { orderrequest_id: r.id }, include: { _count: { select: { orderrequestquotelabours: true, orderrequestquoteparts: true } } } });
  if (!q || q._count.orderrequestquotelabours + q._count.orderrequestquoteparts === 0) return { ok: false, message: "We can't send empty quotation. Your quotation must have atleast one labour or one part." };
  await db.orderrequestquotes.update({ where: { id: q.id }, data: { status: "QUOTATION SENT", updated_at: new Date() } });
  const o = await db.orders.findUniqueOrThrow({ where: { id: r.order_id }, include: { users: true, postcodes: true } });
  const m = await db.users.findUniqueOrThrow({ where: { id: r.user_id } });
  const miles = distanceMiles(Number(m.lat ?? 0), Number(m.long ?? 0), Number(o.postcodes.lat), Number(o.postcodes.long));
  queueMail(newQuotation(o.users, m, { token: o.token, car: parseCar(o.car_data) }, Number(q.price), miles), 20_000);
  revalidatePath(`/mechanic/quote-requests/${requestId}`);
  return { ok: true, message: "Your quote has been sent to the customer." };
}

/** AppController@deleteQuote: remove a quote request from my list. */
export async function dismissQuoteRequest(requestId: number): Promise<Result> {
  const r = await ownRequest(requestId);
  await db.orderrequests.delete({ where: { id: r.id } });
  revalidatePath("/mechanic/quote-requests");
  return { ok: true, message: "Removed from your list." };
}

// ---------------------------------------------------------------- reviews

const responseSchema = z.string().trim().min(1, "Write a response.");

/** Mechanic\HomeController@respondReviewSave */
export async function respondToReview(reviewId: number, text: string): Promise<Result> {
  const me = await mechanic();
  const p = responseSchema.safeParse(text);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const r = await db.reviews.findFirst({ where: { id: BigInt(reviewId), user_id: me }, include: { orders: { include: { users: true } }, users: { select: { company: true, fname: true, lname: true } } } });
  if (!r) return { ok: false, message: "Review not found." };
  await db.reviews.update({ where: { id: r.id }, data: { response: p.data, updated_at: new Date() } });
  queueMail(reviewResponse(r.orders.users, r.users.company || `${r.users.fname} ${r.users.lname}`, { ...r, response: p.data }));
  return { ok: true, message: "We have notified your customer with your response." };
}
