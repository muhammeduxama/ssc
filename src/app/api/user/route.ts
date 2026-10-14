import { NextResponse } from "next/server";
import { json } from "@/lib/api";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** GET /api/user (auth:api) — the signed-in user. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  if (s.kind === "admin") return json(await db.admins.findUnique({ where: { id: BigInt(s.id) } }));
  return json(await db.users.findUnique({ where: { id: BigInt(s.id) } }));
}
