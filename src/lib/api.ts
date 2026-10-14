import "server-only";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/session";

/** Laravel-style JSON: ids as numbers, decimals as strings, dates as ISO strings; secrets never leave. */
const HIDDEN = new Set(["password", "remember_token", "api_token"]);
export function serialize(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Prisma.Decimal) return v.toFixed(2);
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !HIDDEN.has(k)).map(([k, x]) => [k, serialize(x)]));
  return v;
}
export const json = (v: unknown) => NextResponse.json(serialize(v));

/** Laravel exposed these to anyone; this app requires a signed-in staff session. */
export async function staffOnly() {
  const s = await getSession();
  return s && isStaff(s) ? null : NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
}
