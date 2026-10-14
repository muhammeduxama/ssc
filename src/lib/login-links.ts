import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/mail/layout";
import { createSession, sessionSecret } from "@/lib/session";

/**
 * Email login links. Each link is signed, names one user and one page, expires after 7 days and
 * works once (used nonces live in login_link_uses). They replace Laravel's links that carried the
 * user's permanent api_token. An expired or used link still opens the page after a normal sign-in.
 */
const DAYS = 7;
type Payload = { u: string; t: string; e: number; n: string };

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", `login-link|${sessionSecret()}`).update(body).digest("base64url");
export const samePath = (p: string) => /^\/(?![\/\\])/.test(p) && !/[\\\s]/.test(p);

/** A login link for `userId` that lands on `target` (a same-site path). */
export function loginLink(userId: bigint | number | string, target: string) {
  if (!samePath(target)) throw new Error("Login links must point at a page on this site.");
  const body = b64(JSON.stringify({ u: String(userId), t: target, e: Math.floor(Date.now() / 1000) + DAYS * 86400, n: randomBytes(16).toString("hex") } satisfies Payload));
  return appUrl(`/l/${body}.${sign(body)}`);
}

/** The link's contents if the signature is good (expiry and use are checked separately). */
export function readLink(token: string): (Payload & { expired: boolean }) | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (!/^\d+$/.test(p.u) || !samePath(p.t) || !/^[0-9a-f]{32}$/.test(p.n)) return null;
    return { ...p, expired: p.e * 1000 < Date.now() };
  } catch {
    return null;
  }
}

/** Use the link up and sign its user in. Returns where to go next. */
export async function redeemLink(token: string): Promise<string> {
  const p = readLink(token);
  if (!p) return "/login";
  const fallback = `/login?next=${encodeURIComponent(p.t)}`;
  if (p.expired) return fallback;
  const u = await db.users.findUnique({ where: { id: BigInt(p.u) } });
  if (!u || !u.status) return fallback;
  try {
    // The primary key makes this the single use: a second redeem fails here.
    await db.login_link_uses.create({ data: { nonce: p.n, user_id: u.id } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return fallback; // already used
    throw e;
  }
  await createSession({ kind: "user", id: String(u.id), role: Number(u.role_id) === 1 ? "mechanic" : "customer", name: `${u.fname} ${u.lname}`.trim(), email: u.email });
  // Keep the table small: used links older than their lifetime can never be replayed anyway.
  if (Math.random() < 0.02) await db.login_link_uses.deleteMany({ where: { used_at: { lt: new Date(Date.now() - (DAYS + 1) * 864e5) } } });
  return p.t;
}
