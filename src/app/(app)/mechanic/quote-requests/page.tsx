import Link from "next/link";
import { WorkList } from "@/components/mechanic/WorkList";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { quoteRequests } from "@/lib/mechanic/jobs";
export const metadata = { title: "Quote requests" };
export default async function QuoteRequests({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const s = await requireRole("mechanic");
  const all = (await searchParams).view === "all";
  const rows = await quoteRequests(s.id, all);
  return <>
    <PageHeader eyebrow="Repair opportunities" title="Quote requests" description="Review the customer’s repair needs, build your estimate and send a clear price.">
      <nav className="mech-segmented" aria-label="Quote request filter"><Link href="/mechanic/quote-requests" aria-current={!all ? "page" : undefined}>Needs a quote</Link><Link href="/mechanic/quote-requests?view=all" aria-current={all ? "page" : undefined}>All requests</Link></nav>
    </PageHeader>
    <WorkList mode="quotes" empty="No quote requests" items={rows.map(r => ({ id: r.id, orderId: r.orderId, href: `/mechanic/quote-requests/${r.id}`, car: r.car, reg: r.reg, customer: r.customer, work: r.notes || r.work.join(", "), location: r.postcode, amount: r.quote?.price ?? null, amountLabel: "Your estimate", status: r.orderStatus !== "pending" ? r.orderStatus : r.quote?.status ?? "Needs a quote", date: r.created }))}/>
  </>;
}
