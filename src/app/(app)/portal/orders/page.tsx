import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/portal/OrderCard";
import { Empty, PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { loadCardOrders } from "@/lib/portal";

export const metadata: Metadata = { title: "My bookings" };

/** PortalController@orders — bookings (assigned, or service/MOT orders), not cancelled. */
export default async function PortalOrders() {
  const me = await requireCustomer();
  const orders = (await loadCardOrders({ user_id: me.id, NOT: { status: "rejected" } })).filter((o) => o.orderassigns.length || o.order_for === "inspection and mot");
  return (
    <>
      <PageHeader eyebrow={`${orders.length} bookings`} title="My bookings">
        <Link href="/" className="btn btn-primary"><CalendarPlus size={16} /> New booking</Link>
      </PageHeader>
      {orders.length ? <div className="space-y-4">{orders.map((o) => <OrderCard key={String(o.id)} o={o} />)}</div> : <Empty title="No bookings yet" body="Book a service or repair from the home page." />}
    </>
  );
}
