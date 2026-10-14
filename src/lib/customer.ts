import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createSession, getSession } from "@/lib/session";

const normalise = (hash: string) => hash.replace(/^\$2y\$/, "$2b$");
export const randomToken = (len: number) => randomBytes(Math.ceil(len)).toString("base64url").slice(0, len);
/** Laravel: Str::random(40).time().Str::random(20) */
export const apiToken = () => `${randomToken(40)}${Math.floor(Date.now() / 1000)}${randomToken(20)}`;
/** Stored with Laravel's $2y$ prefix so both apps can verify it. */
export const hashPassword = async (p: string) => (await bcrypt.hash(p, 10)).replace(/^\$2[ab]\$/, "$2y$");
export const checkPassword = (p: string, hash: string) => bcrypt.compare(p, normalise(hash));

export async function startCustomerSession(u: { id: bigint; fname: string; lname: string; email: string }) {
  await createSession({ kind: "user", id: String(u.id), role: "customer", name: `${u.fname} ${u.lname}`.trim(), email: u.email });
}

/** The signed-in customer row, or null (staff and mechanics are not customers). */
export async function currentCustomer() {
  const s = await getSession();
  if (!s || s.kind !== "user" || s.role !== "customer") return null;
  return db.users.findUnique({ where: { id: BigInt(s.id) } });
}

type Guest = { first_name?: string; last_name?: string; email?: string; password?: string; phone?: string };

/**
 * The "login or register" step of the booking / quote forms (OrderController@saveOrder).
 * Fixes the Laravel bug where an existing customer always got "You password is incorrect".
 */
export async function customerFromBookingForm(f: Guest, ip: string | null): Promise<{ ok: true; user: NonNullable<Awaited<ReturnType<typeof currentCustomer>>> } | { ok: false; message: string }> {
  const s = await getSession();
  if (s && !(s.kind === "user" && s.role === "customer")) return { ok: false, message: "Please sign out of your staff or mechanic account to book as a customer." };
  const me = await currentCustomer();
  if (me) return { ok: true, user: me };
  const email = (f.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
  const existing = await db.users.findUnique({ where: { email } });
  if (existing) {
    if (Number(existing.role_id) !== 2 || !(await checkPassword(f.password ?? "", existing.password))) return { ok: false, message: "You password is incorrect" };
    await startCustomerSession(existing);
    return { ok: true, user: existing };
  }
  if (!f.first_name?.trim() || !f.last_name?.trim()) return { ok: false, message: "First and last name are required." };
  if ((f.password ?? "").length < 8) return { ok: false, message: "The password must be at least 8 characters." };
  const now = new Date();
  const user = await db.users.create({
    data: {
      fname: f.first_name.trim(),
      lname: f.last_name.trim(),
      email,
      ip,
      password: await hashPassword(f.password!),
      role_id: BigInt(2),
      phone: (f.phone ?? "").trim(),
      api_token: apiToken(),
      created_at: now,
      updated_at: now,
    },
  });
  await startCustomerSession(user);
  return { ok: true, user };
}
