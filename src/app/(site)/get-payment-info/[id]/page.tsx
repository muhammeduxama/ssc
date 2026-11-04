import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SaveOrderCard } from "@/components/booking/SaveOrderCard";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { BookingLayout } from "@/components/booking/BookingLayout";
import { setupIntentFor } from "@/lib/booking/setup";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp, parseCar, carTitle } from "@/lib/format";

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
    <BookingLayout step={4} title={order.orderpayments.length ? "Update your payment details" : "The final step: confirm your booking"} description={order.orderpayments.length ? "Replace the saved card for this booking. Your booking details stay the same." : "Add a card securely to submit your request. Your card is saved for payment after the work is completed."}>
      <div className="booking-columns">
        <section className="booking-payment-panel"><span className="booking-payment-icon"><LockKeyhole size={24}/></span><h2>Secure payment details</h2><p>Saving your card lets us confirm your request with a suitable mechanic.</p>
          {order.orderpayments.length > 0 && <p className="mb-4 rounded-lg bg-ok-soft px-3 py-2 text-sm">A card is already saved for this booking. Saving a new card replaces it.</p>}
          {setup ? (
            <SaveOrderCard updating={order.orderpayments.length > 0} orderId={Number(order.id)} publishableKey={setup.publishable} clientSecret={setup.clientSecret} name={`${me.fname} ${me.lname}`} />
          ) : (
            <p className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">Card payments are unavailable right now. Please try again shortly or contact info@smartservicingcentre.co.uk.</p>
          )}
        </section>
        <aside className="booking-summary booking-sidebar space-y-4 p-5">
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Booking #{String(order.id)}</div>
          <div className="font-display text-lg font-semibold">{carTitle(car)} <span className="font-mono text-sm uppercase">{car.reg}</span></div>
          <ul className="space-y-1 text-sm">{order.ordertracks.map((t) => <li key={String(t.id)} className="flex justify-between gap-2"><span>{t.services.name}</span><span>{gbp(t.price)}</span></li>)}</ul>
          <div className="booking-total"><span>Booking total</span><strong>{gbp(order.price)}</strong></div><p className="booking-summary-note"><ShieldCheck size={15}/>Card details are handled securely by Stripe.</p>
          <div className="text-xs text-muted">{order.timeslots.length} time slot{order.timeslots.length === 1 ? "" : "s"} selected</div>
        </aside>
      </div>
    </BookingLayout>
  );
}
