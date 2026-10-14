import { db } from "@/lib/db";
import { goSignedIn } from "@/lib/magic";

/** Old "Book Service" link from the SSC quote email (it used to sign the customer in). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const order = await db.orders.findFirst({ where: { token: (await params).token }, select: { id: true } });
  return goSignedIn(req, order ? `/portal/quotes/${order.id}/book` : "/portal/quotes");
}
