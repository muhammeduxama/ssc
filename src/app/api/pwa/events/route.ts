import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isStaff } from "@/lib/session";
import { unreadCount } from "@/lib/chat";
import { alertAudiences } from "@/lib/pwa/policy";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers });
  const after = new URL(req.url).searchParams.get("after");
  if (after !== null && (!/^\d{1,20}$/.test(after) || BigInt(after) > BigInt("18446744073709551615"))) return NextResponse.json({ error: "Invalid cursor." }, { status: 400, headers });
  const where = { audience: { in: alertAudiences(s) } };
  const [recent, events, unread, orders] = await Promise.all([
    db.appAlert.findMany({ where, orderBy: { id: "desc" }, take: 10 }),
    after === null ? [] : db.appAlert.findMany({ where: { ...where, id: { gt: BigInt(after) } }, orderBy: { id: "asc" }, take: 50 }),
    unreadCount(s), isStaff(s) ? db.notifications.count({ where: { receiver: "admin", seen: false } }) : 0,
  ]);
  const item = (r: typeof recent[number]) => ({ id: String(r.id), title: r.title, body: r.body, url: r.url, at: r.createdAt.toISOString() });
  return NextResponse.json({ events: events.map(item), recent: recent.map(item), cursor: String(events.at(-1)?.id ?? (after === null ? recent[0]?.id ?? 0 : after)), unread: unread + orders, account: `${s.kind}:${s.id}` }, { headers });
}
