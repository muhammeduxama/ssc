import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SaveBespokeCard } from "@/components/booking/SaveBespokeCard";
import { setupIntentFor } from "@/lib/booking/setup";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure your booking" };

/** PaymentController@bespokePayment */
export default async function BespokePayment({ params }: { params: Promise<{ b: string; o: string }> }) {
  const { b: btoken, o: otoken } = await params;
  const me = await currentCustomer();
  if (!me) redirect(`/login?next=/user/bespoke/payment/${btoken}/order/${otoken}`);
  const [b, order] = await Promise.all([db.bespokes.findFirst({ where: { token: btoken } }), db.orders.findFirst({ where: { token: otoken, user_id: me.id } })]);
  if (!b || !order) redirect("/");
  const setup = await setupIntentFor(me);
  return (
    <>
    <PageHead eyebrow="Payment details" title="Secure your booking">Estimate total {gbp(b.price)}. You will be charged by your mechanic after the work is complete.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="quote-panel max-w-2xl">
        {setup ? <SaveBespokeCard token={btoken} orderId={Number(order.id)} publishableKey={setup.publishable} clientSecret={setup.clientSecret} name={`${me.fname} ${me.lname}`} /> : <p className="text-danger">Card payments are unavailable right now.</p>}
      </div>
    </section>
    </>
  );
}
