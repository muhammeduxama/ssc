"use server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseCar } from "@/lib/format";
import { queueMail } from "@/lib/mail/send";
import { bespokeEstimate } from "@/lib/mail/templates";
import { getSession } from "@/lib/session";
import { findOrCreateCar, lookupRegistration, rememberReg } from "@/lib/vehicle";

export type Result = { ok: boolean; message: string; link?: string; needsManual?: boolean };
const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);

async function me() {
  const s = await getSession();
  if (!s || s.role !== "mechanic") redirect("/login");
  return BigInt(s.id);
}
async function own(id: number) {
  const m = await me();
  const b = await db.bespokes.findFirst({ where: { id: BigInt(id), user_id: m } });
  if (!b) throw new Error("not found");
  return b;
}

const schema = z.object({
  email: z.string().trim().email("Enter the customer’s email address"),
  registration: z.string().trim().min(1, "Enter the vehicle registration"),
  name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  service: z.string().trim().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  fuel: z.string().optional(),
  engine: z.string().optional(),
  year: z.string().optional(),
});

/** BespokeController@store (+ @addVehicle when the registration lookup fails) */
export async function createBespoke(_: Result | null, form: FormData): Promise<Result> {
  const mechanicId = await me();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  const reg = d.registration.replace(/\s+/g, "").toUpperCase();
  let car: { make: string; model: string; fuel: string; engine: string; year: string } | null = null;

  if (d.make && d.model && d.fuel && d.engine && d.year) {
    const [mk, md, fu, en] = await Promise.all([
      db.makes.findUnique({ where: { id: BigInt(d.make) } }),
      db.modals.findUnique({ where: { id: BigInt(d.model) } }),
      db.fuels.findUnique({ where: { id: BigInt(d.fuel) } }),
      db.engines.findUnique({ where: { id: BigInt(d.engine) } }),
    ]);
    if (!mk || !md || !fu || !en) return { ok: false, message: "Please select valid vehicle", needsManual: true };
    const row = await findOrCreateCar({ make: mk.name, model: md.name, fuel: fu.fuel, engine: Number(en.name).toFixed(1), year: d.year }, "Bespoke");
    await rememberReg(row.id, reg);
    car = row;
  } else {
    const r = await lookupRegistration(reg);
    if (!r.ok) return { ok: false, message: "Registration number is invalid — select the vehicle manually.", needsManual: true };
    car = r.car;
  }

  const now = new Date();
  const b = await db.bespokes.create({
    data: {
      user_id: mechanicId,
      postcode: d.postcode || null,
      car_data: JSON.stringify({ make: car.make, model: car.model, fuel: car.fuel, engine: car.engine, year: car.year, reg }),
      status: "created",
      price: dec(0),
      service: d.service || null,
      token: randomBytes(40).toString("hex"),
      created_at: now,
      updated_at: now,
    },
  });
  await db.bespokeusers.create({ data: { bespoke_id: b.id, fname: d.name || null, lname: d.last_name || null, email: d.email, phone: d.phone || null, created_at: now, updated_at: now } });
  revalidatePath("/mechanic/bespokes");
  return { ok: true, message: "Estimate created — add labour and parts.", link: `/mechanic/bespokes/${b.id}` };
}

/** BespokeController@labourAdd / @partAdd */
export async function addBespokeLine(id: number, kind: "labour" | "part", name: string, price: number, hour = "0"): Promise<Result> {
  const b = await own(id);
  if (!name.trim()) return { ok: false, message: "The name field is required." };
  if (!(price >= 0)) return { ok: false, message: "The price must be a number." };
  const now = new Date();
  if (kind === "labour") await db.bespokelabours.create({ data: { bespoke_id: b.id, name, hour, price: dec(price), created_at: now, updated_at: now } });
  else await db.bespokeparts.create({ data: { bespoke_id: b.id, name, price: dec(price), created_at: now, updated_at: now } });
  await db.bespokes.update({ where: { id: b.id }, data: { price: dec(Number(b.price) + price), updated_at: now } });
  revalidatePath(`/mechanic/bespokes/${id}`);
  return { ok: true, message: "Added." };
}

/** BespokeController@labourDelete / @partDelete */
export async function deleteBespokeLine(id: number, kind: "labour" | "part", lineId: number): Promise<Result> {
  const b = await own(id);
  const row = kind === "labour" ? await db.bespokelabours.findFirst({ where: { id: BigInt(lineId), bespoke_id: b.id } }) : await db.bespokeparts.findFirst({ where: { id: BigInt(lineId), bespoke_id: b.id } });
  if (!row) return { ok: false, message: "Line not found." };
  if (kind === "labour") await db.bespokelabours.delete({ where: { id: row.id } });
  else await db.bespokeparts.delete({ where: { id: row.id } });
  await db.bespokes.update({ where: { id: b.id }, data: { price: dec(Number(b.price) - Number(row.price)), updated_at: new Date() } });
  revalidatePath(`/mechanic/bespokes/${id}`);
  return { ok: true, message: "Removed." };
}

/** BespokeController@bespokeSend */
export async function sendBespoke(id: number): Promise<Result> {
  const b = await own(id);
  const full = await db.bespokes.findUniqueOrThrow({ where: { id: b.id }, include: { bespokelabours: true, bespokeparts: true, bespokeusers: { take: 1 }, users: true } });
  if (!full.bespokelabours.length && !full.bespokeparts.length) return { ok: false, message: "You can't send empty quote. Quotation must have minimum one labour or part." };
  const cust = full.bespokeusers[0];
  if (!cust) return { ok: false, message: "Customer details are missing." };
  await db.bespokes.update({ where: { id: b.id }, data: { status: "Sent", updated_at: new Date() } });
  queueMail(bespokeEstimate(cust, full.users, { id: full.id, token: full.token ?? "", price: Number(full.price), car: parseCar(full.car_data), labours: full.bespokelabours.map((l) => l.name), parts: full.bespokeparts.map((p) => p.name) }), 20_000);
  revalidatePath(`/mechanic/bespokes/${id}`);
  return { ok: true, message: `You have sent a bespoke quote to ${[cust.fname, cust.lname].filter(Boolean).join(" ") || cust.email}` };
}

/** BespokeController@destroy */
export async function deleteBespoke(id: number): Promise<Result> {
  const b = await own(id);
  await db.bespokelabours.deleteMany({ where: { bespoke_id: b.id } });
  await db.bespokeparts.deleteMany({ where: { bespoke_id: b.id } });
  await db.bespokeservices.deleteMany({ where: { bespoke_id: b.id } });
  await db.bespokeusers.deleteMany({ where: { bespoke_id: b.id } });
  await db.bespokes.delete({ where: { id: b.id } });
  revalidatePath("/mechanic/bespokes");
  return { ok: true, message: "Estimate deleted.", link: "/mechanic/bespokes" };
}
