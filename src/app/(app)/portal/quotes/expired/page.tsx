import type { Metadata } from "next";
import Link from "next/link";
import { acceptFollowOn, rejectFollowOn } from "@/app/actions/portal";
import { ActionButton } from "@/components/portal/ActionForm";
import { ActionsMenu } from "@/components/portal/OrderCard";
import { Empty, PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { carOf, loadCardOrders } from "@/lib/portal";
import { daysAgo } from "@/lib/site";

export const metadata: Metadata = { title: "Expired & follow-on quotes" };

/** PortalController@expiredQuotes — requests older than 7 days plus mechanics' follow-on quotes. */
export default async function ExpiredQuotes() {
  const me = await requireCustomer();
  const weekAgo = daysAgo(7);
  const [expired, followOns] = await Promise.all([
    loadCardOrders({ user_id: me.id, orderassigns: { none: {} }, orderrequests: { some: {} }, created_at: { lt: weekAgo } }),
    db.orderquotes.findMany({ where: { status: "Quotation Sent", orderassigns: { orders: { user_id: me.id } } }, orderBy: { id: "desc" }, include: { orderquotelabours: true, orderquoteparts: true, orderassigns: { include: { orders: true } } } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Quotes" title="Expired & follow-on quotes" />
      {!expired.length && !followOns.length && <Empty title="You don't have any expired quotes." />}
      {followOns.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold">Follow-on quotes from your mechanic</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {followOns.map((q) => {
              const car = carOf(q.orderassigns.orders.car_data);
              return (
                <article key={String(q.id)} className="card p-5">
                  <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">QUOTE #{String(q.id)}</span><span className="font-display text-xl font-semibold">{gbp(q.price)}</span></div>
                  <div className="mt-1 text-sm text-muted"><span className="font-mono uppercase">{car.reg}</span> · {car.line}</div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {q.orderquotelabours.map((l) => <li key={`l${l.id}`} className="flex justify-between"><span>{l.service_name}</span><span>{gbp(l.labour_price)}</span></li>)}
                    {q.orderquoteparts.map((p) => <li key={`p${p.id}`} className="flex justify-between text-muted"><span>{p.part_name}</span><span>{gbp(p.part_price)}</span></li>)}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/portal/follow-on/${q.id}`} className="btn btn-secondary">View</Link>
                    <ActionButton action={acceptFollowOn.bind(null, Number(q.id))} confirmText="Accept this quote?" className="btn btn-primary">Accept</ActionButton>
                    <ActionButton action={rejectFollowOn.bind(null, Number(q.id))} confirmText="Reject this quote?" className="btn btn-ghost text-danger">Reject</ActionButton>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {expired.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Expired quote requests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {expired.map((o) => {
              const car = carOf(o.car_data);
              return (
                <article key={String(o.id)} className="card overflow-visible p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">Quote #{String(o.id)} <span className="font-normal text-muted">({o.created_at?.toISOString().slice(0, 10)})</span></span>
                    <ActionsMenu o={o} />
                  </div>
                  <p className="mt-1 text-sm text-ok">Quote is delivered to mechanics</p>
                  <div className="mt-2 text-sm"><span className="font-mono uppercase">{car.reg}</span> · {car.line}</div>
                  <div className="mt-1 text-sm text-muted">Status: {o.status === "rejected" ? "CLOSED" : o.status.toUpperCase()}</div>
                  <Link href={`/portal/orders/${o.id}`} className="btn btn-secondary mt-4">View</Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
