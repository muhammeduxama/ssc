"use server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export type Result = { ok: boolean; message: string; errors?: Record<string, string> };
const laravelHash = async (pw: string) => (await bcrypt.hash(pw, 10)).replace(/^\$2[ab]\$/, "$2y$");
const issues = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

const base = {
  fname: z.string().trim().min(1, "First name is required").max(255),
  lname: z.string().trim().min(1, "Last name is required").max(255),
  phone: z.string().trim().min(1, "Phone is required").max(255),
  email: z.string().trim().email("Enter a valid email").max(255),
};

/** ClientController@addclient */
export async function addClient(_: Result | null, form: FormData): Promise<Result> {
  await requireStaff();
  const p = z.object({ ...base, password: z.string().min(8, "Use at least 8 characters") }).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Please fix the highlighted fields.", errors: issues(p.error) };
  if (await db.users.findUnique({ where: { email: p.data.email } })) return { ok: false, message: "That email is already registered.", errors: { email: "The email has already been taken." } };
  const now = new Date();
  await db.users.create({
    data: { role_id: BigInt(2), fname: p.data.fname, lname: p.data.lname, email: p.data.email, phone: p.data.phone, password: await laravelHash(p.data.password), api_token: randomBytes(30).toString("hex"), status: true, created_at: now, updated_at: now },
  });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Client added." };
}

/** ClientController@update */
export async function updateClient(id: number, _: Result | null, form: FormData): Promise<Result> {
  await requireStaff();
  const p = z.object(base).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Please fix the highlighted fields.", errors: issues(p.error) };
  const clash = await db.users.findFirst({ where: { email: p.data.email, NOT: { id: BigInt(id) } }, select: { id: true } });
  if (clash) return { ok: false, message: "That email is already registered.", errors: { email: "The email has already been taken." } };
  await db.users.update({ where: { id: BigInt(id) }, data: { ...p.data, updated_at: new Date() } });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Client updated." };
}

/** ClientController@changeStatus */
export async function setClientStatus(id: number, active: boolean): Promise<Result> {
  await requireStaff();
  await db.users.update({ where: { id: BigInt(id) }, data: { status: active, updated_at: new Date() } });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Status change successfully." };
}

/** ClientController@changePassword */
export async function setClientPassword(id: number, password: string, confirm: string): Promise<Result> {
  await requireStaff();
  if (password.length < 8) return { ok: false, message: "Use at least 8 characters." };
  if (password !== confirm) return { ok: false, message: "Passwords don’t match." };
  await db.users.update({ where: { id: BigInt(id) }, data: { password: await laravelHash(password), updated_at: new Date() } });
  return { ok: true, message: "Password changed." };
}
