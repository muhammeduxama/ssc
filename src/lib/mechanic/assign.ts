import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { schedule } from "@/lib/jobs/queue";
import { queueMail } from "@/lib/mail/send";
import { orderAcceptedByYou, requestAccepted } from "@/lib/mail/templates";

const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);
type Slot = { date: string; time: string; start_at: Date | null; end_at: Date | null };

/**
 * Give an order to a mechanic at a slot — shared by AppController@orderAccept and
 * HomeController@chooseAlternativesStore: assignment row, labour/parts from the admin quote or
 * the booking cart, emails, the hourly "add your card" reminder and the day-before reminder.
 */
export async function assignOrder(orderId: bigint, me: bigint, slot: Slot, requestId: bigint) {
  const order = await db.orders.findUnique({ where: { id: orderId }, include: { users: true, orderassigns: { take: 1 }, orderpayments: { take: 1 }, adminquotes: { take: 1, include: { adminquotedetails: true } }, cartdatas: { take: 1 } } });
  if (!order) return { ok: false as const, message: "Order not found." };
  if (order.status === "rejected") return { ok: false as const, message: "Sorry, this booking has been cancelled by the customer" };
  if (order.orderassigns[0]) return { ok: false as const, message: "Sorry, this booking is taken by another mechanic" };

  const now = new Date();
  const assign = await db.$transaction(async (tx) => {
    await tx.orders.update({ where: { id: order.id }, data: { status: "assigned", updated_at: now } });
    const a = await tx.orderassigns.create({ data: { order_id: order.id, user_id: me, status: "assigned", time: slot.time, date: slot.date, start_at: slot.start_at, end_at: slot.end_at, price: order.price ?? dec(0), created_at: now, updated_at: now } });
    const aq = order.adminquotes[0];
    if (aq) {
      for (const d of aq.adminquotedetails) {
        if (d.type === "labour") await tx.assignlabours.create({ data: { orderassign_id: a.id, description: d.name, labour: d.price, created_at: now, updated_at: now } });
        else await tx.assignparts.create({ data: { orderassign_id: a.id, description: d.name, price: d.price, created_at: now, updated_at: now } });
      }
    } else {
      // HelperClass::saveOrderData — turn the booking cart into labour + parts lines.
      const cart = order.cartdatas[0];
      try {
        const items = cart?.data ? (JSON.parse(cart.data).items ?? {}) : {};
        for (const item of Object.values(items) as { item: { name: string; price: number | string; included_parts?: { name: string; price: number | string }[] } }[]) {
          let parts = 0;
          for (const p of item.item.included_parts ?? []) {
            await tx.assignparts.create({ data: { orderassign_id: a.id, description: p.name, price: dec(Number(p.price)), created_at: now, updated_at: now } });
            parts += Number(p.price);
          }
          await tx.assignlabours.create({ data: { orderassign_id: a.id, description: item.item.name, labour: dec(Number(item.item.price) - parts), created_at: now, updated_at: now } });
        }
      } catch (e) {
        console.error("[accept] could not read cart data", e);
      }
    }
    await tx.orderrequests.update({ where: { id: requestId }, data: { status: "assigned", updated_at: now } });
    return a;
  });

  const m = await db.users.findUniqueOrThrow({ where: { id: me } });
  queueMail(requestAccepted(order.users, m, { id: order.id, paid: order.orderpayments.length > 0 }, slot), 20_000);
  queueMail(orderAcceptedByYou({ name: `${order.users.fname} ${order.users.lname}`, email: order.users.email }, order.id, slot.date, slot.time), 20_000);
  if (slot.start_at) {
    // FinalizeOrderJob: hourly "please add your card" until the visit (one self-rescheduling job).
    if (!order.orderpayments.length) await schedule("finalizeOrder", { orderId: String(order.id), until: slot.start_at.getTime() }, 2 * 3600_000);
    // OrderReminderJob: the day before the visit.
    const days = Math.floor((slot.start_at.getTime() - Date.now()) / 864e5);
    if (days > 1) await schedule("orderReminder", { orderId: String(order.id), assignId: String(assign.id) }, (days - 1) * 864e5);
  }
  return { ok: true as const, assign };
}
