"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { MIN, TOO_MANY, clearHits, clientIp, hit } from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export type LoginState = { error?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and your password." };
  // 5 tries per account and 30 per address every 15 minutes, against password guessing.
  const ip = await clientIp();
  const perAccount = `login|${ip}|${parsed.data.email.trim().toLowerCase()}`;
  const okAccount = hit(perAccount, 5, 15 * MIN);
  const okIp = hit(`login|${ip}`, 30, 15 * MIN);
  if (!okAccount || !okIp) return { error: TOO_MANY };
  const session = await authenticate(parsed.data.email, parsed.data.password);
  if (!session) return { error: "Those details don’t match an account." };
  clearHits(perAccount);
  await createSession(session);
  redirect(safeNext(form.get("next")) ?? "/dashboard");
}

export async function logout(form?: FormData) {
  await destroySession();
  redirect(safeNext(form?.get("next")) ?? "/login");
}

/** Only same-site paths ("/x"). Browsers read "//host" and "/\\host" as another site. */
function safeNext(v: FormDataEntryValue | null | undefined) {
  const s = typeof v === "string" ? v : "";
  return /^\/(?![\/\\])/.test(s) && !/[\\\s]/.test(s) ? s : null;
}
