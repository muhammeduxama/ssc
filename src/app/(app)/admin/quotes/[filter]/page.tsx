import { Eye, Search, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloseQuoteButton } from "@/components/admin/CloseQuote";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { QUOTE_FILTERS, listQuotes, type QuoteFilter } from "@/lib/admin/quotes";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ filter: string }>; searchParams: Promise<{ q?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: QUOTE_FILTERS[(await params).filter as QuoteFilter] ?? "Quotes" };
}
const TONE = { ok: "bg-ok-soft/50", warn: "bg-warn-soft/60", danger: "bg-danger-soft/50" } as const;

export default async function QuotesPage({ params, searchParams }: Props) {
  await requireStaff();
  const f = (await params).filter as QuoteFilter;
  if (!(f in QUOTE_FILTERS)) notFound();
  const { q } = await searchParams;
  const rows = await listQuotes(f, q);
  return (
    <>
      <PageHeader eyebrow={`Quotes · ${rows.length}`} title={QUOTE_FILTERS[f]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-raised p-1" aria-label="Quote views">
          {(Object.keys(QUOTE_FILTERS) as QuoteFilter[]).map((k) => (
            <Link key={k} href={`/admin/quotes/${k}`} aria-current={f === k ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${f === k ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}>
              {QUOTE_FILTERS[k].replace(/ \(.*\)$/, "")}
            </Link>
          ))}
          <Link href="/admin/quotes/estimates" className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-sunken hover:text-ink">Sent estimates</Link>
        </nav>
        <form className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search reg, name, city, #id" className="input pl-9" />
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty title="No quotes here" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr>
                  <th className="th">#</th><th className="th">Quote</th><th className="th">Reg</th><th className="th">Customer</th><th className="th">City</th><th className="th">Work required</th><th className="th">Notified</th><th className="th">Responded</th><th className="th">Viewed by</th><th className="th">Dated</th><th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={TONE[r.tone]}>
                    <td className="td font-mono text-xs text-muted">{i + 1}</td>
                    <td className="td font-mono text-xs font-semibold"><Link href={`/admin/quotes/view/${r.id}`} className="text-brand hover:underline">#{r.id}</Link><div className="mt-1"><StatusBadge status={r.status} /></div></td>
                    <td className="td"><span className="rounded border border-ink/20 bg-[#f7ce35] px-1.5 py-0.5 font-mono text-xs font-semibold text-black">{r.reg}</span></td>
                    <td className="td">{r.customer}</td>
                    <td className="td text-xs">{r.city}<div className="font-mono text-muted">{r.postcode}</div></td>
                    <td className="td max-w-52 text-xs">{r.notes || "—"}</td>
                    <td className="td"><Link href={`/admin/quotes/view/${r.id}?tab=mechanics`} className="btn btn-secondary !px-2.5 !py-1 !text-xs">{r.notified}{r.adminSent ? " · quote sent" : ""}</Link></td>
                    <td className="td font-mono text-sm">{r.responded} mechanics</td>
                    <td className="td font-mono text-sm">{r.viewed} mechanics</td>
                    <td className="td font-mono text-xs text-muted">{dateTime(r.created)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/quotes/view/${r.id}`} aria-label="View quote" title="View" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><Eye size={16} /></Link>
                        <Link href={`/admin/quotes/view/${r.id}?tab=build`} aria-label="Build and send quote" title="Send quote" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><Send size={16} /></Link>
                        {r.status !== "rejected" && <CloseQuoteButton id={r.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
