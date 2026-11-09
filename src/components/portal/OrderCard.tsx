import { ArrowUpRight, CalendarClock, ChevronDown, CreditCard, MapPin, MessageSquare, UserRound, Wrench } from "lucide-react";
import { DropdownMenu } from "@/components/FloatingPanel";
import Link from "next/link";
import { cancelUnverifiedOrder } from "@/app/actions/portal";
import { CarBrandLogo } from "@/components/CarBrandLogo";
import { StatusBadge } from "@/components/ui";
import { gbp } from "@/lib/format";
import { carOf, paid, type CardOrder } from "@/lib/portal";
import { formatTimeSlot } from "@/lib/time";
import { isPast } from "@/lib/site";
import { ActionButton } from "./ActionForm";

export function ActionsMenu({ o }: { o: CardOrder }) {
  const a = o.orderassigns[0];
  const items: [number, string][] = [];
  if (o.status !== "completed" && o.status !== "rejected") {
    items.push([1, "I want to change my booking"], [2, "I want to cancel"]);
    if (a) items.push([3, "Message my mechanic"]);
    if (a?.start_at && isPast(a.start_at)) items.push([4, "My mechanic is late"]);
  }
  items.push([5, "Report a problem"]);
  return <DropdownMenu items={items.map(([n, label]) => ({ href: `/portal/message/${o.id}/${n}`, label }))}/>;
}

export function OrderCard({ o }: { o: CardOrder }) {
  const car = carOf(o.car_data);
  const a = o.orderassigns[0];
  const open = o.status !== "completed" && o.status !== "rejected";
  const card = o.orderpayments[0];
  const isPaid = paid(o);
  const lines = [...o.ordertracks.map((t) => t.services.name), ...(a?.assignlabours.map((l) => l.description ?? "") ?? [])].filter(Boolean);
  const address = [o.users.house_no, o.users.street, o.postcodes.postcode, o.postcodes.cities.name, o.postcodes.cities.counties.name].filter(Boolean).join(", ");
  const mechanic = a ? a.users.company || `${a.users.fname} ${a.users.lname}` : "Finding your mechanic";
  const reg = car.reg && !/^(unknown|no registration|not supplied)$/i.test(car.reg) ? car.reg : null;
  const visit = a?.date ? `${a.date}${a.time ? ` · ${formatTimeSlot(a.time)}` : ""}` : a ? "Arrange a time with your mechanic" : "Awaiting confirmation";
  return (
    <article className="card customer-booking">
      <header className="customer-booking-header">
        <div className="customer-booking-reference"><Link href={`/portal/orders/${o.id}`}>Booking #{String(o.id)}</Link><StatusBadge status={o.status === "rejected" ? "cancelled" : o.status}/></div>
        <ActionsMenu o={o}/>
      </header>
      <div className="customer-booking-overview">
        <div className="customer-booking-vehicle"><CarBrandLogo make={car.make}/><div className="min-w-0"><Link href={`/portal/orders/${o.id}`} className="customer-booking-title">{car.title}</Link><p className="customer-booking-specs">{[car.year, car.engine && `${car.engine}L`, car.fuel].filter(Boolean).join(" · ")}{reg && <span className="registration-plate">{reg}</span>}</p><p className="customer-booking-services" title={lines.join(", ")}>{lines.join(" · ") || "Service details pending"}</p></div></div>
        <div className="customer-booking-total"><span>Booking total</span><strong>{gbp(o.price)}</strong><span className={isPaid ? "text-ok" : open && !card ? "text-warn" : "text-muted"}>{isPaid ? "Payment received" : card ? "Card saved" : open ? "Card details needed" : "No payment recorded"}</span></div>
      </div>
      <dl className="customer-booking-facts">
        <Fact label="Location" icon={<MapPin size={16}/>}><span title={address}>{[o.postcodes.cities.name, o.postcodes.postcode].filter(Boolean).join(" · ")}</span></Fact>
        <Fact label="Appointment" icon={<CalendarClock size={16}/>}>{visit}</Fact>
        <Fact label="Mechanic" icon={<Wrench size={16}/>}>{mechanic}</Fact>
      </dl>
      {open && !card && <div className="customer-booking-notice"><CreditCard size={16}/><p>Add your card details to confirm this booking.</p><Link href={`/get-payment-info/${o.id}`}>Add card <ArrowUpRight size={13}/></Link></div>}
      <footer className="customer-booking-footer">
        <Link href={`/portal/orders/${o.id}`} className="btn btn-primary">View booking <ArrowUpRight size={15}/></Link>
        {a && <Link href={`/messages?thread=${o.id}:p:${a.user_id}`} className="btn btn-secondary"><MessageSquare size={15}/> Message mechanic</Link>}
        {open && <Link href={`/get-payment-info/${o.id}`} className="customer-booking-card-link"><CreditCard size={15}/>{card ? "Change card" : "Add card"}</Link>}
      </footer>
      <details className="customer-booking-more">
        <summary>Booking details <ChevronDown size={14}/></summary>
        <div className="customer-booking-extra"><dl>
          <Fact label="Full address" icon={<MapPin size={16}/>}>{address || "Address not provided"}</Fact>
          <Fact label="Contact details" icon={<UserRound size={16}/>}><span>{o.users.fname} {o.users.lname}</span><span>{o.users.email}</span><span>{o.users.phone}</span><Link href="/portal/profile">Edit contact details</Link></Fact>
          <Fact label="Payment" icon={<CreditCard size={16}/>}><span>{isPaid ? "Paid" : "Not paid"}</span><span>Amount paid: {gbp(isPaid ? card?.total_payment : 0)}</span></Fact>
        </dl><div className="customer-booking-work"><h3>Work required</h3><ul>{lines.length ? lines.map((line, i) => <li key={i}>{line}</li>) : <li>Service details pending</li>}</ul></div>
        {open && !card && <ActionButton action={cancelUnverifiedOrder.bind(null, Number(o.id))} confirmText="Cancel this order?" className="customer-booking-cancel">Cancel booking</ActionButton>}
        </div>
      </details>
    </article>
  );
}

function Fact({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="customer-booking-fact"><dt><span className="customer-booking-fact-icon" aria-hidden>{icon}</span>{label}</dt><dd>{children}</dd></div>;
}
