import { CreditCard, Eye, MessageSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/DataTable";
import { Empty, StatusBadge } from "@/components/ui";
import type { listAdminOrders } from "@/lib/admin/orders";
import { dateTime } from "@/lib/format";

type Orders = Awaited<ReturnType<typeof listAdminOrders>>;

export function OrdersTable({ rows, variant = "full" }: { rows: Orders; variant?: "full" | "queue" }) {
  if (!rows.length) return <Empty title="No bookings to show" body="New bookings will appear here when customers request a service." />;
  const queue = variant === "queue";
  return <div className={`orders-list ${queue ? "orders-queue" : ""}`}><DataTable density="compact" caption={queue ? "Booking queue" : "Bookings"} columns={queue ? [
    { key: "booking", label: "Booking & customer", primary: true }, { key: "work", label: "Service" }, { key: "progress", label: "Status" },
  ] : [
    { key: "booking", label: "Booking", primary: true }, { key: "customer", label: "Customer" },
    { key: "work", label: "Work & location" }, { key: "progress", label: "Progress" }, { key: "created", label: "Created" },
  ]} rows={rows.map((o) => ({ id: o.id, cells: {
    booking: queue ? <div className="queue-booking"><Link href={`/admin/orders/view/${o.id}`} className="queue-booking-title"><span>#{o.id}</span><strong>{o.customer}</strong></Link><span className="record-subtitle">{o.reg || "Not supplied"} · {o.postcode}</span></div> : <div className="record-booking"><Link href={`/admin/orders/view/${o.id}`} className="record-title">#{o.id}</Link><span className="registration-plate">{o.reg || "Not supplied"}</span></div>,
    customer: <span className="font-medium">{o.customer}</span>,
    work: <div><p className="record-work" title={o.work.join(", ")}>{o.work.join(", ") || "Details pending"}</p>{!queue && <p className="record-subtitle">{[o.city, o.postcode].filter(Boolean).join(" · ")}</p>}</div>,
    progress: <div className="orders-progress"><div className="orders-progress-top"><StatusBadge status={o.status} />{!queue && <span className={o.verified ? "text-ok" : "text-warn"} role="img" aria-label={o.verified ? "Card saved" : "Card needed"} title={o.verified ? "Card saved" : "Card needed"}><CreditCard size={14} aria-hidden/></span>}</div>{!queue && <p className="record-subtitle">{o.accepted ? `Assigned to ${o.accepted.company}` : `${o.notified} mechanics notified`}</p>}</div>,
    created: <span className="record-date">{dateTime(o.created)}</span>,
  }, actions: <>
    <Link href={`/admin/orders/view/${o.id}`} className="record-action orders-icon-action" aria-label={`View booking #${o.id}`} title="View booking"><Eye size={15} aria-hidden/></Link>
    <Link href={`/admin/orders/view/${o.id}/edit`} className="record-action orders-icon-action" aria-label={`Edit booking #${o.id}`} title="Edit booking"><Pencil size={15} aria-hidden/></Link>
    {!queue && o.accepted && o.mechanicId && <Link href={`/admin/orders/view/${o.id}?tab=chat`} className="record-action orders-icon-action" aria-label={`Messages for booking #${o.id}`} title={`${o.messages} messages`}><MessageSquare size={15} aria-hidden/></Link>}
  </> }))}/></div>;
}
