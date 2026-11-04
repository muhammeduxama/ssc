import { ArrowRight, CalendarCheck, CalendarPlus, CarFront, ClipboardList, Clock, FileText, MessageSquare, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { DashboardEmpty, DashboardPanel, DashboardRow, DashboardStat } from "@/components/Dashboard";
import { StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { gbp, shortDate } from "@/lib/format";
import { carOf } from "@/lib/portal";

/** Customer home (Laravel dashboard.blade.php tiles + live counts). */
export async function CustomerDashboard({ id, name }: { id: string; name: string }) {
  const me = BigInt(id);
  const [bookings, quotes, followOns, unverified, recent, nextVisit] = await Promise.all([
    db.orders.count({ where: { user_id: me, NOT: { status: "rejected" }, OR: [{ orderassigns: { some: {} } }, { order_for: "inspection and mot" }] } }),
    db.orders.count({ where: { user_id: me, order_for: "repairs", orderassigns: { none: {} }, NOT: { status: "rejected" } } }),
    db.orderquotes.count({ where: { status: "Quotation Sent", orderassigns: { orders: { user_id: me } } } }),
    db.orders.findMany({ where: { user_id: me, status: "pending", orderpayments: { none: {} }, order_for: "inspection and mot" }, select: { id: true, price: true }, orderBy: { id: "desc" } }),
    db.orders.findMany({ where: { user_id: me }, orderBy: { id: "desc" }, take: 5, select: { id: true, status: true, price: true, car_data: true, order_for: true, created_at: true } }),
    db.orderassigns.findFirst({ where: { status: "assigned", start_at: { gte: new Date() }, orders: { user_id: me, NOT: { status: "rejected" } } }, orderBy: { start_at: "asc" }, select: { order_id: true, user_id: true, date: true, time: true, users: { select: { company: true, fname: true, lname: true } }, orders: { select: { car_data: true } } } }),
  ]);
  return <div className="dashboard-page">
    <header className="dashboard-heading">
      <div><p className="dashboard-kicker">Your car care, in one place</p><h1>Welcome back, {name.split(" ")[0]}</h1><p>Appointments, quotes and conversations. All taken care of.</p></div>
      <Link href="/" className="btn btn-primary"><CalendarPlus size={16} /> Book a service</Link>
    </header>
    <section aria-label="Account overview" className="dashboard-stats">
      <DashboardStat href="/portal/orders" label="Bookings" value={bookings} icon={ClipboardList} detail="Your booking history" />
      <DashboardStat href="/portal/quotes" label="Open quotes" value={quotes} icon={FileText} detail="Track your repair requests" />
      <DashboardStat href="/portal/quotes/expired" label="Follow-on quotes" value={followOns} icon={Clock} tone={followOns ? "warn" : "brand"} detail={followOns ? "Ready for your decision" : "Nothing awaiting approval"} />
      <DashboardStat href="/portal/orders" label="Cards needed" value={unverified.length} icon={Wallet} tone={unverified.length ? "warn" : "brand"} detail={unverified.length ? "Finish confirming your bookings" : "You're up to date"} />
    </section>
    <div className="dashboard-columns">
      <section className="dashboard-appointment">
        <span className="dashboard-kicker"><CalendarCheck size={16} /> Your next appointment</span>
        {nextVisit ? <>
          <h2>{carOf(nextVisit.orders.car_data).title}</h2>
          <p className="dashboard-appointment-date">{[nextVisit.date, nextVisit.time].filter(Boolean).join(" · ") || "Your mechanic will confirm a time"}</p>
          <dl><div><dt>Mechanic</dt><dd>{nextVisit.users.company || `${nextVisit.users.fname} ${nextVisit.users.lname}`}</dd></div><div><dt>Booking reference</dt><dd>#{String(nextVisit.order_id)}</dd></div></dl>
          <div className="dashboard-appointment-actions"><Link href={`/portal/orders/${nextVisit.order_id}`} className="btn btn-primary">View appointment <ArrowRight size={15} /></Link><Link href={`/messages?thread=${nextVisit.order_id}:p:${nextVisit.user_id}`} className="btn btn-secondary"><MessageSquare size={15} /> Message mechanic</Link></div>
        </> : <>
          <h2>No upcoming visit scheduled</h2><p>Ready for your next service? Start a booking, or check the progress of an existing request.</p>
          <div className="dashboard-appointment-actions"><Link href="/" className="btn btn-primary">Find a service <ArrowRight size={15} /></Link><Link href="/portal/orders" className="btn btn-secondary">Check bookings</Link></div>
        </>}
      </section>
      <DashboardPanel title="Your next steps" description="A little help keeping things moving.">
        {unverified.length > 0 && unverified.slice(0, 2).map((o) => <DashboardRow key={String(o.id)} title={`Add a card for booking #${o.id}`} description={`Booking total ${gbp(o.price)}. Save a card to confirm your request.`} href={`/get-payment-info/${o.id}`} icon={Wallet} tone="warn" />)}
        {followOns > 0 && <DashboardRow title="Review follow-on quotes" description={`${followOns} quote${followOns === 1 ? "" : "s"} awaiting your approval`} href="/portal/quotes/expired" icon={FileText} tone="warn" />}
        <DashboardRow title="Your conversations" description="Talk to your mechanic or our support team" href="/messages" icon={MessageSquare} />
        <DashboardRow title="Contact details" description="Keep your phone number and address up to date" href="/portal/profile" icon={UserRound} />
      </DashboardPanel>
    </div>
    <DashboardPanel title="Recent bookings & requests" description="Pick up where you left off." href="/portal/orders" action="All bookings">
      {recent.length === 0 ? <DashboardEmpty icon={CarFront} title="Your first booking starts here" description="Tell us about your car and we'll help you find the right service." href="/" action="Get a quote" /> : <ul className="dashboard-booking-list">
        {recent.map((o) => {
          const car = carOf(o.car_data);
          return <li key={String(o.id)}><Link href={`/portal/orders/${o.id}`} className="dashboard-booking-main"><span className="dashboard-row-icon"><CarFront size={20} aria-hidden /></span><span className="min-w-0 flex-1"><strong>{car.title}</strong><span>{car.reg ? `${car.reg} · ` : ""}{o.order_for === "repairs" ? "Repair request" : "Service booking"} · #{String(o.id)}</span></span><StatusBadge status={o.status === "rejected" ? "cancelled" : o.status} /></Link><div className="dashboard-booking-meta"><span>{shortDate(o.created_at)}</span><span>{Number(o.price) > 0 ? gbp(o.price) : "Quote requested"}</span><Link href={`/portal/orders/${o.id}`}>View details <ArrowRight size={13} /></Link></div></li>;
        })}
      </ul>}
    </DashboardPanel>
  </div>;
}
