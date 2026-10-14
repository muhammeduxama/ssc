"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, getSession } from "@/lib/session";

export type Result = { ok: boolean; message: string };
const norm = (h: string) => h.replace(/^\$2y\$/, "$2b$");

/** Mechanic ProfileController@check / PortalController@check: change own password. */
export async function changeOwnPassword(_: Result | null, form: FormData): Promise<Result> {
  const s = await getSession();
  if (!s || s.kind !== "user") redirect("/login");
  const old = String(form.get("old_password") ?? "");
  const pw = String(form.get("password") ?? "");
  const confirm = String(form.get("password_confirmation") ?? "");
  if (old.length < 8 || pw.length < 8) return { ok: false, message: "Passwords must be at least 8 characters." };
  if (pw !== confirm) return { ok: false, message: "The password confirmation does not match." };
  const u = await db.users.findUniqueOrThrow({ where: { id: BigInt(s.id) } });
  if (!(await bcrypt.compare(old, norm(u.password)))) return { ok: false, message: "Your old password is not correct" };
  await db.users.update({ where: { id: u.id }, data: { password: (await bcrypt.hash(pw, 10)).replace(/^\$2[ab]\$/, "$2y$"), updated_at: new Date() } });
  // The new password ends every other session; keep this one signed in.
  await createSession({ kind: s.kind, id: s.id, role: s.role, name: s.name, email: s.email });
  return { ok: true, message: "Your password is changed successfully. Other devices have been signed out." };
}
