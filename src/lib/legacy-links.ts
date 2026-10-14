import "server-only";
import { db } from "@/lib/db";
import type { Session } from "@/lib/session";

/** Work out which inbox thread an old chat link points at for the signed-in person. */
export async function threadForOrder(s: Session, orderToken: string, kind: "customer-mechanic" | "support", otherUserId?: bigint) {
  const o = await db.orders.findUnique({ where: { token: orderToken }, include: { orderassigns: { take: 1 } } });
  if (!o) return null;
  const mech = otherUserId ?? o.orderassigns[0]?.user_id;
  if (kind === "support") {
    if (s.role === "mechanic") return `${o.id}:s:${s.id}`;
    if (s.role === "customer") return `${o.id}:s:${s.id}`;
    // Staff: the most recent support conversation on this booking (mechanic or customer).
    const last = await db.adminresolutions.findFirst({ where: { order_id: o.id }, orderBy: { id: "desc" }, select: { user_id: true } });
    const who = last?.user_id ?? mech;
    return who ? `${o.id}:s:${who}` : null;
  }
  if (s.role === "customer" && mech) return `${o.id}:p:${mech}`;
  if (s.role === "mechanic") return `${o.id}:p:${o.user_id}`;
  return null;
}
