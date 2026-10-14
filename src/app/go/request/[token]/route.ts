import { db } from "@/lib/db";
import { go } from "@/lib/magic";
import { getSession } from "@/lib/session";

/** "View Booking Request" / "Send Quote" from mechanic emails: open the right page for this order. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await getSession();
  if (!s || s.role !== "mechanic") return go(req, `/login?next=${encodeURIComponent(`/go/request/${token}`)}`);
  const me = BigInt(s.id);
  const order = await db.orders.findUnique({ where: { token }, include: { orderassigns: { take: 1 } } });
  if (!order) return go(req, "/mechanic/requests");
  const request = await db.orderrequests.findFirst({ where: { order_id: order.id, user_id: me } });
  if (order.order_for === "repairs" && order.price === null) return go(req, request ? `/mechanic/quote-requests/${request.id}` : "/mechanic/quote-requests");
  const a = order.orderassigns[0];
  if (a && a.user_id === me) return go(req, `/mechanic/jobs/${a.id}`);
  if (a) return go(req, "/mechanic/requests");
  return go(req, request ? `/mechanic/requests/${request.id}` : "/mechanic/requests");
}
