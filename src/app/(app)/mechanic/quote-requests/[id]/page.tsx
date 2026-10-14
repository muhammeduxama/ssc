import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteRequestBuilder } from "@/components/mechanic/QuoteRequestBuilder";
import { Field, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { quoteRequest } from "@/lib/mechanic/jobs";

export const metadata = { title: "Quote request" };
export default async function QuoteRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("mechanic");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await quoteRequest(s.id, Number(id));
  if (!r) notFound();
  return (
    <>
      <Link href="/mechanic/quote-requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Quote requests</Link>
      <PageHeader eyebrow={`Repair quote #${r.order.id}`} title={r.carTitle}>
        <Link href="/messages" className="btn btn-secondary"><MessageSquare size={16} /> Ask the customer</Link>
      </PageHeader>
      <section className="card mb-4 p-6">
        <dl className="grid gap-4 sm:grid-cols-4">
          <Field label="Customer">{r.customer.name}</Field>
          <Field label="Area">{r.customer.city} · {r.customer.postcode}</Field>
          <Field label="Vehicle">{[r.car.make, r.car.model, r.car.engine, r.car.fuel, r.car.year].filter(Boolean).join(" ")}</Field>
          <Field label="Registration"><span className="font-mono">{r.car.reg}</span></Field>
        </dl>
        <div className="mt-4 rounded-lg bg-sunken p-4 text-sm"><div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Customer asks for</div>{r.order.notes || r.order.work.join(", ") || "—"}</div>
      </section>
      {r.order.status !== "pending" ? (
        <p className="rounded-lg bg-sunken p-4 text-sm text-muted">This request is closed ({r.order.status}).</p>
      ) : (
        <QuoteRequestBuilder id={r.id} labours={r.quote?.labours ?? []} parts={r.quote?.parts ?? []} total={r.quote?.price ?? 0} commission={r.quote?.commission ?? 0} status={r.quote?.status ?? "NOT DELIVERED"} labourRate={r.labourRate} />
      )}
    </>
  );
}
