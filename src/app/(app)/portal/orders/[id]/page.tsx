import { CarBrandLogo } from "@/components/CarBrandLogo";
import { formatTimeSlot } from "@/lib/time";
import { Wallet, CalendarClock, Wrench, CreditCard } from "lucide-react";
import { DetailPage, DetailHeader, DetailMetrics, DetailSection } from "@/components/DetailPage";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MechanicQuotes } from "@/components/portal/MechanicQuotes";
import { ActionsMenu } from "@/components/portal/OrderCard";
import { StatusBadge } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { carOf, orderCardInclude, paid } from "@/lib/portal";

export const metadata: Metadata = { title: "Booking" };

/** PortalController@viewOrder */
export default async function PortalOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireCustomer();
  const o = /^\d+$/.test(id)
    ? await db.orders.findFirst({
        where: { id: BigInt(id), user_id: me.id },
        include: { ...orderCardInclude, ordertracks: { include: { services: { select: { name: true } } } }, timeslots: { orderBy: { id: "asc" } }, orderrequests: { include: { users: true, orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } } } } },
      })
    : null;
  if (!o) redirect("/portal/orders");
  const car = carOf(o.car_data);
  const a = o.orderassigns[0];
  const isQuote = !a && o.order_for === "repairs";
  const servicesTotal = o.ordertracks.reduce((t, x) => t + Number(x.price), 0) + (a?.assignlabours.reduce((t, l) => t + Number(l.labour), 0) ?? 0);
  const partsTotal = a?.assignparts.reduce((t, p) => t + Number(p.price), 0) ?? 0;
  return (
    <DetailPage>
      <DetailHeader eyebrow={isQuote ? "Quote" : "Order"} title={car.title} description={`Booking #${o.id} · Review your services, visit details and payment.`} back={{ href: "/portal/orders", label: "All bookings" }}>
        <div className="flex gap-2"><StatusBadge status={o.status === "rejected" ? "cancelled" : o.status} /><ActionsMenu o={o} /></div>
      </DetailHeader>
      <DetailMetrics items={[
        { label: "Booking total", value: isQuote ? "Awaiting quote" : gbp(o.price), icon: Wallet },
        { label: "Visit", value: a?.date ? `${a.date} ${a.time || ""}` : "Awaiting confirmation", icon: CalendarClock },
        { label: "Mechanic", value: a ? a.users.company || `${a.users.fname} ${a.users.lname}` : "Not assigned yet", icon: Wrench },
        { label: "Payment", value: paid(o) ? "Paid" : "Not paid", icon: CreditCard },
      ]}/>
      <div className="detail-columns">
        <div className="space-y-6">
          <DetailSection title="Vehicle & location">
            <div className="mb-3"><CarBrandLogo make={car.make}/></div><div className="detail-registration">{car.reg}</div>
            <p className="mt-2 font-display text-lg font-semibold">{car.line}</p>
            <p className="mt-2 text-sm text-muted">{[me.house_no, me.street].filter(Boolean).join(", ")} · {o.postcodes.cities.name} · {o.postcodes.cities.counties.name} · {o.postcodes.postcode}</p>
          </DetailSection>
          <DetailSection title="Work required" description="Your selected services and any additional parts.">
            <ul className="mt-3 divide-y divide-line text-sm">
              {o.ordertracks.map((t) => <li key={String(t.id)} className="detail-price-row"><span>{t.services.name}</span>{Number(t.price) > 0 && <span>{gbp(t.price)}</span>}</li>)}
              {a?.assignlabours.map((l) => <li key={`l${l.id}`} className="detail-price-row"><span>{l.description}</span><span>{gbp(l.labour)}</span></li>)}
            </ul>
            {a && a.assignparts.length > 0 && (
              <>
                <h3 className="mt-4 font-display font-semibold">Parts</h3>
                <ul className="mt-2 divide-y divide-line text-sm">{a.assignparts.map((p) => <li key={String(p.id)} className="detail-price-row"><span>{p.description}</span><span>{gbp(p.price)}</span></li>)}</ul>
              </>
            )}
            <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm"><span>Services {gbp(servicesTotal)}{partsTotal ? ` · parts ${gbp(partsTotal)}` : ""}</span><span className="font-semibold">Total {gbp(o.price)}</span></div>
          </DetailSection>
          {isQuote && o.status === "pending" && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">Quotes from mechanics</h2>
              <MechanicQuotes orderId={o.id} requests={o.orderrequests} at={o.postcodes} />
            </section>
          )}
        </div>
        <aside className="card detail-summary">
          <h2 className="detail-summary-title">Booking details</h2>
          <Row k="Status"><StatusBadge status={o.status === "rejected" ? "cancelled" : o.status}/></Row>
          <Row k="Payment"><span className={paid(o) ? "text-ok" : "text-danger"}>{paid(o) ? "Success" : "Not paid"}</span></Row>
          {a?.date && <Row k="Selected date">{a.date} {a.time}</Row>}
          {a && <Row k="Mechanic">{a.users.company || `${a.users.fname} ${a.users.lname}`}</Row>}
          {o.timeslots.length > 0 && !a?.date && <Row k="Your availability">{o.timeslots.map((t) => `${t.date} · ${formatTimeSlot(t.time)}`).join(" · ")}</Row>}
          <Row k="Paid amount">{gbp(o.status === "completed" ? o.orderpayments[0]?.total_payment : 0)}</Row>
          {o.status !== "completed" && o.status !== "rejected" && <Link href={`/get-payment-info/${o.id}`} className="btn btn-secondary w-full">{o.orderpayments.length ? "Change my card" : "Add card"}</Link>}
          {o.quotechats.length > 0 && <Link href={`/portal/quotes/${o.id}/chat`} className="btn btn-secondary w-full">Messages with SSC</Link>}
        </aside>
      </div>
    </DetailPage>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="detail-summary-row"><div className="detail-row-label">{k}</div><div className="font-medium">{children}</div></div>;
}
