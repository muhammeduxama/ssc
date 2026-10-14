import { CalendarPlus, ClipboardList, Clock, FileText, KeyRound, MessageSquare, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { Kpi, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { gbp, shortDate } from "@/lib/format";
import { carOf } from "@/lib/portal";

/** Customer home (Laravel dashboard.blade.php tiles + live counts). */
export async function CustomerDashboard({ id, name }: { id: string; name: string }) {
  const me = BigInt(id);
  const [bookings, quotes, followOns, unverified, recent] = await Promise.all([
    db.orders.count({ where: { user_id: me, NOT: { status: "rejected" }, OR: [{ orderassigns: { some: {} } }, { order_for: "inspection and mot" }] } }),
    db.orders.count({ where: { user_id: me, order_for: "repairs", orderassigns: { none: {} }, NOT: { status: "rejected" } } }),
    db.orderquotes.count({ where: { status: "Quotation Sent", orderassigns: { orders: { user_id: me } } } }),
    db.orders.findMany({ where: { user_id: me, status: "pending", orderpayments: { none: {} }, order_for: "inspection and mot" }, select: { id: true, price: true }, orderBy: { id: "desc" } }),
    db.orders.findMany({ where: { user_id: me }, orderBy: { id: "desc" }, take: 5, select: { id: true, status: true, price: true, car_data: true, order_for: true, created_at: true } }),
  ]);
  const tiles = [
    { href: "/", label: "Place a new order", icon: CalendarPlus },
    { href: "/portal/orders", label: "Orders", icon: ClipboardList },
    { href: "/portal/quotes", label: "Quotes", icon: FileText },
    { href: "/portal/quotes/expired", label: "Expired quotes", icon: Clock },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/portal/profile", label: "Edit profile", icon: UserRound },
    { href: "/portal/password", label: "Change password", icon: KeyRound },
  ];
  return (
    <>
      <PageHeader eyebrow="Your account" title={`Welcome back, ${name.split(" ")[0]}`}>
        <Link href="/" className="btn btn-primary"><CalendarPlus size={16} /> New booking</Link>
      </PageHeader>
      {unverified.length > 0 && (
        <div className="mb-6 rounded-xl border border-warn bg-warn-soft p-4 text-sm">
          <b>{unverified.length} booking{unverified.length > 1 ? "s need" : " needs"} a card.</b> We can&apos;t send your booking to mechanics until a card is saved (you&apos;re only charged after the work is done).{" "}
          {unverified.slice(0, 3).map((o) => <Link key={String(o.id)} href={`/get-payment-info/${o.id}`} className="ml-2 font-semibold text-brand underline">Add card for #{String(o.id)} ({gbp(o.price)})</Link>)}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Bookings" value={bookings} icon={ClipboardList} />
        <Kpi label="Open quotes" value={quotes} icon={FileText} />
        <Kpi label="Follow-on quotes" value={followOns} icon={Clock} tone="accent" hint={followOns ? "Waiting for your answer" : undefined} />
        <Kpi label="Cards needed" value={unverified.length} icon={Wallet} tone={unverified.length ? "danger" : "brand"} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-display font-semibold">Recent activity</h2>
          {recent.length === 0 && <p className="p-5 text-sm text-muted">Nothing yet — book a service or ask for a repair quote.</p>}
          <ul className="divide-y divide-line">
            {recent.map((o) => {
              const car = carOf(o.car_data);
              return (
                <li key={String(o.id)}>
                  <Link href={`/portal/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sunken">
                    <div>
                      <div className="text-sm font-semibold">#{String(o.id)} · {car.title} <span className="font-mono text-xs uppercase text-muted">{car.reg}</span></div>
                      <div className="text-xs text-muted">{o.order_for === "repairs" ? "Repair quote" : "Service booking"} · {shortDate(o.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-3">{Number(o.price) > 0 && <span className="text-sm font-medium">{gbp(o.price)}</span>}<StatusBadge status={o.status === "rejected" ? "cancelled" : o.status} /></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="grid grid-cols-2 gap-3 self-start">
          {tiles.map((t) => (
            <Link key={t.href} href={t.href} className="card flex flex-col items-center gap-2 p-5 text-center text-sm font-medium transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
              <t.icon size={22} className="text-brand" /> {t.label}
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
