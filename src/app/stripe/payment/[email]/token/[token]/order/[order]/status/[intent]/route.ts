import { db } from "@/lib/db";
import { stripeClient } from "@/lib/booking/stripe";
import { go } from "@/lib/magic";

/** PaymentController@paymentStatus — Stripe return URL marking a payment intent as confirmed. */
export async function GET(req: Request, { params }: { params: Promise<{ email: string; token: string; order: string; intent: string }> }) {
  const { email, token, order, intent } = await params;
  const u = await db.users.findFirst({ where: { email: decodeURIComponent(email), api_token: token } });
  const o = u && /^\d+$/.test(order) ? await db.orders.findFirst({ where: { id: BigInt(order), user_id: u.id } }) : null;
  const p = o ? await db.payments.findFirst({ where: { order_id: o.id, intent_id: intent } }) : null;
  if (p) {
    // Trust Stripe, not the link: only mark it confirmed when the intent really went through.
    const sc = await stripeClient();
    const pi = sc ? await sc.stripe.paymentIntents.retrieve(intent).catch(() => null) : null;
    if (pi && ["succeeded", "requires_capture", "processing"].includes(pi.status)) await db.payments.update({ where: { id: p.id }, data: { intent_status: true, updated_at: new Date() } });
  }
  return go(req, "/dashboard");
}
