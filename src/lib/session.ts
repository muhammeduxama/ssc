import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "ssc-session";
/** Holds the staff session while an admin is logged in as a mechanic/customer. */
export const IMPERSONATOR_COOKIE = "ssc-impersonator";
/** The signing key. A missing or short secret would let anyone forge an admin session, so production refuses to run without one. */
export function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ characters).");
  return "dev-secret-change-me-dev-secret-change-me";
}
const key = new TextEncoder().encode(sessionSecret());

export type Role = "admin" | "editor" | "mechanic" | "customer";
export type Session = {
  kind: "admin" | "user";
  id: string;
  role: Role;
  name: string;
  email: string;
  /** Fingerprint of the account's password hash when the session started (see passwordVersion). */
  pv?: string;
};

/**
 * Sessions carry a short fingerprint of the password hash. Changing the password changes the hash,
 * so every other session (and any stolen cookie) stops working at once.
 */
export const passwordVersion = (hash: string) => createHash("sha256").update(`${hash}|${sessionSecret()}`).digest("base64url").slice(0, 16);

async function currentHash(kind: Session["kind"], id: string) {
  if (!/^\d+$/.test(id)) return null;
  if (kind === "admin") return (await db.admins.findUnique({ where: { id: BigInt(id) }, select: { password: true } }))?.password ?? null;
  const u = await db.users.findUnique({ where: { id: BigInt(id) }, select: { password: true, status: true } });
  return u ? { hash: u.password, active: u.status } : null;
}

export async function createSession(s: Session) {
  const cur = await currentHash(s.kind, s.id);
  const hash = typeof cur === "string" ? cur : cur?.hash;
  if (!hash) throw new Error("Account not found.");
  const token = await new SignJWT({ ...s, pv: passwordVersion(hash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await verified(token);
  if (!s) return null;
  // A blocked or deleted account loses access straight away, not when the cookie expires.
  // (Staff logged in as an inactive mechanic still get through.)
  if (s.inactive && !(await impersonatedByStaff())) return null;
  return s.session;
});

/** Signature, expiry, account still there, and the password not changed since the session began. */
async function verified(token: string): Promise<{ session: Session; inactive: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    const s = payload as unknown as Session;
    const cur = await currentHash(s.kind, s.id);
    if (!cur) return null;
    const hash = typeof cur === "string" ? cur : cur.hash;
    if (!s.pv || s.pv !== passwordVersion(hash)) return null;
    return { session: s, inactive: typeof cur !== "string" && !cur.active };
  } catch {
    return null;
  }
}

async function impersonatedByStaff() {
  const t = (await cookies()).get(IMPERSONATOR_COOKIE)?.value;
  const v = t ? await verified(t) : null;
  return v?.session.kind === "admin";
}

export const isStaff = (s: Session) => s.role === "admin" || s.role === "editor";
