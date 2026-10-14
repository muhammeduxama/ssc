import { db } from "@/lib/db";
import { go } from "@/lib/magic";
import { getSession } from "@/lib/session";

/** "Book Me In" from a mechanic's repair quote email: book that mechanic's quote. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; m: string }> }) {
  const { token, m } = await params;
  const s = await getSession();
  if (!s || s.role !== "customer") return go(req, `/login?next=${encodeURIComponent(`/go/quote/${token}/mechanic/${m}`)}`);
  const order = await db.orders.findFirst({ where: { token, user_id: BigInt(s.id) }, include: { orderassigns: { take: 1 } } });
  const r = order && /^\d+$/.test(m) ? await db.orderrequests.findFirst({ where: { order_id: order.id, user_id: BigInt(m) } }) : null;
  if (!order || !r) return go(req, "/portal/quotes");
  if (order.orderassigns.length) return go(req, `/portal/orders/${order.id}`);
  return go(req, `/portal/quotes/${order.id}/accept/${r.id}`);
}
