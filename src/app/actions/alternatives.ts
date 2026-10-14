"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { queueMail } from "@/lib/mail/send";
import { chooseSlots } from "@/lib/mail/templates";
import { assignOrder } from "@/lib/mechanic/assign";
import { getSession } from "@/lib/session";
import { slotStart } from "@/lib/time";

export type Result = { ok: boolean; message: string; link?: string };

/** Mechanic\HomeController@alternativeSlotsSave: propose other dates/times to the customer. */
export async function proposeAlternatives(requestId: number, slots: { date: string; time: string }[], agreed: boolean): Promise<Result> {
  const s = await getSession();
  if (!s || s.role !== "mechanic") redirect("/login");
  if (!agreed) return { ok: false, message: "Tick the checkbox to purpose alternative(s) to your customer" };
  const clean = slots.filter((x) => x.date && x.time);
  if (!clean.length) return { ok: false, message: "Add at least one date and time." };
  const req = await db.orderrequests.findFirst({ where: { id: BigInt(requestId), user_id: BigInt(s.id) }, include: { orders: { include: { users: true } } } });
  if (!req) return { ok: false, message: "Request not found." };
  // HelperClass::arrange_date_time_slots_in_array → [{date, times:[{time}]}]
  const grouped: { date: string; times: { time: string }[] }[] = [];
  for (const x of clean) {
    const label = new Date(x.date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "");
    let g = grouped.find((d) => d.date === label);
    if (!g) grouped.push((g = { date: label, times: [] }));
    if (!g.times.some((t) => t.time === x.time)) g.times.push({ time: x.time });
  }
  await db.orderrequests.update({ where: { id: req.id }, data: { slots: JSON.stringify(grouped), updated_at: new Date() } });
  queueMail(chooseSlots(req.orders.users, req.orders.id, req.orders.token, req.id));
  return { ok: true, message: "Purposed alternative(s) are sent to your customer, we will notify you once customer accept your alternatives.", link: "/mechanic/requests" };
}

/** User\HomeController@chooseAlternativesStore: the customer picks one of the mechanic's alternatives. */
export async function chooseAlternative(token: string, requestId: number, date: string, time: string): Promise<Result> {
  const order = await db.orders.findUnique({ where: { token } });
  const req = await db.orderrequests.findUnique({ where: { id: BigInt(requestId) }, include: { users: true } });
  if (!order || order.status !== "pending" || !req || req.order_id !== order.id) return { ok: false, message: "This booking can no longer be changed." };
  const start = slotStart(date, time);
  const now = new Date();
  const slot = await db.timeslots.create({ data: { order_id: order.id, date, time, start_at: start, end_at: start, created_at: now, updated_at: now } });
  const r = await assignOrder(order.id, req.user_id, slot, req.id);
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, message: `Thanks for your effort. ${req.users.company} will visit you on ${date} between ${time}` };
}
