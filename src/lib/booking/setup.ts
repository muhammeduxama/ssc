import "server-only";
import { ensureStripeCustomer, stripeClient } from "./stripe";

/** A fresh SetupIntent for the customer (PaymentController@getPaymentInfo). */
export async function setupIntentFor(u: Parameters<typeof ensureStripeCustomer>[1]) {
  const sc = await stripeClient();
  if (!sc) return null;
  try {
    const customer = await ensureStripeCustomer(sc.stripe, u);
    const si = await sc.stripe.setupIntents.create({ customer, payment_method_types: ["card"], usage: "off_session" });
    return { clientSecret: si.client_secret!, publishable: sc.publishable };
  } catch (e) {
    console.error("[stripe] setup intent failed", e);
    return null;
  }
}
