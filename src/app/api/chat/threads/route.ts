import { NextResponse } from "next/server";
import { listThreads } from "@/lib/chat";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  return NextResponse.json(await listThreads(s), { headers: { "Cache-Control": "no-store" } });
}
