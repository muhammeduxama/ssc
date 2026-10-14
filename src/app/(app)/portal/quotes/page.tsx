import { FileText, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { currentCustomer } from "@/lib/customer";
import { carOf, loadCardOrders } from "@/lib/portal";

export const metadata: Metadata = { title: "My quotes" };

/** PortalController@quotes / @quotesClosed */
export default async function PortalQuotes({ searchParams }: { searchParams: Promise<{ closed?: string }> }) {
  const closed = !!(await searchParams).closed;
  const me = (await currentCustomer())!;
  const rows = (await loadCardOrders({ user_id: me.id, order_for: "repairs", ...(closed ? { status: "rejected" } : { NOT: { status: "rejected" } }) })).filter((o) => !o.orderassigns.length);
  const tabs: [string, string, boolean][] = [["/portal/quotes", "Open", !closed], ["/portal/quotes?closed=1", "Closed", closed], ["/portal/quotes/expired", "Expired & follow-on", false]];
  return (
    <>
      <PageHeader eyebrow={`${rows.length} quotes`} title={closed ? "Closed quotes" : "All quotes"} />
      <nav className="mb-5 flex gap-1 rounded-lg border border-line bg-raised p-1 sm:w-fit">
        {tabs.map(([href, label, on]) => <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`rounded-md px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken"}`}>{label}</Link>)}
      </nav>
      {!rows.length && <Empty title="You don't have any quote to show" body="Ask for a repair quote from the home page." />}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((o) => {
          const car = carOf(o.car_data);
          return (
            <article key={String(o.id)} className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">QUOTE #{String(o.id)}</span>
                <StatusBadge status={o.status === "rejected" ? "closed" : o.status} />
              </div>
              <div className="mt-3 font-mono text-sm font-bold uppercase">{car.reg}</div>
              <div className="text-sm text-muted">{[car.make, car.model, car.fuel, car.engine, car.year].filter(Boolean).join(" | ")}</div>
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">{o.ordertracks.map((t) => <span key={String(t.id)} className="pill">{t.services.name}</span>)}</div>
              {o.notes && <p className="mt-2 line-clamp-2 text-sm text-muted">{o.notes}</p>}
              {o.status !== "rejected" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.adminquotes[0] && ["Sent", "sent"].includes(o.adminquotes[0].status) && <Link href={`/portal/quotes/${o.id}/book`} className="btn btn-primary !py-1.5"><FileText size={14} /> View received quote</Link>}
                  <Link href={`/portal/orders/${o.id}`} className="btn btn-secondary !py-1.5">Mechanic quotes</Link>
                  {o.quotechats.length > 0 && <Link href={`/portal/quotes/${o.id}/chat`} className="btn btn-secondary !py-1.5"><MessageSquare size={14} /> Messages</Link>}
                  <Link href={`/portal/quotes/${o.id}/close`} className="btn btn-ghost !py-1.5 text-danger">Change or close</Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
