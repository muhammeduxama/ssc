"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isFile, saveUpload, uploadProblem } from "@/lib/files";
import { requireStaff } from "@/lib/guard";
import { schedule } from "@/lib/jobs/queue";
import { queueMail, sendMail } from "@/lib/mail/send";
import { customerQuoteChat, quotationRequest, quoteReady } from "@/lib/mail/templates";

export type Result = { ok: boolean; message: string };
const path = (id: number | bigint) => `/admin/quotes/view/${id}`;

/** QuoteController@addLabourPart */
export async function addQuoteLine(orderId: number, type: "labour" | "part", name: string, priceRaw: string): Promise<Result> {
  await requireStaff();
  const price = z.coerce.number().finite().min(0).safeParse(priceRaw);
  if (!name.trim() || !price.success) return { ok: false, message: "Enter a name and a valid price." };
  const now = new Date();
  let q = await db.adminquotes.findFirst({ where: { order_id: BigInt(orderId) } });
  if (!q) q = await db.adminquotes.create({ data: { order_id: BigInt(orderId), price: new Prisma.Decimal(0), created_at: now, updated_at: now } });
  await db.adminquotedetails.create({ data: { adminquote_id: q.id, type, name: name.trim(), price: new Prisma.Decimal(price.data), created_at: now, updated_at: now } });
  await db.adminquotes.update({ where: { id: q.id }, data: { price: new Prisma.Decimal(Number(q.price ?? 0) + price.data), updated_at: now } });
  revalidatePath(path(orderId));
  return { ok: true, message: `${type} is successfully added` };
}

/** QuoteController@deleteLabourPart */
export async function deleteQuoteLine(orderId: number, lineId: number): Promise<Result> {
  await requireStaff();
  const line = await db.adminquotedetails.findUnique({ where: { id: BigInt(lineId) } });
  if (!line) return { ok: false, message: "Line not found." };
  const q = await db.adminquotes.findUnique({ where: { id: line.adminquote_id } });
  if (q) await db.adminquotes.update({ where: { id: q.id }, data: { price: new Prisma.Decimal(Number(q.price ?? 0) - Number(line.price)), updated_at: new Date() } });
  await db.adminquotedetails.delete({ where: { id: line.id } });
  revalidatePath(path(orderId));
  return { ok: true, message: `${line.type} is successfully deleted` };
}

/** QuoteController@sendQuote: mark sent, email customer, 24h reminder, learn prices into carprices. */
export async function sendAdminQuote(orderId: number, notes: string): Promise<Result> {
  await requireStaff();
  const q = await db.adminquotes.findFirst({ where: { order_id: BigInt(orderId) }, include: { adminquotedetails: true } });
  if (!q || q.adminquotedetails.length === 0) return { ok: false, message: "Add at least one labour or part line first." };
  const now = new Date();
  const updated = await db.adminquotes.update({ where: { id: q.id }, data: { notes, status: "Sent", updated_at: now }, include: { adminquotedetails: true } });
  const order = await db.orders.findUnique({ where: { id: BigInt(orderId) }, include: { users: true } });
  if (!order) return { ok: false, message: "Order not found." };
  await sendMail(quoteReady(order, updated));
  await schedule("adminQuoteReminder", { orderId }, 24 * 3600_000);
  for (const item of updated.adminquotedetails) {
    if (item.type === "labour") {
      const s = await db.services.findFirst({ where: { name: item.name } });
      if (s) await db.carprices.create({ data: { car: order.car_data ?? "", name: s.name, value: new Prisma.Decimal(Number(item.price) / 60), type: "labour", status: "pending", source: "Admin Quote", created_at: now, updated_at: now } });
    }
    if (item.type === "part") {
      const p = await db.parts.findFirst({ where: { name: item.name } });
      if (p) await db.carprices.create({ data: { car: order.car_data ?? "", name: p.name, value: item.price, type: "part", status: "pending", source: "Admin Quote", created_at: now, updated_at: now } });
    }
  }
  revalidatePath(path(orderId));
  return { ok: true, message: "Quotation is successfully sent to the customer" };
}

/** QuoteController@sendRequest: ask a mechanic for a quote. */
export async function sendQuoteRequest(orderId: number, mechanicId: number): Promise<Result> {
  await requireStaff();
  const order = await db.orders.findUnique({ where: { id: BigInt(orderId) }, include: { users: true, postcodes: true, ordertracks: { include: { services: true } } } });
  const mechanic = await db.users.findUnique({ where: { id: BigInt(mechanicId) } });
  if (!order || order.status !== "pending" || !mechanic) return { ok: false, message: "Requests can only be sent for pending quotes." };
  const now = new Date();
  const req = await db.orderrequests.findFirst({ where: { order_id: order.id, user_id: mechanic.id } });
  if (req) await db.orderrequests.update({ where: { id: req.id }, data: { status: "pending", updated_at: now } });
  else await db.orderrequests.create({ data: { order_id: order.id, user_id: mechanic.id, status: "pending", created_at: now, updated_at: now } });
  queueMail(quotationRequest({ ...order, postcode: order.postcodes.postcode, services: order.ordertracks.map((t) => t.services.name) }, mechanic));
  revalidatePath(path(orderId));
  return { ok: true, message: "Request sent." };
}

/** QuoteController@quoteChat: admin message to the customer (with optional file). */
export async function sendQuoteChat(orderId: number, form: FormData): Promise<Result> {
  await requireStaff();
  const text = String(form.get("message") ?? "").trim();
  const file = form.get("file");
  if (!text && !isFile(file)) return { ok: false, message: "Write a message or attach a file." };
  if (isFile(file) && uploadProblem(file)) return { ok: false, message: uploadProblem(file)! };
  const now = new Date();
  const stored = isFile(file) ? await saveUpload(file, "uploads/message", true) : null;
  await db.quotechats.create({ data: { order_id: BigInt(orderId), sender: "admin", message: text || null, file: stored, created_at: now, updated_at: now } });
  const order = await db.orders.findUnique({ where: { id: BigInt(orderId) }, include: { users: true } });
  if (order) queueMail(customerQuoteChat(order, text));
  revalidatePath(path(orderId));
  return { ok: true, message: "Message sent." };
}
