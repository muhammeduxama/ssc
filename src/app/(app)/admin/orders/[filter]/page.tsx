import { Search } from "lucide-react";
import { OrdersTable } from "@/components/admin/OrdersTable";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, PageHeader } from "@/components/ui";
import { ORDER_FILTERS, listAdminOrders, type OrderFilter } from "@/lib/admin/orders";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ filter: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = (await params).filter as OrderFilter;
  return { title: ORDER_FILTERS[f] ?? "Orders" };
}

export default async function AdminOrders({ params, searchParams }: Props) {
  await requireStaff();
  const f = (await params).filter as OrderFilter;
  if (!(f in ORDER_FILTERS)) notFound();
  const { q } = await searchParams;
  const rows = await listAdminOrders(f, q);

  return (
    <>
      <PageHeader eyebrow={`Orders · ${rows.length}`} title={ORDER_FILTERS[f]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-raised p-1" aria-label="Order views">
          {(Object.keys(ORDER_FILTERS) as OrderFilter[]).filter((k) => k !== "progress" && k !== "open").map((k) => (
            <Link
              key={k}
              href={`/admin/orders/${k}`}
              aria-current={f === k ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${f === k ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}
            >
              {ORDER_FILTERS[k].replace(/ \(.*\)$/, "")}
            </Link>
          ))}
        </nav>
        <form className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search reg, name, city, #id" className="input pl-9" />
        </form>
      </div>
      <div className="mb-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-ok" /> Accepted by a mechanic</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-accent" /> Mechanics notified</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-danger" /> No mechanic notified</span>
      </div>

      {rows.length === 0 ? (
        <Empty title="No orders here" body="Nothing matches this view right now." />
      ) : (
        <OrdersTable rows={rows} />
      )}
    </>
  );
}
