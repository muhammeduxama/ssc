import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SaveOrderCard } from "@/components/booking/SaveOrderCard";
import { Steps } from "@/components/booking/Steps";
import { setupIntentFor } from "@/lib/booking/setup";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp, parseCar, carTitle } from "@/lib/format";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment details" };

/** PaymentController@getPaymentInfo */
export default async function PaymentInfo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentCustomer();
  if (!me) redirect(`/login?next=/get-payment-info/${id}`);
  const order = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), user_id: me.id }, include: { ordertracks: { include: { services: { select: { name: true } } } }, timeslots: true, orderpayments: { take: 1 } } }) : null;
  if (!order) redirect("/dashboard");
  const setup = await setupIntentFor(me);
  const car = parseCar(order.car_data);
  return (
    <>
    <PageHead top={<Steps at={4} />} eyebrow="Payment details" title="Secure your booking">We won&apos;t take a penny from you until the mechanic / garage has completed the work. Your card is stored securely by Stripe.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-6">
          {order.orderpayments.length > 0 && <p className="mb-4 rounded-lg bg-ok-soft px-3 py-2 text-sm">A card is already saved for this booking. Saving a new card replaces it.</p>}
          {setup ? (
            <SaveOrderCard orderId={Number(order.id)} publishableKey={setup.publishable} clientSecret={setup.clientSecret} name={`${me.fname} ${me.lname}`} />
          ) : (
            <p className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">Card payments are unavailable right now. Please try again shortly or contact info@smartservicingcentre.co.uk.</p>
          )}
        </div>
        <aside className="card space-y-3 p-5 lg:self-start">
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Booking #{String(order.id)}</div>
          <div className="font-display text-lg font-semibold">{carTitle(car)} <span className="font-mono text-sm uppercase">{car.reg}</span></div>
          <ul className="space-y-1 text-sm">{order.ordertracks.map((t) => <li key={String(t.id)} className="flex justify-between gap-2"><span>{t.services.name}</span><span>{gbp(t.price)}</span></li>)}</ul>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>Total</span><span>{gbp(order.price)}</span></div>
          <div className="text-xs text-muted">{order.timeslots.length} time slot{order.timeslots.length === 1 ? "" : "s"} selected</div>
        </aside>
      </div>
    </section>
    </>
  );
}
