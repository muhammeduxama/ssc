import Link from "next/link";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { dateTime, gbp } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { quoteRequests } from "@/lib/mechanic/jobs";

export const metadata = { title: "Quote requests" };

/** QuoteRequest@quoteRequest (all repair requests) with the app's "needs a quote" filter as the default view. */
export default async function QuoteRequests({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const s = await requireRole("mechanic");
  const all = (await searchParams).view === "all";
  const rows = await quoteRequests(s.id, all);
  return (
    <>
      <PageHeader eyebrow={`${rows.length} ${all ? "total" : "waiting for a quote"}`} title="Quote requests">
        <nav className="flex gap-1 rounded-lg border border-line bg-raised p-1 text-xs font-semibold">
          <Link href="/mechanic/quote-requests" className={`rounded-md px-2.5 py-1.5 ${!all ? "bg-brand text-on-brand" : "text-muted"}`}>Needs a quote</Link>
          <Link href="/mechanic/quote-requests?view=all" className={`rounded-md px-2.5 py-1.5 ${all ? "bg-brand text-on-brand" : "text-muted"}`}>All</Link>
        </nav>
      </PageHeader>
      {rows.length === 0 ? <Empty title="No quote requests" body="Customers asking for a repair price near you will appear here." /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[800px]">
          <thead><tr><th className="th">Request</th><th className="th">Vehicle</th><th className="th">Customer asks for</th><th className="th">Postcode</th><th className="th">Your quote</th><th className="th">Date</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="hover:bg-brand-soft/40">
              <td className="td font-mono text-xs"><Link href={`/mechanic/quote-requests/${r.id}`} className="font-semibold text-brand hover:underline">#{r.orderId}</Link><div className="mt-1"><StatusBadge status={r.orderStatus} /></div></td>
              <td className="td">{r.car}<div className="font-mono text-xs text-muted">{r.reg}</div></td>
              <td className="td max-w-72 text-sm">{r.notes || r.work.join(", ") || "—"}</td>
              <td className="td font-mono text-xs">{r.postcode}</td>
              <td className="td text-xs">{r.quote ? <><span className="pill border-line">{r.quote.status}</span> <span className="font-mono">{gbp(r.quote.price)}</span></> : <span className="text-muted">Not started</span>}</td>
              <td className="td font-mono text-xs text-muted">{dateTime(r.created)}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  );
}
