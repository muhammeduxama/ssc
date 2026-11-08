import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, secureCookies } from "@/lib/session";
import { hit, MIN } from "@/lib/rate-limit";
import { endpointHash, PUSH_DEVICE_COOKIE, pushReady } from "@/lib/pwa/push";
import { validPushEndpoint } from "@/lib/pwa/policy";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (v: unknown, status = 200) => NextResponse.json(v, { status, headers });
const schema = z.object({ subscription: z.object({ endpoint: z.string().max(4096).refine(validPushEndpoint), keys: z.object({ p256dh: z.string().regex(/^[\w-]{87}$/), auth: z.string().regex(/^[\w-]{22}$/) }) }), sound: z.boolean() });
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !!origin && [new URL(req.url).origin, ...(process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : [])].includes(origin);
}
export async function GET() {
  const s = await getSession();
  if (!s) return reply({ error: "Sign in to manage notifications." }, 401);
  const hash = (await cookies()).get(PUSH_DEVICE_COOKIE)?.value;
  const device = hash ? await db.pushSubscription.findFirst({ where: { endpointHash: hash, ownerKey: `${s.kind}:${s.id}`, version: s.pv } }) : null;
  return reply({ ready: pushReady(), publicKey: process.env.VAPID_PUBLIC_KEY || null, subscribed: !!device, sound: device?.sound ?? true, account: `${s.kind}:${s.id}` });
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply({ error: "Invalid request origin." }, 403);
  const s = await getSession();
  if (!s) return reply({ error: "Sign in first." }, 401);
  if (!hit(`push:${s.kind}:${s.id}`, 20, MIN)) return reply({ error: "Please wait before trying again." }, 429);
  if (!pushReady()) return reply({ error: "Push notifications have not been configured on this server." }, 503);
  const data = schema.safeParse(await req.json().catch(() => null));
  if (!data.success) return reply({ error: "Invalid browser subscription." }, 400);
  const sub = data.data.subscription;
  const hash = endpointHash(sub.endpoint);
  const ownerKey = `${s.kind}:${s.id}`;
  const fields = { ownerKey, role: s.role, version: s.pv!, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, sound: data.data.sound, updatedAt: new Date() };
  await db.pushSubscription.upsert({ where: { endpointHash: hash }, create: { endpointHash: hash, ...fields }, update: fields });
  (await cookies()).set(PUSH_DEVICE_COOKIE, hash, { httpOnly: true, secure: secureCookies, sameSite: "lax", path: "/", maxAge: 90 * 86400 });
  return reply({ ok: true });
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return reply({ error: "Invalid request origin." }, 403);
  const s = await getSession();
  if (!s) return reply({ error: "Sign in first." }, 401);
  const jar = await cookies();
  const hash = jar.get(PUSH_DEVICE_COOKIE)?.value;
  if (hash) await db.pushSubscription.deleteMany({ where: { endpointHash: hash, ownerKey: `${s.kind}:${s.id}` } });
  jar.delete(PUSH_DEVICE_COOKIE);
  return reply({ ok: true });
}
