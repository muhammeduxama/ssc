import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { threadForOrder } from "@/lib/legacy-links";
import { getSession } from "@/lib/session";
import { mechanicByRef } from "@/lib/magic";

/** Old "ask the mechanic a question" link on repair quotes. */
export async function GET(req: Request, { params }: { params: Promise<{ mtoken: string; otoken: string; customer: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const { mtoken, otoken } = await params;
  const mech = await mechanicByRef(mtoken);
  const t = await threadForOrder(s, otoken, "customer-mechanic", mech?.id);
  return NextResponse.redirect(new URL(t ? `/messages?thread=${encodeURIComponent(t)}` : "/messages", req.url));
}
