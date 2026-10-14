import "server-only";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail/send";
import { adminQuoteReminder, finalizeOrder, orderReminder } from "@/lib/mail/templates";
import { schedule } from "./queue";
import type { Job } from "./queue";

type Handler = (payload: Record<string, unknown>) => Promise<void>;

export const HANDLERS: Record<string, Handler> = {
  /** Jobs\AdminQuoteReminderJob: remind the customer if the sent quote is still pending. */
  async adminQuoteReminder(p) {
    const order = await db.orders.findUnique({
      where: { id: BigInt(String(p.orderId)) },
      include: { users: true, adminquotes: { take: 1, include: { adminquotedetails: true } } },
    });
    const q = order?.adminquotes[0];
    if (!order || order.status !== "pending" || !q || q.status !== "Sent") return;
    await sendMail(adminQuoteReminder(order, q));
  },
};

/** Jobs\User\FinalizeOrderJob: hourly until the visit, while the customer hasn't added a card. */
HANDLERS.finalizeOrder = async (p) => {
  const until = Number(p.until);
  if (Date.now() >= until) return;
  const o = await db.orders.findUnique({
    where: { id: BigInt(String(p.orderId)) },
    include: { users: true, orderpayments: { take: 1 }, orderassigns: { take: 1 }, ordertracks: { include: { services: { select: { name: true } } } } },
  });
  if (!o || o.orderpayments.length || !o.orderassigns[0] || o.status !== "assigned") return;
  await sendMail(finalizeOrder(o.users, o.orderassigns[0].user_id, { id: o.id, price: Number(o.price ?? 0), items: o.ordertracks.map((t) => ({ name: t.services.name, price: Number(t.price) })) }));
  await schedule("finalizeOrder", p, 3600_000);
};

/** Jobs\Mechanic\OrderReminderJob: the day before the visit. */
HANDLERS.orderReminder = async (p) => {
  const a = await db.orderassigns.findUnique({ where: { id: BigInt(String(p.assignId)) }, include: { users: true } });
  if (!a || a.status !== "assigned") return;
  await sendMail(orderReminder({ name: `${a.users.fname} ${a.users.lname}`, email: a.users.email }, a.order_id, a.id));
};

export async function runJob(j: Job) {
  const h = HANDLERS[j.name];
  if (!h) return console.warn(`[jobs] no handler for ${j.name}`);
  try {
    await h(j.payload);
  } catch (e) {
    console.error(`[jobs] ${j.name} failed`, e);
  }
}

/** Jobs\User\InformMechanicAboutOrder: re-sent at +20s, +1h, +3h while the order is still unassigned. */
HANDLERS.informMechanic = async (p) => {
  const { requestToMechanic } = await import("@/lib/mail/templates");
  const { parseCar } = await import("@/lib/format");
  const order = await db.orders.findUnique({
    where: { id: BigInt(String(p.orderId)) },
    include: { postcodes: true, orderassigns: { take: 1 }, adminquotes: { take: 1, include: { adminquotedetails: true } }, ordertracks: { include: { services: { include: { parts: true } } } } },
  });
  const mechanic = await db.users.findUnique({ where: { id: BigInt(String(p.mechanicId)) } });
  if (!order || !mechanic || order.orderassigns.length || order.status !== "pending") return;
  await sendMail(
    requestToMechanic({
      mechanic,
      order: { id: order.id, token: order.token, price: Number(order.price ?? 0), order_for: order.order_for },
      car: parseCar(order.car_data),
      postcode: order.postcodes.postcode,
      services: order.ordertracks.map((t) => ({ name: t.services.name, parts: t.services.parts.filter((x) => x.name !== "MOT").map((x) => x.name) })),
      adminQuote: order.adminquotes[0]?.adminquotedetails.map((d) => d.name) ?? null,
    }),
  );
};
