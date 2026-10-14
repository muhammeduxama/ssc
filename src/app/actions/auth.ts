"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkResetToken, clearResetToken, createResetToken, verificationUrl } from "@/lib/auth-flows";
import { findOrCreatePostcode } from "@/lib/booking/postcode";
import { apiToken, hashPassword, startCustomerSession } from "@/lib/customer";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/mail/layout";
import { queueMail, sendMail } from "@/lib/mail/send";
import { requireDocs, resetPassword, verifyEmail } from "@/lib/mail/templates";
import { createAgreement } from "@/lib/pdf/agreement";
import { createSession, getSession } from "@/lib/session";
import { MIN, TOO_MANY, allow } from "@/lib/rate-limit";

type R = { ok: boolean; message: string; link?: string };
const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
const g = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e) && e.length <= 191;

/** RegisterController@registerUser — customer sign-up. The role is never taken from the form. */
export async function registerCustomer(form: FormData): Promise<R> {
  if (!(await allow(["register", 5, 60 * MIN]))) return { ok: false, message: TOO_MANY };
  const email = g(form, "email").toLowerCase();
  if (!g(form, "first_name") || !g(form, "last_name")) return { ok: false, message: "First and last name are required." };
  if (!/^\d{11}$/.test(g(form, "phone"))) return { ok: false, message: "The phone must be 11 digits." };
  if (!emailOk(email)) return { ok: false, message: "Please enter a valid email address." };
  if (String(form.get("password") ?? "").length < 8) return { ok: false, message: "The password must be at least 8 characters." };
  if (!form.get("check")) return { ok: false, message: "Please accept the terms and conditions." };
  if (await db.users.findUnique({ where: { email } })) return { ok: false, message: "The email has already been taken." };
  const now = new Date();
  const u = await db.users.create({
    data: { fname: g(form, "first_name"), lname: g(form, "last_name"), phone: g(form, "phone"), email, password: await hashPassword(String(form.get("password"))), role_id: BigInt(2), status: true, ip: await ip(), api_token: apiToken(), created_at: now, updated_at: now },
  });
  queueMail(verifyEmail(u.email, verificationUrl(u)));
  await startCustomerSession(u);
  return { ok: true, message: "Welcome! Your account is ready.", link: "/dashboard" };
}

/** RegisterController@registerMechanic — join the network (inactive until SSC approves). */
export async function registerMechanic(form: FormData): Promise<R> {
  if (!(await allow(["register", 5, 60 * MIN]))) return { ok: false, message: TOO_MANY };
  const email = g(form, "email").toLowerCase();
  for (const k of ["company", "post_code", "first_name", "last_name"]) if (!g(form, k)) return { ok: false, message: "Please fill in every required field." };
  if (!/^\d{11}$/.test(g(form, "phone"))) return { ok: false, message: "The phone must be 11 digits." };
  if (!emailOk(email)) return { ok: false, message: "Please enter a valid email address." };
  if (String(form.get("password") ?? "").length < 8) return { ok: false, message: "The password must be at least 8 characters." };
  if (!form.get("check")) return { ok: false, message: "Please accept the mechanic terms and conditions." };
  if (await db.users.findUnique({ where: { email } })) return { ok: false, message: "The email has already been taken." };
  const pc = await findOrCreatePostcode(g(form, "post_code"));
  if (!pc.ok) return pc;
  const post = await db.postcodes.findUniqueOrThrow({ where: { id: pc.postcode.id }, include: { cities: { include: { counties: true } } } });
  const token = apiToken();
  const now = new Date();
  const u = await db.users.create({
    data: {
      company: g(form, "company"),
      post_code: post.postcode,
      note: g(form, "note") || null,
      vat: g(form, "vat_number") || null,
      fname: g(form, "first_name"),
      lname: g(form, "last_name"),
      phone: g(form, "phone"),
      email,
      city: post.cities.name,
      county: post.cities.counties.name,
      password: await hashPassword(String(form.get("password"))),
      role_id: BigInt(1),
      status: false,
      ip: await ip(),
      api_token: token,
      lat: post.lat,
      long: post.long,
      created_at: now,
      updated_at: now,
    },
  });
  queueMail(requireDocs(u.email, token), 20_000);
  queueMail(verifyEmail(u.email, verificationUrl(u)));
  createAgreement(u).catch((e) => console.error("[agreement] failed", e));
  return { ok: true, message: "Thanks for joining! Check your email to verify your address and upload your documents. We'll activate your account once your documents are approved.", link: "/join-network/thanks" };
}

/** Resend the verification email (Laravel's /email/resend). */
export async function resendVerification(): Promise<R> {
  const s = await getSession();
  if (!s || s.kind !== "user") return { ok: false, message: "Please sign in first." };
  if (!(await allow([`verify:${s.id}`, 3, 15 * MIN]))) return { ok: false, message: TOO_MANY };
  const u = await db.users.findUniqueOrThrow({ where: { id: BigInt(s.id) } });
  if (u.email_verified_at) return { ok: true, message: "Your email address is already verified." };
  await sendMail(verifyEmail(u.email, verificationUrl(u)));
  return { ok: true, message: "A fresh verification link has been sent to your email address." };
}

/** ForgotPasswordController@sendResetLinkEmail — same answer whether or not the email exists. */
export async function sendResetLink(form: FormData): Promise<R> {
  const email = g(form, "email").toLowerCase();
  if (!emailOk(email)) return { ok: false, message: "Please enter a valid email address." };
  if (!(await allow([`reset:${email}`, 3, 15 * MIN], ["reset", 10, 15 * MIN]))) return { ok: false, message: TOO_MANY };
  const u = await db.users.findUnique({ where: { email } });
  if (u) {
    const token = await createResetToken(u.email);
    queueMail(resetPassword(u.email, appUrl(`/password/reset/${token}?email=${encodeURIComponent(u.email)}`)));
  }
  return { ok: true, message: "If that email has an account, we have emailed your password reset link!" };
}

/** ResetPasswordController@reset */
export async function resetPasswordWithToken(token: string, form: FormData): Promise<R> {
  const email = g(form, "email").toLowerCase();
  if (!(await allow(["reset-confirm", 10, 15 * MIN]))) return { ok: false, message: TOO_MANY };
  const pw = String(form.get("password") ?? "");
  if (pw.length < 8) return { ok: false, message: "The password must be at least 8 characters." };
  if (pw !== String(form.get("password_confirmation") ?? "")) return { ok: false, message: "The password confirmation does not match." };
  if (!(await checkResetToken(email, token))) return { ok: false, message: "This password reset token is invalid." };
  const u = await db.users.findUnique({ where: { email } });
  if (!u) return { ok: false, message: "This password reset token is invalid." };
  await db.users.update({ where: { id: u.id }, data: { password: await hashPassword(pw), updated_at: new Date() } });
  await clearResetToken(email);
  if (u.status) await createSession({ kind: "user", id: String(u.id), role: Number(u.role_id) === 1 ? "mechanic" : "customer", name: `${u.fname} ${u.lname}`.trim(), email: u.email });
  return { ok: true, message: "Your password has been reset!", link: u.status ? "/dashboard" : "/login?reset=1" };
}

export async function signOutTo(path: string) {
  const { destroySession } = await import("@/lib/session");
  await destroySession();
  // Same-site paths only, so this can't bounce people to another website.
  redirect(/^\/(?![\/\\])/.test(path) && !/[\\\s]/.test(path) ? path : "/login");
}
