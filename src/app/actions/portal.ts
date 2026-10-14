"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCustomer, randomToken } from "@/lib/customer";
import { db } from "@/lib/db";
import { isFile, saveUpload, uploadProblem } from "@/lib/files";
import { schedule } from "@/lib/jobs/queue";
import { queueMail } from "@/lib/mail/send";
import { adminQuoteChat, messageCentreToAdmin, messageCenter, quoteAcceptedMechanic, reviewForMechanic } from "@/lib/mail/templates";
import { slotStart, TIME_SLOTS } from "@/lib/time";

import { MESSAGE_OPTIONS } from "@/lib/portal-options";
import { mechanicByRef } from "@/lib/magic";

type R = { ok: boolean; message: string; link?: string };
const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);

async function me() {
  const u = await currentCustomer();
  if (!u) redirect("/login");
  return u;
}
const ownOrder = async (userId: bigint, id: number) => db.orders.findFirst({ where: { id: BigInt(id), user_id: userId } });

/** PortalController@editProfile / @updatecustomer */
export async function updateProfile(form: FormData): Promise<R> {
  const u = await me();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!g("first_name") || !g("last_name")) return { ok: false, message: "First and last name are required." };
  const phone = g("phone").replace(/\s+/g, "");
  if (!/^\d{11}$/.test(phone)) return { ok: false, message: "The phone must be 11 digits." };
  await db.users.update({ where: { id: u.id }, data: { fname: g("first_name"), lname: g("last_name"), phone, updated_at: new Date() } });
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Your details are updated" };
}


/** PortalController@closeQuote — close a repair quote request with a reason. */
export async function closeQuote(orderId: number, subject: string, message: string): Promise<R> {
  const u = await me();
  if (!subject) return { ok: false, message: "Please select a reason." };
  if (subject === "Other (Please give details below)" && !message.trim()) return { ok: false, message: "Please give details." };
  const quote = await db.orders.findFirst({ where: { id: BigInt(orderId), user_id: u.id, order_for: "repairs" }, include: { orderrequests: { include: { orderrequestquotes: true } } } });
  if (!quote) return { ok: false, message: "Quote does not exist" };
  const now = new Date();
  const m = await db.ordermessages.findFirst({ where: { order_id: quote.id } });
  if (m) await db.ordermessages.update({ where: { id: m.id }, data: { subject, message, updated_at: now } });
  else await db.ordermessages.create({ data: { order_id: quote.id, subject, message, created_at: now, updated_at: now } });
  for (const r of quote.orderrequests) {
    for (const q of r.orderrequestquotes) if (q.status === "NOT DELIVERED") await db.orderrequestquotes.update({ where: { id: q.id }, data: { status: "CLOSED", updated_at: now } });
    await db.orderrequests.update({ where: { id: r.id }, data: { status: "CLOSED", updated_at: now } });
  }
  await db.orders.update({ where: { id: quote.id }, data: { status: "rejected", updated_at: now } });
  revalidatePath("/portal/quotes");
  return { ok: true, message: "Your quote is closed" };
}


/** PortalController@storeMessage — the "Actions" message centre. */
export async function sendOrderMessage(orderId: number, option: number, form: FormData): Promise<R> {
  const u = await me();
  const order = await db.orders.findFirst({ where: { id: BigInt(orderId), user_id: u.id }, include: { orderassigns: { take: 1, include: { users: true } } } });
  if (!order) return { ok: false, message: "Booking not found." };
  const subject = MESSAGE_OPTIONS[option];
  const message = String(form.get("message") ?? "").trim();
  if (!subject || !message) return { ok: false, message: "Please write your message." };
  let optionOne: string | null = null;
  let optionTwo: string | null = null;
  if (option === 2 && !order.orderassigns.length) {
    optionOne = String(form.get("cancel_reason") ?? "");
    if (!optionOne) return { ok: false, message: "Please select your cancellation reason." };
    if (optionOne === "Other") {
      optionTwo = String(form.get("other_reason") ?? "").trim();
      if (!optionTwo) return { ok: false, message: "Please give your reason." };
    }
  }
  const now = new Date();
  const existing = await db.ordermessages.findFirst({ where: { order_id: order.id } });
  const data = { subject, option_one: optionOne, option_two: optionTwo, message, updated_at: now };
  if (existing) await db.ordermessages.update({ where: { id: existing.id }, data });
  else await db.ordermessages.create({ data: { ...data, order_id: order.id, created_at: now } });
  queueMail(messageCentreToAdmin(subject, message), 20_000);
  const a = order.orderassigns[0];
  if (a) {
    await db.resolutions.createMany({
      data: [
        { order_id: order.id, sender_id: u.id, receiver_id: a.user_id, message: subject, created_at: now, updated_at: now },
        { order_id: order.id, sender_id: u.id, receiver_id: a.user_id, message, created_at: now, updated_at: now },
      ],
    });
    queueMail(messageCenter({ name: `${a.users.fname} ${a.users.lname}`, email: a.users.email }, order.id, ` your customer (${u.fname} ${u.lname})`, `/app/resolution/chat/${order.token}`));
    return { ok: true, message: "Message sent successfully, You will receive an email when there is an update.", link: `/messages?thread=${order.id}:p:${a.user_id}` };
  }
  return { ok: true, message: "Message sent successfully, You will receive an email when there is an update", link: "/portal/orders" };
}

/** PortalController@cancelUnverifiedOrder — only the owner, only while no card has been added. */
export async function cancelUnverifiedOrder(orderId: number): Promise<R> {
  const u = await me();
  const o = await db.orders.findFirst({ where: { id: BigInt(orderId), user_id: u.id }, include: { orderpayments: { take: 1 }, orderassigns: { take: 1 } } });
  if (!o) return { ok: false, message: "Booking not found." };
  if (o.orderpayments.length || o.orderassigns.length || o.status !== "pending") return { ok: false, message: "This booking can't be cancelled here. Please use Actions → I want to cancel." };
  await db.orders.update({ where: { id: o.id }, data: { status: "rejected", updated_at: new Date() } });
  revalidatePath("/portal/orders");
  return { ok: true, message: "Order is cancelled successfully" };
}

/** PortalController@askQuestion — question to a mechanic about their repair quote. */
export async function askQuestion(requestId: number, message: string): Promise<R> {
  const u = await me();
  if (!message.trim()) return { ok: false, message: "Please write your question." };
  const r = await db.orderrequests.findFirst({ where: { id: BigInt(requestId), orders: { user_id: u.id } }, include: { users: true, orders: true } });
  if (!r) return { ok: false, message: "Quote not found." };
  const now = new Date();
  await db.resolutions.create({ data: { order_id: r.order_id, sender_id: u.id, receiver_id: r.user_id, message: message.trim(), created_at: now, updated_at: now } });
  queueMail(messageCenter({ name: `${r.users.fname} ${r.users.lname}`, email: r.users.email }, r.order_id, `your customer ${u.fname} ${u.lname}`, `/app/resolution/question/${r.users.id}/order/${r.orders.token}/customer/${u.id}`));
  return { ok: true, message: "Message sent successfully, You will receive an email when there is an update", link: `/messages?thread=${r.order_id}:p:${r.user_id}` };
}

async function ownFollowOn(userId: bigint, quoteId: number) {
  return db.orderquotes.findFirst({
    where: { id: BigInt(quoteId), orderassigns: { orders: { user_id: userId } } },
    include: { orderquotelabours: true, orderquoteparts: true, orderassigns: { include: { users: true, orders: { include: { ordertracks: true, orderpayments: { take: 1 } } } } } },
  });
}

/** PortalController@acceptQuote — a follow-on quote becomes a new order assigned to the same mechanic. */
export async function acceptFollowOn(quoteId: number): Promise<R> {
  const u = await me();
  const q = await ownFollowOn(u.id, quoteId);
  if (!q) return { ok: false, message: "Quote not found." };
  if (q.status === "Quotation Accepted") return { ok: false, message: "You have already accepted this quote." };
  const p = q.orderassigns.orders;
  const now = new Date();
  const { order, assign } = await db.$transaction(async (tx) => {
    const order = await tx.orders.create({
      data: {
        user_id: p.user_id,
        postcode_id: p.postcode_id,
        car_data: p.car_data,
        order_for: p.order_for,
        drive_able: p.drive_able,
        car_drop_off: p.car_drop_off,
        free_collection_delivery: p.free_collection_delivery,
        five_mile_drop: p.five_mile_drop,
        token: randomToken(80),
        price: q.price,
        status: "assigned",
        created_at: now,
        updated_at: now,
      },
    });
    for (const t of p.ordertracks) await tx.ordertracks.create({ data: { order_id: order.id, service_id: t.service_id, price: dec(0), created_at: now, updated_at: now } });
    const assign = await tx.orderassigns.create({ data: { order_id: order.id, user_id: q.orderassigns.user_id, price: q.price, status: "assigned", created_at: now, updated_at: now } });
    for (const l of q.orderquotelabours) await tx.assignlabours.create({ data: { orderassign_id: assign.id, labour: l.labour_price, description: l.service_name, created_at: now, updated_at: now } });
    for (const pt of q.orderquoteparts) await tx.assignparts.create({ data: { orderassign_id: assign.id, price: pt.part_price, description: pt.part_name, created_at: now, updated_at: now } });
    const pay = p.orderpayments[0];
    if (pay) await tx.orderpayments.create({ data: { order_id: order.id, customer_id: pay.customer_id, intent_id: pay.intent_id, payment_method: pay.payment_method, client_secret: pay.client_secret, setup_intent: pay.setup_intent, created_at: now, updated_at: now } });
    await tx.orderquotes.update({ where: { id: q.id }, data: { status: "Quotation Accepted", updated_at: now } });
    return { order, assign };
  });
  // FinalizeOrderJob hourly for 24h when there is no card on file.
  if (!p.orderpayments.length) await schedule("finalizeOrder", { orderId: String(order.id), until: Date.now() + 24 * 3600_000 }, 2 * 3600_000);
  queueMail(quoteAcceptedMechanic("follow-on", q.orderassigns.users, assign, q.orderquotelabours.map((l) => l.service_name)));
  revalidatePath("/portal/quotes/expired");
  return { ok: true, message: "Quote accepted. Your mechanic will set the date and time of the visit.", link: p.orderpayments.length ? "/portal/orders" : `/get-payment-info/${order.id}` };
}

/** PortalController@rejectQuote */
export async function rejectFollowOn(quoteId: number): Promise<R> {
  const u = await me();
  const q = await ownFollowOn(u.id, quoteId);
  if (!q) return { ok: false, message: "Quote not found." };
  await db.orderquotes.delete({ where: { id: q.id } });
  revalidatePath("/portal/quotes/expired");
  return { ok: true, message: "Quote rejected", link: "/portal/quotes/expired" };
}

/** PortalController@quoteChat — customer ↔ SSC chat on a quote (quotechats). */
export async function sendQuoteChat(orderId: number, form: FormData): Promise<R> {
  const u = await me();
  const o = await ownOrder(u.id, orderId);
  if (!o) return { ok: false, message: "Quote not found." };
  const message = String(form.get("message") ?? "").trim();
  const file = form.get("file");
  if (!message && !isFile(file)) return { ok: false, message: "Write a message or attach a file." };
  if (isFile(file) && uploadProblem(file)) return { ok: false, message: uploadProblem(file)! };
  const now = new Date();
  const path = isFile(file) ? await saveUpload(file, "uploads/message", true) : null;
  await db.quotechats.create({ data: { sender: "customer", order_id: o.id, message: message || null, file: path, created_at: now, updated_at: now } });
  queueMail(adminQuoteChat(u, o.id, message || null));
  revalidatePath(`/portal/quotes/${orderId}/chat`);
  return { ok: true, message: "Message sent" };
}

const STARS = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/** PortalController@storeReview — with the checks Laravel skipped (completed, assigned to this mechanic). */
export async function storeReview(orderToken: string, apiToken: string, form: FormData): Promise<R> {
  const [quality, punctuality, communication, overall] = ["work_quality", "punctuality", "communication", "overall"].map((k) => STARS(form.get(k)));
  if (!quality || !punctuality || !communication || !overall) return { ok: false, message: "Please rate every category." };
  const [mechanic, order] = await Promise.all([
    mechanicByRef(apiToken),
    db.orders.findFirst({ where: { token: orderToken }, include: { orderassigns: { take: 1 }, postcodes: { include: { cities: true } } } }),
  ]);
  if (!mechanic || !order || order.status !== "completed" || order.orderassigns[0]?.user_id !== mechanic.id) return { ok: false, message: "This review link is not valid.", link: "/" };
  const now = new Date();
  const data = { quality, punctuality, communication, overall, review: String(form.get("review") ?? "").trim() || null, city: order.postcodes.cities.name, updated_at: now };
  const existing = await db.reviews.findFirst({ where: { order_id: order.id, user_id: mechanic.id } });
  const review = existing ? await db.reviews.update({ where: { id: existing.id }, data }) : await db.reviews.create({ data: { ...data, user_id: mechanic.id, order_id: order.id, created_at: now } });
  queueMail(reviewForMechanic({ company: mechanic.company ?? `${mechanic.fname} ${mechanic.lname}`, email: mechanic.email }, { order_id: Number(order.id), quality, punctuality, communication, review: review.review ?? "", token: order.token }));
  return { ok: true, message: "Thank you for your review!", link: "/dashboard" };
}

/** QuoteController@addOrder — book the SSC (admin) quote: address, slots, questions → card. */
export async function bookAdminQuote(orderId: number, form: FormData): Promise<R> {
  const u = await me();
  const order = await db.orders.findFirst({ where: { id: BigInt(orderId), user_id: u.id }, include: { adminquotes: { take: 1 } } });
  const aq = order?.adminquotes[0];
  if (!order || !aq) return { ok: false, message: "Quote not found." };
  return saveScheduleAndAddress(order.id, form, { price: Number(aq.price ?? 0) }, `/get-payment-info/${order.id}`);
}

/** OrderController@updateSchedule — slots + collection answers before booking a mechanic's repair quote. */
export async function scheduleMechanicQuote(orderId: number, back: string, form: FormData): Promise<R> {
  const u = await me();
  const order = await ownOrder(u.id, orderId);
  if (!order) return { ok: false, message: "Quote not found." };
  return saveScheduleAndAddress(order.id, form, {}, back);
}

async function saveScheduleAndAddress(orderId: bigint, form: FormData, extra: { price?: number }, link: string): Promise<R> {
  const u = await me();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  for (const [k, msg] of [
    ["rd_safe_drive", "Select option, either your vehicle is drive able?"],
    ["rd_mobile_mech", "Select option about garage free collection & delivery service"],
    ["drop_off_location", "Select option drop off the vehicle at a vetted garage within 5 miles"],
  ]) if (!form.get(k)) return { ok: false, message: msg };
  if (!form.get("terms")) return { ok: false, message: "Please accept the terms and conditions." };
  if (form.has("house_no") && (!g("house_no") || !g("street") || !g("city"))) return { ok: false, message: "House no, street and city are required." };
  let slots: { date: string; time: string }[] = [];
  try {
    slots = (JSON.parse(g("slots") || "[]") as { date: string; time: string }[]).filter((s) => TIME_SLOTS.includes(s.time) && (slotStart(s.date, s.time)?.getTime() ?? 0) > Date.now());
  } catch {}
  if (!slots.length) return { ok: false, message: "Please select at least one date and time slot." };
  const now = new Date();
  await db.$transaction(async (tx) => {
    if (form.has("house_no")) await tx.users.update({ where: { id: u.id }, data: { house_no: g("house_no"), street: g("street"), city: g("city"), updated_at: now } });
    await tx.orders.update({
      where: { id: orderId },
      data: {
        ...(extra.price != null ? { price: dec(extra.price) } : {}),
        drive_able: g("rd_safe_drive") === "Yes",
        free_collection_delivery: g("rd_mobile_mech") === "Yes",
        five_mile_drop: g("drop_off_location") === "Yes",
        ...(g("notes") ? { notes: g("notes") } : {}),
        updated_at: now,
      },
    });
    await tx.timeslots.deleteMany({ where: { order_id: orderId } });
    for (const s of slots) {
      const start = slotStart(s.date, s.time)!;
      await tx.timeslots.create({ data: { order_id: orderId, date: s.date, time: s.time, start_at: start, end_at: new Date(start.getTime() + 2 * 3600_000), created_at: now, updated_at: now } });
    }
  });
  return { ok: true, message: "Saved", link };
}

export async function closeQuoteForm(orderId: number, form: FormData): Promise<R> {
  const r = await closeQuote(orderId, String(form.get("subject") ?? ""), String(form.get("message") ?? ""));
  return r.ok ? { ...r, link: "/portal/quotes?closed=1" } : r;
}

/** PaymentController@saveCardForLaterUseQuote — card saved, order goes to the mechanic whose repair quote was chosen. */
export async function saveQuoteCard(orderId: number, requestId: number, setupIntentId: string): Promise<R> {
  const { storeCard } = await import("@/lib/booking/stripe");
  const r = await storeCard(BigInt(orderId), setupIntentId);
  if (!r.ok) return r;
  const req = await db.orderrequests.findFirst({
    where: { id: BigInt(requestId), order_id: r.order.id },
    include: { users: true, orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } } },
  });
  const q = req?.orderrequestquotes[0];
  const order = await db.orders.findUniqueOrThrow({ where: { id: r.order.id }, include: { orderassigns: { take: 1 }, ordertracks: { include: { services: { select: { name: true } } } } } });
  if (!req || !q) return { ok: false, message: "This quote is no longer available." };
  if (order.orderassigns.length) return { ok: true, message: "Your card is saved.", link: `/portal/orders/${order.id}` };
  const now = new Date();
  const assign = await db.$transaction(async (tx) => {
    await tx.orders.update({ where: { id: order.id }, data: { price: q.price, status: "assigned", order_for: "inspection and mot", updated_at: now } });
    const a = await tx.orderassigns.create({ data: { order_id: order.id, user_id: req.user_id, price: q.price, status: "assigned", created_at: now, updated_at: now } });
    for (const l of q.orderrequestquotelabours) await tx.assignlabours.create({ data: { orderassign_id: a.id, labour: l.price, description: l.name, created_at: now, updated_at: now } });
    for (const p of q.orderrequestquoteparts) await tx.assignparts.create({ data: { orderassign_id: a.id, price: p.price, description: p.name, created_at: now, updated_at: now } });
    return a;
  });
  const { waitingForMechanic } = await import("@/lib/mail/templates");
  queueMail(quoteAcceptedMechanic("quote", req.users, assign, [...order.ordertracks.map((t) => t.services.name), ...q.orderrequestquotelabours.map((l) => l.name)]), 15_000);
  queueMail(waitingForMechanic(r.me, req.users.company, req.users.phone), 20_000);
  return { ok: true, message: "Thank you for your order, You will be charged by your mechanic after the work is complete.", link: `/services/${order.id}/status` };
}
