import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agreementFor } from "@/lib/pdf/agreement";
import { getSession } from "@/lib/session";

/** ProfileController@agreement — download the signed mechanic agreement. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "mechanic") return NextResponse.redirect(new URL("/login", req.url));
  const u = await db.users.findUniqueOrThrow({ where: { id: BigInt(s.id) } });
  const pdf = await agreementFor(u);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="mechanic-agreement.pdf"' } });
}
