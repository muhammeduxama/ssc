import { ChevronDown, CreditCard, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cancelUnverifiedOrder } from "@/app/actions/portal";
import { StatusBadge } from "@/components/ui";
import { gbp } from "@/lib/format";
import { carOf, paid, type CardOrder } from "@/lib/portal";
import { isPast } from "@/lib/site";
import { ActionButton } from "./ActionForm";

export function ActionsMenu({ o }: { o: CardOrder }) {
  const a = o.orderassigns[0];
  const items: [number, string][] = [];
  if (o.status !== "completed") {
    items.push([1, "I want to change my booking"], [2, "I want to cancel"]);
    if (a) items.push([3, "Message my mechanic"]);
    if (a?.start_at && isPast(a.start_at)) items.push([4, "My mechanic is late"]);
  }
  items.push([5, "Report a problem"]);
  return (
    <details className="relative">
      <summary className="btn btn-secondary cursor-pointer list-none !py-1.5">Actions <ChevronDown size={14} /></summary>
      <ul className="absolute right-0 z-20 mt-1 w-60 rounded-lg border border-line bg-raised p-1 shadow-card">
        {items.map(([n, label]) => (
          <li key={n}><Link href={`/portal/message/${o.id}/${n}`} className="block rounded-md px-3 py-2 text-sm hover:bg-sunken">{label}</Link></li>
        ))}
      </ul>
    </details>
  );
}

export function OrderCard({ o }: { o: CardOrder }) {
  const car = carOf(o.car_data);
  const a = o.orderassigns[0];
  const open = o.status !== "completed" && o.status !== "rejected";
  const card = o.orderpayments[0];
  const lines = [...o.ordertracks.map((t) => t.services.name), ...(a?.assignlabours.map((l) => l.description ?? "") ?? [])].filter(Boolean);
  return (
    <article className="card overflow-visible">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold">ORD #{String(o.id)}</span>
          <StatusBadge status={o.status === "rejected" ? "cancelled" : o.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {open && (
            <Link href={`/get-payment-info/${o.id}`} className="btn btn-secondary !py-1.5"><CreditCard size={14} /> {card ? "Change my card" : "Update card"} {gbp(o.price)}</Link>
          )}
          {a && <Link href={`/messages?thread=${o.id}:p:${a.user_id}`} className="btn btn-secondary !py-1.5" aria-label="Chat with my mechanic"><MessageSquare size={14} /></Link>}
          <Link href={`/portal/orders/${o.id}`} className="btn btn-secondary !py-1.5" aria-label="View booking"><Eye size={14} /></Link>
          <ActionsMenu o={o} />
        </div>
      </header>
      {open && !card && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warn-soft px-5 py-3 text-sm">
          <span><b>Unverified order!</b> You need to update your payment information to place this order.</span>
          <span className="flex gap-2">
            <Link href={`/get-payment-info/${o.id}`} className="font-semibold text-brand underline">Update now?</Link>
            <ActionButton action={cancelUnverifiedOrder.bind(null, Number(o.id))} confirmText="Cancel this order?" className="font-semibold text-danger underline">Cancel this order?</ActionButton>
          </span>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Item k="Vehicle"><span className="font-mono uppercase">{car.reg}</span> · {car.line}</Item>
        <Item k="Work location">{[o.users.house_no, o.users.street].filter(Boolean).join(", ")}<br />{[o.postcodes.postcode, o.postcodes.cities.name, o.postcodes.cities.counties.name].join(", ")}</Item>
        <Item k="Schedule">{a?.date ? `${a.date} ${a.time ?? ""}` : a ? "Collaborate with your mechanic for arrival schedule" : "Not yet accepted by mechanic"}</Item>
        <Item k="Contact">{o.users.fname} {o.users.lname}<br />{o.users.email}<br />{o.users.phone} <Link href="/portal/profile" className="text-brand underline">Edit</Link></Item>
        <Item k="Payment"><span className={paid(o) ? "text-ok" : "text-danger"}>{paid(o) ? "Paid" : "Not paid"}</span></Item>
        {a && <Item k="Mechanic">{a.users.company || `${a.users.fname} ${a.users.lname}`}</Item>}
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Work required</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">{lines.map((l, i) => <span key={i} className="pill">{l}</span>)}</dd>
        </div>
      </dl>
      <footer className="flex justify-between border-t border-line px-5 py-3 text-sm">
        <span>Paid amount <b>{gbp(o.status === "completed" ? o.orderpayments[0]?.total_payment : 0)}</b></span>
        <span>Total <b className="font-display text-lg">{gbp(o.price)}</b></span>
      </footer>
    </article>
  );
}

function Item({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
