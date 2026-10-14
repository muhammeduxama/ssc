import "server-only";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/mail/layout";
import { sessionSecret } from "@/lib/session";

const secret = () => sessionSecret();
const sign = (s: string) => createHmac("sha256", secret()).update(s).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ---------------------------------------------------------------- email verification (Laravel verify routes)

/** Signed /email/verify/{id}/{sha1(email)}?expires=…&signature=… link, valid 60 minutes like Laravel. */
export function verificationUrl(u: { id: bigint; email: string }) {
  const hash = createHash("sha1").update(u.email).digest("hex");
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const path = `/email/verify/${u.id}/${hash}?expires=${expires}`;
  return appUrl(`${path}&signature=${sign(path)}`);
}

export async function checkVerification(id: string, hash: string, expires: string, signature: string) {
  const path = `/email/verify/${id}/${hash}?expires=${expires}`;
  if (!/^\d+$/.test(id) || !signature || !same(sign(path), signature) || Number(expires) * 1000 < Date.now()) return null;
  const u = await db.users.findUnique({ where: { id: BigInt(id) } });
  if (!u || createHash("sha1").update(u.email).digest("hex") !== hash) return null;
  if (!u.email_verified_at) await db.users.update({ where: { id: u.id }, data: { email_verified_at: new Date() } });
  return u;
}

// ---------------------------------------------------------------- password reset (password_resets table)

/** Laravel's broker: one row per email, token stored as a bcrypt hash, links valid 60 minutes. */
export async function createResetToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const hashed = (await bcrypt.hash(token, 10)).replace(/^\$2[ab]\$/, "$2y$");
  await db.$executeRaw`DELETE FROM password_resets WHERE email = ${email}`;
  await db.$executeRaw`INSERT INTO password_resets (email, token, created_at) VALUES (${email}, ${hashed}, NOW())`;
  return token;
}

export async function checkResetToken(email: string, token: string) {
  const rows = await db.$queryRaw<{ token: string; created_at: Date | null }[]>`SELECT token, created_at FROM password_resets WHERE email = ${email} LIMIT 1`;
  const r = rows[0];
  if (!r || !r.created_at || Date.now() - r.created_at.getTime() > 3600_000) return false;
  return bcrypt.compare(token, r.token.replace(/^\$2y\$/, "$2b$"));
}

export const clearResetToken = (email: string) => db.$executeRaw`DELETE FROM password_resets WHERE email = ${email}`;
