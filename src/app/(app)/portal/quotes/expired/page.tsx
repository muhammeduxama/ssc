import { ArrowUpRight, FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { acceptFollowOn, rejectFollowOn } from "@/app/actions/portal";
import { ActionButton } from "@/components/portal/ActionForm";
import { ActionsMenu } from "@/components/portal/OrderCard";
import { QuoteCard } from "@/components/portal/QuoteCard";
import { SectionTabs } from "@/components/SectionTabs";
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
  return <>
    <PageHeader eyebrow="Your quotes" title="Expired & follow-on quotes" description="Review additional work and keep track of your older repair requests."><Link href="/" className="btn btn-primary"><FilePlus2 size={16}/> Request a quote</Link></PageHeader>
    <SectionTabs label="Quote view" items={[
      { href: "/portal/quotes", label: "Open quotes", active: false },
      { href: "/portal/quotes?closed=1", label: "Closed quotes", active: false },
      { href: "/portal/quotes/expired", label: "Expired & follow-on", active: true },
    ]}/>
    {!expired.length && !followOns.length && <Empty title="No older or follow-on quotes" body="Additional work from your mechanic and older repair requests will appear here."/>}
    {followOns.length > 0 && <section className="customer-quotes-section">
      <header className="customer-quotes-heading"><div><h2>Additional work to review <span>{followOns.length}</span></h2><p>Check your mechanic’s estimate before approving any extra work.</p></div></header>
      <div className="customer-quotes-grid">{followOns.map(q => {
        const services = [...q.orderquotelabours.map(l => l.service_name), ...q.orderquoteparts.map(p => p.part_name)].filter(Boolean);
        return <QuoteCard key={String(q.id)} reference={`Quote #${q.id}`} href={`/portal/follow-on/${q.id}`} status="pending" car={carOf(q.orderassigns.orders.car_data)} date={q.created_at} amount={Number(q.price)} summary={services.join(" · ") || "Additional work for your vehicle"} details={<ul className="customer-quote-lines">
          {q.orderquotelabours.map(l => <li key={`l${l.id}`}><span>{l.service_name}<small>Labour</small></span><b>{gbp(l.labour_price)}</b></li>)}
          {q.orderquoteparts.map(p => <li key={`p${p.id}`}><span>{p.part_name}<small>Part</small></span><b>{gbp(p.part_price)}</b></li>)}
          <li className="customer-quote-lines-total"><span>Total</span><b>{gbp(q.price)}</b></li>
        </ul>}>
          <Link href={`/portal/follow-on/${q.id}`} className="btn btn-primary">Review quote <ArrowUpRight size={14}/></Link>
          <ActionButton action={acceptFollowOn.bind(null, Number(q.id))} confirmText="Accept this quote?" className="btn btn-secondary">Accept</ActionButton>
          <ActionButton action={rejectFollowOn.bind(null, Number(q.id))} confirmText="Reject this quote?" className="btn btn-ghost customer-quote-reject">Decline</ActionButton>
        </QuoteCard>;
      })}</div>
    </section>}
    {expired.length > 0 && <section className="customer-quotes-section">
      <header className="customer-quotes-heading"><div><h2>Older quote requests <span>{expired.length}</span></h2><p>Requests from more than seven days ago, including those you’ve closed.</p></div></header>
      <div className="customer-quotes-grid">{expired.map(o => <QuoteCard key={String(o.id)} reference={`Request #${o.id}`} href={`/portal/orders/${o.id}`} status={o.status === "rejected" ? "Closed" : o.status} car={carOf(o.car_data)} date={o.created_at} summary={o.notes || o.ordertracks.map(t => t.services.name).join(" · ") || "Repair details not supplied"} menu={<ActionsMenu o={o}/>}>
        <Link href={`/portal/orders/${o.id}`} className="btn btn-primary">View request <ArrowUpRight size={14}/></Link>
        <span className="customer-quote-context">{o.status === "rejected" ? "This request is closed" : "Review your request and next steps"}</span>
      </QuoteCard>)}</div>
    </section>}
  </>;
}
