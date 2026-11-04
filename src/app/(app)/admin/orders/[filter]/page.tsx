import { Search } from "lucide-react";
import { SectionTabs } from "@/components/SectionTabs";
import { OrdersTable } from "@/components/admin/OrdersTable";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, PageHeader, Pagination } from "@/components/ui";
import { ORDER_FILTERS, listAdminOrders, type OrderFilter } from "@/lib/admin/orders";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ filter: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = (await params).filter as OrderFilter;
  return { title: ORDER_FILTERS[f] ?? "Orders" };
}

export default async function AdminOrders({ params, searchParams }: Props) {
  await requireStaff();
  const f = (await params).filter as OrderFilter;
  if (!(f in ORDER_FILTERS)) notFound();
  const { q, page: requestedPage } = await searchParams;
  const rows = await listAdminOrders(f, q);
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage) || 1)));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const pageHref = (n: number) => `/admin/orders/${f}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  const tabs = (Object.keys(ORDER_FILTERS) as OrderFilter[]).filter((k) => k !== "progress").map((k) => ({ href: `/admin/orders/${k}`, label: k === "open" ? "Open bookings" : ORDER_FILTERS[k].replace(/ \(.*\)$/, ""), active: f === k }));
  return (
    <>
      <PageHeader eyebrow={`Bookings · ${rows.length}${q ? " matching" : ""}`} title={ORDER_FILTERS[f]} description="Track bookings, review payment details and coordinate your mechanics." />
      <SectionTabs items={tabs} label="Booking view" />
      <div className="section-toolbar">
        <p><strong>{rows.length}</strong> booking{rows.length === 1 ? "" : "s"}{q ? ` matching “${q}”` : " in this view"}</p>
        <form className="section-search" action={`/admin/orders/${f}`}><Search size={16} aria-hidden /><input type="search" name="q" defaultValue={q} aria-label="Search bookings" placeholder="Registration, customer or booking number" /><button type="submit">Search</button></form>
        {q && <Link href={`/admin/orders/${f}`} className="section-clear">Clear search</Link>}
      </div>

      {rows.length === 0 ? (
        <Empty title="No orders here" body="Nothing matches this view right now." />
      ) : (
        <OrdersTable rows={visible} />
      )}
      <Pagination page={page} pages={pages} total={rows.length} pageSize={pageSize} href={pageHref} />
    </>
  );
}
