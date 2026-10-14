import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const go = (req: Request, path: string) => NextResponse.redirect(new URL(path, req.url));

/**
 * Old emailed links used to sign people in with their permanent api_token. They now only point the
 * way: signed-in users go straight to the page, everyone else signs in first and lands there.
 */
export async function goSignedIn(req: Request, path: string) {
  return (await getSession()) ? go(req, path) : go(req, `/login?next=${encodeURIComponent(path)}`);
}

/**
 * A mechanic named in an emailed link: new links carry the numeric id (the order token is the
 * secret there), old ones the mechanic's api_token, which we no longer hand out to customers.
 */
export async function mechanicByRef(ref: string) {
  const { db } = await import("@/lib/db");
  return db.users.findFirst({ where: /^\d+$/.test(ref) ? { id: BigInt(ref), role_id: 1 } : { api_token: ref, role_id: 1 } });
}
