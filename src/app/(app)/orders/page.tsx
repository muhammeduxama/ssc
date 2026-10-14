import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { gbp, shortDate } from "@/lib/format";
import { listOrders } from "@/lib/queries";
import { getSession, isStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Orders" };

const TABS = ["all", "pending", "assigned", "completed", "rejected"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const sp = await searchParams;
  const status = TABS.includes(sp.status ?? "") ? sp.status! : "all";
  const { rows, count, page, pages } = await listOrders(s, { status, q: sp.q, page: Number(sp.page) || 1 });
  const staff = isStaff(s);
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { status, q: sp.q, ...over };
    for (const [k, v] of Object.entries(m)) if (v && v !== "all") p.set(k, v);
    const qs = p.toString();
    return `/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow={`${count} total`} title={staff ? "Orders" : s.role === "mechanic" ? "My jobs" : "My bookings"} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-lg border border-line bg-raised p-1" aria-label="Filter by status">
          {TABS.map((t) => (
            <Link
              key={t}
              href={href({ status: t, page: undefined })}
              aria-current={status === t ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${status === t ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}
            >
              {t}
            </Link>
          ))}
        </nav>
        <form action="/orders" className="relative w-full sm:w-72">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Search reg, postcode, service, #id" className="input pl-9" />
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty title="No orders found" body="Try a different status or search term." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Vehicle</th>
                  {staff && <th className="th">Customer</th>}
                  <th className="th">Service</th>
                  <th className="th">Postcode</th>
                  <th className="th">Status</th>
                  {staff && <th className="th text-center">Mechanics</th>}
                  <th className="th text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="transition hover:bg-brand-soft/50">
                    <td className="td font-mono text-xs">
                      <Link href={`/orders/${o.id}`} className="font-medium text-brand hover:underline">#{o.id}</Link>
                      <div className="text-muted">{shortDate(o.at)}</div>
                    </td>
                    <td className="td">
                      <div className="font-medium">{o.car}</div>
                      <div className="font-mono text-xs text-muted">{o.reg}</div>
                    </td>
                    {staff && <td className="td">{o.customer}</td>}
                    <td className="td capitalize">{o.service}</td>
                    <td className="td font-mono text-xs">{o.postcode}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                    {staff && <td className="td text-center font-mono">{o.mechanics}</td>}
                    <td className="td text-right font-mono">{gbp(o.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="font-mono text-xs text-muted">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link className="btn btn-secondary !py-1.5" href={href({ page: String(page - 1) })}>Previous</Link>}
              {page < pages && <Link className="btn btn-secondary !py-1.5" href={href({ page: String(page + 1) })}>Next</Link>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
