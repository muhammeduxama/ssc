import { NextResponse } from "next/server";
import { threadForOrder } from "@/lib/legacy-links";
import { getSession } from "@/lib/session";

/** Old resolution-centre link (customer ↔ mechanic chat for a booking). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const t = await threadForOrder(s, (await params).token, "customer-mechanic");
  return NextResponse.redirect(new URL(t ? `/messages?thread=${encodeURIComponent(t)}` : "/messages", req.url));
}
