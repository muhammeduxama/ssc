import { CalendarPlus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/portal/OrderCard";
import { SectionTabs } from "@/components/SectionTabs";
import { Empty, PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { carOf, loadCardOrders } from "@/lib/portal";

export const metadata: Metadata = { title: "My bookings" };

export default async function PortalOrders({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const me = await requireCustomer();
  const { view: requested, q } = await searchParams;
  const view = ["active", "completed", "cancelled"].includes(requested ?? "") ? requested! : "all";
  const term = q?.trim().toLowerCase();
  const orders = (await loadCardOrders({ user_id: me.id })).filter((o) => (o.orderassigns.length || o.order_for === "inspection and mot") && (view === "all" || (view === "active" ? !["rejected", "completed"].includes(o.status) : o.status === (view === "cancelled" ? "rejected" : "completed"))) && (!term || `${o.id} ${carOf(o.car_data).title} ${carOf(o.car_data).reg}`.toLowerCase().includes(term)));
  return <>
    <PageHeader eyebrow="Your account" title="My bookings" description="Follow each booking from your first request to the completed work."><Link href="/" className="btn btn-primary"><CalendarPlus size={16} /> New booking</Link></PageHeader>
    <SectionTabs label="Booking view" items={[["all","All bookings"],["active","Active"],["completed","Completed"],["cancelled","Cancelled"]].map(([key,label]) => ({ href:`/portal/orders?view=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`,label,active:view===key }))} />
    <div className="section-toolbar"><p><strong>{orders.length}</strong> booking{orders.length===1?"":"s"}</p><form className="section-search"><input type="hidden" name="view" value={view}/><Search size={16}/><input type="search" name="q" defaultValue={q} placeholder="Registration or booking number" aria-label="Search my bookings"/><button type="submit">Search</button></form>{q&&<Link href={`/portal/orders?view=${view}`} className="section-clear">Clear search</Link>}</div>
    {orders.length ? <div className="space-y-4">{orders.map((o) => <OrderCard key={String(o.id)} o={o} />)}</div> : <Empty title="No bookings in this view" body={q ? "Try another registration or booking number." : "Your bookings will appear here once you request a service."} />}
  </>;
}
