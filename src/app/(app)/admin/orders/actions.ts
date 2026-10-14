"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adjustAssignPrice } from "@/lib/admin/orders";
import { db } from "@/lib/db";
import { parseCar } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { queueMail } from "@/lib/mail/send";
import { bookingCancelled, messageCenter, noMechanicForOrder, requestToMechanic } from "@/lib/mail/templates";

export type Result = { ok: boolean; message: string };
const path = (id: number | bigint) => `/admin/orders/view/${id}`;
const money = z.coerce.number().finite();

/** OrderController@rejectOrder + PortalController@cancelUnverifiedOrder. */
export async function cancelOrder(id: number, mode: "email" | "silent" | "no-mechanic"): Promise<Result> {
  await requireStaff();
  const order = await db.orders.findUnique({ where: { id: BigInt(id) }, include: { users: true, orderassigns: { take: 1, include: { users: true } } } });
  if (!order) return { ok: false, message: "Order not found." };
  const now = new Date();
  if (mode === "silent") {
    await db.orders.update({ where: { id: order.id }, data: { status: "rejected", updated_at: now } });
    revalidatePath(path(id));
    return { ok: true, message: "Order is cancelled successfully" };
  }
  const a = order.orderassigns[0];
  if (a) {
    queueMail(bookingCancelled(a.users, order.id, true));
    await db.orderassigns.delete({ where: { id: a.id } });
  }
  await db.orders.update({ where: { id: order.id }, data: { status: "rejected", updated_at: now } });
  if (mode === "no-mechanic") queueMail(noMechanicForOrder(order.users));
  else queueMail(bookingCancelled(order.users, order.id), 20_000);
  revalidatePath(path(id));
  return { ok: true, message: "order rejected successfully" };
}

/** OrderController@sscNotes */
export async function saveSscNotes(id: number, notes: string): Promise<Result> {
  await requireStaff();
  await db.orders.update({ where: { id: BigInt(id) }, data: { notes_by_ssc: notes, updated_at: new Date() } });
  revalidatePath(path(id));
  return { ok: true, message: "added successfully" };
}

/** OrderController@garageRequest: notify one mechanic about a pending order. */
export async function sendGarageRequest(id: number, mechanicId: number): Promise<Result> {
  await requireStaff();
  const order = await db.orders.findUnique({
    where: { id: BigInt(id) },
    include: { postcodes: true, adminquotes: { take: 1, include: { adminquotedetails: true } }, ordertracks: { include: { services: { include: { parts: true } } } } },
  });
  if (!order || order.status !== "pending") return { ok: false, message: "Requests can only be sent for pending orders." };
  const mechanic = await db.users.findUnique({ where: { id: BigInt(mechanicId) } });
  if (!mechanic) return { ok: false, message: "Mechanic not found." };
  const now = new Date();
  const existing = await db.orderrequests.findFirst({ where: { user_id: mechanic.id, order_id: order.id } });
  if (existing) await db.orderrequests.update({ where: { id: existing.id }, data: { status: "pending", updated_at: now } });
  else await db.orderrequests.create({ data: { order_id: order.id, user_id: mechanic.id, status: "pending", created_at: now, updated_at: now } });
  queueMail(
    requestToMechanic({
      mechanic,
      order: { id: order.id, token: order.token, price: Number(order.price ?? 0), order_for: order.order_for },
      car: parseCar(order.car_data),
      postcode: order.postcodes.postcode,
      services: order.ordertracks.map((t) => ({ name: t.services.name, parts: t.services.parts.filter((p) => p.name !== "MOT").map((p) => p.name) })),
      adminQuote: order.adminquotes[0]?.adminquotedetails.map((d) => d.name) ?? null,
    }),
  );
  revalidatePath(path(id));
  return { ok: true, message: "Request is sent successfully" };
}

const updateSchema = z.object({
  reg_no: z.string().trim().min(1, "Registration is required"),
  date: z.string().optional(),
  time_slot: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  information: z.string().optional(),
});

/** OrderController@update */
export async function updateOrder(id: number, _: Result | null, form: FormData): Promise<Result> {
  await requireStaff();
  const p = updateSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const order = await db.orders.findUnique({ where: { id: BigInt(id) }, include: { orderassigns: { take: 1 } } });
  if (!order) return { ok: false, message: "Order not found." };
  const now = new Date();
  const car = { ...parseCar(order.car_data), reg: p.data.reg_no };
  await db.orders.update({ where: { id: order.id }, data: { notes: p.data.information ?? null, car_data: JSON.stringify(car), updated_at: now } });
  // Laravel sets these but never saves them (save() is commented out); we persist them as intended.
  await db.users.update({ where: { id: order.user_id }, data: { street: p.data.street ?? null, city: p.data.city ?? null, county: p.data.county ?? null, updated_at: now } });
  const a = order.orderassigns[0];
  if (a) await db.orderassigns.update({ where: { id: a.id }, data: { time: p.data.time_slot || null, date: p.data.date || null, updated_at: now } });
  revalidatePath(path(id));
  return { ok: true, message: "Order updated." };
}

/** add/edit/delete Part & Labour (they adjust the assignment and order totals). */
export async function saveLine(kind: "part" | "labour", assignId: number, lineId: number | null, name: string, priceRaw: string): Promise<Result> {
  await requireStaff();
  const price = money.safeParse(priceRaw);
  if (!price.success || !name.trim()) return { ok: false, message: "Enter a name and a numeric price." };
  const now = new Date();
  let orderId: bigint;
  if (kind === "part") {
    if (lineId) {
      const old = await db.assignparts.findUnique({ where: { id: BigInt(lineId) } });
      if (!old) return { ok: false, message: "Part not found." };
      orderId = await adjustAssignPrice(old.orderassign_id, price.data - Number(old.price));
      await db.assignparts.update({ where: { id: old.id }, data: { description: name, price: new Prisma.Decimal(price.data), updated_at: now } });
    } else {
      await db.assignparts.create({ data: { orderassign_id: BigInt(assignId), description: name, price: new Prisma.Decimal(price.data), created_at: now, updated_at: now } });
      orderId = await adjustAssignPrice(BigInt(assignId), price.data);
    }
  } else {
    if (lineId) {
      const old = await db.assignlabours.findUnique({ where: { id: BigInt(lineId) } });
      if (!old) return { ok: false, message: "Labour not found." };
      orderId = await adjustAssignPrice(old.orderassign_id, price.data - Number(old.labour));
      await db.assignlabours.update({ where: { id: old.id }, data: { description: name, labour: new Prisma.Decimal(price.data), updated_at: now } });
    } else {
      await db.assignlabours.create({ data: { orderassign_id: BigInt(assignId), description: name, labour: new Prisma.Decimal(price.data), created_at: now, updated_at: now } });
      orderId = await adjustAssignPrice(BigInt(assignId), price.data);
    }
  }
  revalidatePath(path(orderId));
  return { ok: true, message: "Done Successfully" };
}

export async function deleteLine(kind: "part" | "labour", lineId: number): Promise<Result> {
  await requireStaff();
  if (kind === "part") {
    const p = await db.assignparts.findUnique({ where: { id: BigInt(lineId) } });
    if (!p) return { ok: false, message: "Part not found." };
    const orderId = await adjustAssignPrice(p.orderassign_id, -Number(p.price));
    await db.assignparts.delete({ where: { id: p.id } });
    revalidatePath(path(orderId));
    return { ok: true, message: "Part deleted successfully..!" };
  }
  const l = await db.assignlabours.findUnique({ where: { id: BigInt(lineId) } });
  if (!l) return { ok: false, message: "Labour not found." };
  const orderId = await adjustAssignPrice(l.orderassign_id, -Number(l.labour));
  await db.assignlabours.delete({ where: { id: l.id } });
  revalidatePath(path(orderId));
  return { ok: true, message: "Labour deleted successfully..!" };
}

/** OrderController@sendMessages: admin writes into the customer↔mechanic thread (admin = 1). */
export async function sendAdminOrderMessage(orderId: number, mechanicId: number, text: string): Promise<Result> {
  await requireStaff();
  const body = text.trim();
  if (!body) return { ok: false, message: "Write a message first." };
  const order = await db.orders.findUnique({ where: { id: BigInt(orderId) }, include: { users: true, orderassigns: { take: 1 } } });
  const mechanic = await db.users.findUnique({ where: { id: BigInt(mechanicId) } });
  if (!order || !mechanic) return { ok: false, message: "Order not found." };
  const now = new Date();
  await db.resolutions.create({ data: { order_id: order.id, sender_id: mechanic.id, receiver_id: order.user_id, admin: true, message: body, seen: 0, created_at: now, updated_at: now } });
  const link = order.orderassigns[0] ? `/app/resolution/chat/${order.token}` : `/app/resolution/question/${mechanic.id}/order/${order.token}/customer/${order.user_id}`;
  const from = " Smart Servicing Centre ";
  queueMail(messageCenter({ name: `${order.users.fname} ${order.users.lname}`, email: order.users.email }, order.id, from, link), 20_000);
  queueMail(messageCenter({ name: `${mechanic.fname} ${mechanic.lname}`, email: mechanic.email }, order.id, from, link), 20_000);
  revalidatePath(path(orderId));
  return { ok: true, message: "Sent" };
}
