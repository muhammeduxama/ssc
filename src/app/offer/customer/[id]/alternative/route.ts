import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Old URL /offer/customer/{order}/alternative → the mechanic's request for that order. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || s.role !== "mechanic") return NextResponse.redirect(new URL("/login", req.url));
  const { id } = await params;
  const r = /^\d+$/.test(id) ? await db.orderrequests.findFirst({ where: { order_id: BigInt(id), user_id: BigInt(s.id) } }) : null;
  return NextResponse.redirect(new URL(r ? `/mechanic/requests/${r.id}/alternatives` : "/mechanic/requests", req.url));
}
