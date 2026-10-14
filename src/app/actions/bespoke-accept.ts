"use server";
import { headers } from "next/headers";
import { findOrCreatePostcode } from "@/lib/booking/postcode";
import { storeCard } from "@/lib/booking/stripe";
import { customerFromBookingForm, randomToken } from "@/lib/customer";
import { db } from "@/lib/db";
import { queueMail } from "@/lib/mail/send";
import { quoteAcceptedMechanic, waitingForMechanic } from "@/lib/mail/templates";
import { slotStart, TIME_SLOTS } from "@/lib/time";

type R = { ok: boolean; message: string; link?: string };

/**
 * BespokeController@storeUser — the customer accepts a mechanic's bespoke estimate: sign in or register
 * (Laravel auto-logged-in whoever owned the email; here the password is required), then an order is
 * created with their availability and they continue to the card step.
 */
export async function acceptBespoke(token: string, form: FormData): Promise<R> {
  const b = await db.bespokes.findFirst({ where: { token } });
  if (!b) return { ok: false, message: "This estimate link is no longer valid.", link: "/" };
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!form.get("terms")) return { ok: false, message: "Please accept the terms and conditions." };
  if (!g("house_no") || !g("street") || !g("post_code")) return { ok: false, message: "House no, street and postcode are required." };
  let slots: { date: string; time: string }[] = [];
  try {
    slots = (JSON.parse(g("slots") || "[]") as { date: string; time: string }[]).filter((s) => TIME_SLOTS.includes(s.time) && (slotStart(s.date, s.time)?.getTime() ?? 0) > Date.now());
  } catch {}
  if (!slots.length) return { ok: false, message: "Please select at least one date and time slot." };
  const pc = await findOrCreatePostcode(g("post_code"));
  if (!pc.ok) return { ok: false, message: "Postcode does not exist" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const who = await customerFromBookingForm({ first_name: g("first_name"), last_name: g("last_name"), email: g("email"), password: String(form.get("password") ?? ""), phone: g("phone") }, ip);
  if (!who.ok) return who;
  let car: Record<string, string> = {};
  try {
    car = JSON.parse(b.car_data);
  } catch {}
  const make = car.make ? await db.makes.findFirst({ where: { name: car.make } }) : null;
  const now = new Date();
  const order = await db.$transaction(async (tx) => {
    await tx.users.update({ where: { id: who.user.id }, data: { house_no: g("house_no"), street: g("street"), ...(g("city") ? { city: g("city") } : {}), post_code: pc.postcode.postcode, updated_at: now } });
    const o = await tx.orders.create({
      data: {
        user_id: who.user.id,
        order_for: "repairs",
        postcode_id: pc.postcode.id,
        token: randomToken(100),
        status: "pending",
        notes: b.service,
        car_data: JSON.stringify({ make: car.make, model: car.model, fuel: car.fuel, engine: car.engine, year: car.year, logo: make?.icon ?? null, reg: car.reg }),
        created_at: now,
        updated_at: now,
      },
    });
    for (const s of slots) {
      const start = slotStart(s.date, s.time)!;
      await tx.timeslots.create({ data: { order_id: o.id, date: s.date, time: s.time, start_at: start, end_at: new Date(start.getTime() + 2 * 3600_000), created_at: now, updated_at: now } });
    }
    return o;
  });
  return { ok: true, message: "Details saved", link: `/user/bespoke/payment/${token}/order/${order.token}` };
}

/** PaymentController@stroreBespokePayment — card saved, the order goes to the mechanic who wrote the estimate. */
export async function saveBespokeCard(token: string, orderId: number, setupIntentId: string): Promise<R> {
  const r = await storeCard(BigInt(orderId), setupIntentId);
  if (!r.ok) return r;
  const b = await db.bespokes.findFirst({ where: { token }, include: { users: true, bespokelabours: true, bespokeparts: true } });
  const order = await db.orders.findUniqueOrThrow({ where: { id: r.order.id }, include: { orderassigns: { take: 1 } } });
  if (!b) return { ok: false, message: "This estimate link is no longer valid." };
  if (order.orderassigns.length) return { ok: true, message: "Your card is saved.", link: `/portal/orders/${order.id}` };
  const now = new Date();
  const assign = await db.$transaction(async (tx) => {
    await tx.orders.update({ where: { id: order.id }, data: { price: b.price, status: "assigned", updated_at: now } });
    const a = await tx.orderassigns.create({ data: { order_id: order.id, user_id: b.user_id, price: b.price, status: "assigned", created_at: now, updated_at: now } });
    for (const l of b.bespokelabours) await tx.assignlabours.create({ data: { orderassign_id: a.id, labour: l.price, description: l.name, created_at: now, updated_at: now } });
    for (const p of b.bespokeparts) await tx.assignparts.create({ data: { orderassign_id: a.id, price: p.price, description: p.name, created_at: now, updated_at: now } });
    // BespokeController@saveOrder rotated the token so the link can't book twice.
    await tx.bespokes.update({ where: { id: b.id }, data: { token: randomToken(80), status: "Accepted", updated_at: now } });
    return a;
  });
  queueMail(waitingForMechanic(r.me, b.users.company, b.users.phone), 20_000);
  queueMail(quoteAcceptedMechanic("estimate", b.users, assign, b.bespokelabours.map((l) => l.name)), 50_000);
  return { ok: true, message: "Thank you for your order, You will be charged by your mechanic after the work is complete.", link: `/services/${order.id}/status` };
}
