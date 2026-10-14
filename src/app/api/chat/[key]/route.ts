import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessages, sendMessage } from "@/lib/chat";
import { getSession } from "@/lib/session";
import { MIN, hit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { key } = await params;
  const msgs = await getMessages(s, decodeURIComponent(key));
  if (!msgs) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(msgs, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!hit(`chat:${s.kind}:${s.id}`, 30, MIN)) return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
  const { key } = await params;
  const parsed = z.object({ text: z.string().min(1).max(4000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ok = await sendMessage(s, decodeURIComponent(key), parsed.data.text);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "forbidden" }, { status: 403 });
}
