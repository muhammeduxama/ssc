"use server";
import { db } from "@/lib/db";
import { MIN, TOO_MANY, allow } from "@/lib/rate-limit";

/** PageController@addContactMessage */
export async function addContactMessage(form: FormData): Promise<{ ok: boolean; message: string }> {
  if (!(await allow(["contact", 5, 60 * MIN]))) return { ok: false, message: TOO_MANY };
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!g("name") || !g("subject") || !g("message")) return { ok: false, message: "Please fill in every field." };
  if (!/^\S+@\S+\.\S+$/.test(g("email"))) return { ok: false, message: "Please enter a valid email address." };
  if (!/^\+?[\d\s]+$/.test(g("phone"))) return { ok: false, message: "The phone must be a number." };
  const now = new Date();
  await db.contacts.create({ data: { name: g("name"), email: g("email"), phone: g("phone"), subject: g("subject"), message: g("message"), created_at: now, updated_at: now } });
  return { ok: true, message: "Message Sent Successfully. we will contact you soon!!" };
}
