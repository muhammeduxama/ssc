import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { acceptFollowOn, rejectFollowOn } from "@/app/actions/portal";
import { ActionButton } from "@/components/portal/ActionForm";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { carOf } from "@/lib/portal";

export const metadata: Metadata = { title: "Follow-on quote" };

/** PortalController@viewQuote — a mechanic's follow-on quote with accept / reject. */
export default async function FollowOn({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireCustomer();
  const q = /^\d+$/.test(id)
    ? await db.orderquotes.findFirst({ where: { id: BigInt(id), orderassigns: { orders: { user_id: me.id } } }, include: { orderquotelabours: true, orderquoteparts: true, orderassigns: { include: { orders: { include: { postcodes: { include: { cities: { include: { counties: true } } } } } } } } } })
    : null;
  if (!q) redirect("/portal/quotes/expired");
  const o = q.orderassigns.orders;
  const car = carOf(o.car_data);
  const labour = q.orderquotelabours.reduce((t, l) => t + Number(l.labour_price), 0);
  const parts = q.orderquoteparts.reduce((t, p) => t + Number(p.part_price), 0);
  const open = q.status !== "Quotation Accepted";
  return (
    <>
      <PageHeader eyebrow={`Order #${o.id}`} title="Quotation details">
        {open && (
          <div className="flex gap-2">
            <ActionButton action={acceptFollowOn.bind(null, Number(q.id))} confirmText="Accept this quote?" className="btn btn-primary">Accept quote</ActionButton>
            <ActionButton action={rejectFollowOn.bind(null, Number(q.id))} confirmText="Reject this quote?" className="btn btn-secondary">Reject quote</ActionButton>
          </div>
        )}
      </PageHeader>
      <div className="card max-w-3xl p-6">
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <div><span className="font-mono font-bold uppercase">{car.reg}</span> · {car.line}<br /><span className="text-muted">{[me.house_no, me.street].filter(Boolean).join(", ")} · {o.postcodes.cities.name} · {o.postcodes.postcode}</span></div>
          <div className="text-right"><div className="text-muted">Status</div><div className="font-semibold">{open ? "PENDING" : "ACCEPTED"}</div><div className="text-muted">{q.updated_at?.toISOString().slice(0, 10)}</div></div>
        </div>
        <h2 className="mt-6 font-display text-lg font-semibold">Services</h2>
        <ul className="mt-2 divide-y divide-line text-sm">{q.orderquotelabours.map((l) => <li key={String(l.id)} className="flex justify-between py-2"><span>{l.service_name}</span><span>{gbp(l.labour_price)}</span></li>)}</ul>
        <div className="mt-1 text-right text-sm text-muted">Total labour price {gbp(labour)}</div>
        <h2 className="mt-6 font-display text-lg font-semibold">Parts</h2>
        <ul className="mt-2 divide-y divide-line text-sm">{q.orderquoteparts.map((p) => <li key={String(p.id)} className="flex justify-between py-2"><span>{p.part_name}</span><span>{gbp(p.part_price)}</span></li>)}</ul>
        <div className="mt-1 text-right text-sm text-muted">Total parts price {gbp(parts)}</div>
        <div className="mt-6 flex justify-between border-t border-line pt-4 font-display text-xl font-semibold"><span>Total</span><span>{gbp(q.price)}</span></div>
      </div>
    </>
  );
}
