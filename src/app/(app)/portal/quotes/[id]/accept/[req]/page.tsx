import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { scheduleMechanicQuote } from "@/app/actions/portal";
import { ScheduleForm } from "@/components/booking/ScheduleForm";
import { SaveQuoteCard } from "@/components/portal/SaveQuoteCard";
import { PageHeader } from "@/components/ui";
import { setupIntentFor } from "@/lib/booking/setup";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";

export const metadata: Metadata = { title: "Book this mechanic" };

/** PaymentController@acceptMechanicQuotation — choose availability (if none yet), then save a card. */
export default async function AcceptMechanicQuote({ params }: { params: Promise<{ id: string; req: string }> }) {
  const { id, req } = await params;
  const me = await requireCustomer();
  if (!/^\d+$/.test(id) || !/^\d+$/.test(req)) redirect("/portal/quotes");
  const o = await db.orders.findFirst({ where: { id: BigInt(id), user_id: me.id }, include: { timeslots: true, orderassigns: { take: 1 } } });
  const r = o ? await db.orderrequests.findFirst({ where: { id: BigInt(req), order_id: o.id }, include: { users: true, orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } } } }) : null;
  const q = r?.orderrequestquotes[0];
  if (!o || !r || !q) redirect("/portal/quotes");
  if (o.orderassigns.length) redirect(`/portal/orders/${o.id}`);
  const setup = o.timeslots.length ? await setupIntentFor(me) : null;
  return (
    <>
      <PageHeader eyebrow={`Quote #${o.id}`} title={`Book ${r.users.company || `${r.users.fname} ${r.users.lname}`}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {!o.timeslots.length ? (
          <ScheduleForm action={scheduleMechanicQuote.bind(null, Number(o.id), `/portal/quotes/${o.id}/accept/${r.id}`)} address={{ house: me.house_no ?? "", street: me.street ?? "", city: me.city ?? "" }} />
        ) : (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold">Secure your booking</h2>
            <p className="mb-5 mt-1 text-sm text-muted">You will be charged by your mechanic after the work is complete.</p>
            {setup ? <SaveQuoteCard orderId={Number(o.id)} requestId={Number(r.id)} publishableKey={setup.publishable} clientSecret={setup.clientSecret} name={`${me.fname} ${me.lname}`} /> : <p className="text-danger">Card payments are unavailable right now.</p>}
          </div>
        )}
        <aside className="card space-y-3 p-5 lg:self-start">
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Quote</div>
          <ul className="space-y-1 text-sm">
            {q.orderrequestquotelabours.map((l) => <li key={`l${l.id}`} className="flex justify-between gap-2"><span>{l.name}</span><span>{gbp(l.price)}</span></li>)}
            {q.orderrequestquoteparts.map((p) => <li key={`p${p.id}`} className="flex justify-between gap-2 text-muted"><span>{p.name}</span><span>{gbp(p.price)}</span></li>)}
          </ul>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>Total</span><span>{gbp(q.price)}</span></div>
        </aside>
      </div>
    </>
  );
}
