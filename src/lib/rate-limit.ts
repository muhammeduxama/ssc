import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory fixed-window limiter (per server process). Enough for one Node instance;
 * move the counters to Redis if the app ever runs on several instances.
 */
const hits = new Map<string, { n: number; reset: number }>();

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 50_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= limit;
}

/** Forget a key, e.g. after a successful login. */
export const clearHits = (key: string) => hits.delete(key);

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

/** True when the caller is still within every limit given as [name, max, windowMs]. */
export async function allow(...rules: [string, number, number][]) {
  const ip = await clientIp();
  let ok = true;
  for (const [name, max, ms] of rules) if (!hit(`${name}|${ip}`, max, ms)) ok = false;
  return ok;
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
export const MIN = 60_000;
