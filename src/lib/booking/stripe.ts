import "server-only";
import Stripe from "stripe";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";

// ---------------------------------------------------------------- card (Stripe SetupIntent)

export async function stripeClient() {
  const keys = await db.stripes.findFirst();
  if (!keys?.secret_key) return null;
  return { stripe: new Stripe(keys.secret_key), publishable: keys.publishable_key };
}

/** Stripe customer for the platform account, reusing users.stripe_id when it still exists. */
export async function ensureStripeCustomer(stripe: Stripe, u: { id: bigint; fname: string; lname: string; email: string; stripe_id: string | null }) {
  if (u.stripe_id) {
    try {
      const c = await stripe.customers.retrieve(u.stripe_id);
      if (!("deleted" in c && c.deleted)) return c.id;
    } catch {}
  }
  const c = await stripe.customers.create({ name: `${u.fname} ${u.lname}`, email: u.email });
  await db.users.update({ where: { id: u.id }, data: { stripe_id: c.id } });
  return c.id;
}

/** Verifies a confirmed SetupIntent belongs to this customer and stores it as the order's card. */
export async function storeCard(orderId: bigint, setupIntentId: string) {
  const me = await currentCustomer();
  if (!me) return { ok: false as const, message: "Please log in again." };
  const order = await db.orders.findFirst({ where: { id: orderId, user_id: me.id } });
  if (!order) return { ok: false as const, message: "Order not found." };
  const sc = await stripeClient();
  if (!sc) return { ok: false as const, message: "Card payments are not configured." };
  const si = await sc.stripe.setupIntents.retrieve(setupIntentId);
  if (si.status !== "succeeded" || !si.payment_method || si.customer !== me.stripe_id) return { ok: false as const, message: "Your card could not be verified. Please try again." };
  const now = new Date();
  const data = { customer_id: String(si.customer), intent_id: si.id, payment_method: String(si.payment_method), client_secret: si.client_secret ?? "", order_id: order.id, updated_at: now };
  const existing = await db.orderpayments.findFirst({ where: { order_id: order.id } });
  if (existing) await db.orderpayments.update({ where: { id: existing.id }, data });
  else await db.orderpayments.create({ data: { ...data, created_at: now } });
  return { ok: true as const, me, order };
}

