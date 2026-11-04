import { ArrowRight, CalendarClock, CheckCircle2, CircleX, FileText, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingLayout } from "@/components/booking/BookingLayout";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatTimeSlot } from "@/lib/time";
import { carTitle, gbp, parseCar } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking request" };

export default async function OrderStatus({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const order = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), ...(s.kind === "user" ? { user_id: BigInt(s.id) } : {}) }, include: { orderpayments: { take: 1, select: { id: true } }, ordertracks: { include: { services: { select: { name: true } } } }, timeslots: { take: 3, orderBy: { id: "asc" } } } }) : null;
  if (!order) redirect("/dashboard");
  const quote = order.price == null || Number(order.price) <= 0;
  const ready = quote || order.orderpayments.length > 0;
  const cancelled = order.status === "rejected";
  const car = parseCar(order.car_data);
  const detail = s.kind === "admin" ? `/admin/${quote ? "quotes" : "orders"}/view/${order.id}` : quote ? "/portal/quotes" : `/portal/orders/${order.id}`;
  const next = quote ? [
    { icon: FileText, title: "We review your repair request", text: "Your details help us find suitable mechanics and garages for the work." },
    { icon: Mail, title: "Look out for your quotes", text: "Check your account and email for updates and available estimates." },
    { icon: CheckCircle2, title: "Choose when you're ready", text: "Review the repair details and price before accepting a quote." },
  ] : [
    { icon: ShieldCheck, title: "Your request is with us", text: "We're looking for a suitable mechanic or garage for your booking." },
    { icon: CalendarClock, title: "Your visit will be confirmed", text: "Once accepted, your mechanic will confirm an arrival window from your preferences." },
    { icon: Mail, title: "Everything stays in one place", text: "Follow your booking and keep in touch from your account." },
  ];
  return <BookingLayout step={4} quote={quote} complete={ready} title={cancelled ? "This request has been cancelled" : !ready ? "Your booking needs one final step" : quote ? "Your repair request is in" : "Your booking request is in"} description={cancelled ? "You can review the details from your account or start a new booking." : ready ? "You can follow the progress and any updates from your account." : "Add your card securely before we send your booking to mechanics."}>
    <div className="booking-columns">
      <section className="booking-confirmation"><span className={`booking-success-icon ${!ready || cancelled ? "booking-pending-icon" : ""}`}>{cancelled ? <CircleX size={30}/> : ready ? <CheckCircle2 size={30}/> : <CalendarClock size={30}/>}</span><p className="booking-eyebrow">Reference #{String(order.id)}</p><h2>{carTitle(car)}</h2><p>{quote ? "Repair quote request" : "Service booking"}{car.reg && car.reg !== "UNKNOWN" ? ` · ${car.reg}` : ""}</p>
        {!cancelled && ready && <ol className="booking-next-steps">{next.map((n)=><li key={n.title}><span><n.icon size={19}/></span><div><h3>{n.title}</h3><p>{n.text}</p></div></li>)}</ol>}
        <div className="booking-confirmation-actions">{!ready && !cancelled && <Link href={`/get-payment-info/${order.id}`} className="btn btn-primary">Add card & confirm <ArrowRight size={16}/></Link>}<Link href={detail} className={`btn ${ready || cancelled ? "btn-primary" : "btn-secondary"}`}>View {quote ? "my quotes" : "booking"}<ArrowRight size={16}/></Link><Link href="/dashboard" className="booking-text-link">Back to dashboard</Link></div>
      </section>
      <aside className="booking-summary booking-sidebar p-5"><div className="booking-summary-heading"><h2>Request summary</h2></div><ul className="booking-basket-items">{order.ordertracks.map(t=><li key={String(t.id)}><strong>{t.services.name}</strong></li>)}</ul>{!quote&&<div className="booking-total"><span>Booking total</span><strong>{gbp(order.price)}</strong></div>}{order.timeslots.length>0&&<div className="booking-confirmation-times"><h3>Preferred arrival windows</h3>{order.timeslots.map(t=><p key={String(t.id)}>{t.date} · {formatTimeSlot(t.time)}</p>)}</div>}</aside>
    </div>
  </BookingLayout>;
}
