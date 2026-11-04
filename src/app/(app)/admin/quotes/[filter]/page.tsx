import { DataTable } from "@/components/DataTable";
import { SectionTabs } from "@/components/SectionTabs";
import { Eye, Search, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloseQuoteButton } from "@/components/admin/CloseQuote";
import { Empty, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { QUOTE_FILTERS, listQuotes, type QuoteFilter } from "@/lib/admin/quotes";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ filter: string }>; searchParams: Promise<{ q?: string; page?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: QUOTE_FILTERS[(await params).filter as QuoteFilter] ?? "Quotes" };
}

export default async function QuotesPage({ params, searchParams }: Props) {
  await requireStaff();
  const f = (await params).filter as QuoteFilter;
  if (!(f in QUOTE_FILTERS)) notFound();
  const { q, page: requestedPage } = await searchParams;
  const rows = await listQuotes(f, q);
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage) || 1)));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const pageHref = (n: number) => `/admin/quotes/${f}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;
  return (
    <>
      <PageHeader eyebrow={`Quotes · ${rows.length}`} title={QUOTE_FILTERS[f]} description="Review repair requests, build estimates and track mechanic responses." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTabs label="Quote view" items={[...(Object.keys(QUOTE_FILTERS) as QuoteFilter[]).map((k) => ({href:`/admin/quotes/${k}`,label:QUOTE_FILTERS[k].replace(/ \(.*\)$/, ""),active:f===k})),{href:"/admin/quotes/estimates",label:"Sent estimates",active:false}]} />
        <form className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search reg, name, city, #id" className="input pl-9" />
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty title="No quotes here" />
      ) : (
        <div className="quotes-list"><DataTable density="compact" caption="Repair quotes" columns={[
          {key:"quote",label:"Quote",primary:true},{key:"customer",label:"Customer"},{key:"work",label:"Work requested"},{key:"status",label:"Status"},{key:"responses",label:"Responses"},{key:"date",label:"Received"},
        ]} rows={visible.map((r)=>({id:r.id,cells:{
          quote:<div className="record-booking"><Link href={`/admin/quotes/view/${r.id}`} className="record-title">#{r.id}</Link><span className="registration-plate">{r.reg || "No registration"}</span></div>,
          status:<StatusBadge status={r.status}/>,
          customer:<div>{r.customer}<p className="record-subtitle">{r.city} · {r.postcode}</p></div>,work:<p className="record-work" title={r.notes || undefined}>{r.notes || "Details pending"}</p>,
          responses:<div className="quote-responses"><Link href={`/admin/quotes/view/${r.id}?tab=mechanics`} className="text-brand" title={`${r.responded} of ${r.notified} mechanics replied`}>{r.responded}/{r.notified} replied</Link><p className="record-subtitle">{r.viewed} viewed{r.adminSent ? " · Estimate sent" : ""}</p></div>,date:<span className="record-date">{dateTime(r.created)}</span>,
        },actions:<><Link href={`/admin/quotes/view/${r.id}`} className="record-action quote-icon-action" aria-label={`View quote #${r.id}`} title="View quote"><Eye size={15} aria-hidden/></Link><Link href={`/admin/quotes/view/${r.id}?tab=build`} className="record-action quote-icon-action" aria-label={`Build quote #${r.id}`} title="Build quote"><Send size={15} aria-hidden/></Link>{r.status!=="rejected"&&<CloseQuoteButton id={r.id} compact/>}</>}))}/></div>

      )}
      <Pagination page={page} pages={pages} total={rows.length} pageSize={pageSize} href={pageHref} />
    </>
  );
}
