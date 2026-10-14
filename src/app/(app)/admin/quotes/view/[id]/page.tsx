import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MechanicsMap from "@/components/admin/MapLoader";
import { QuoteBuilder, QuoteChat, QuoteRequestForm } from "@/components/admin/QuoteTools";
import { CloseQuoteButton } from "@/components/admin/CloseQuote";
import { Field, PageHeader, StatusBadge } from "@/components/ui";
import { getQuote } from "@/lib/admin/quotes";
import { db } from "@/lib/db";
import { dateTime, gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Quote #${(await params).id}` };
}

export default async function QuotePage({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [q, setting] = await Promise.all([getQuote(Number(id)), db.settings.findFirst({ orderBy: { id: "desc" }, select: { labour_rate: true } })]);
  if (!q) notFound();
  const { tab = "details" } = await searchParams;
  const responded = q.requests.filter((r) => r.quote?.status === "QUOTATION SENT");
  const viewed = q.requests.filter((r) => r.quote);
  const tabs = [
    { id: "details", label: "Quote information" },
    { id: "build", label: q.adminQuote?.status === "Sent" ? "Quote (sent)" : "Build & send quote" },
    { id: "mechanics", label: `Mechanics (${q.requests.length})` },
    { id: "chat", label: `Chat (${q.chat.length})` },
  ];

  return (
    <>
      <Link href="/admin/quotes/all" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> All quotes</Link>
      <PageHeader eyebrow={`Repair quote #${q.id}`} title={q.carTitle}>
        <div className="flex items-center gap-3">
          <StatusBadge status={q.status} />
          {q.status !== "rejected" && <CloseQuoteButton id={q.id} />}
        </div>
      </PageHeader>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Quote sections">
        {tabs.map((t) => (
          <Link key={t.id} href={`?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>{t.label}</Link>
        ))}
      </nav>

      {tab === "details" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Customer</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration"><span className="font-mono">{q.car.reg}</span></Field>
              <Field label="Name">{q.customer.name}</Field>
              <Field label="Email">{q.customer.email}</Field>
              <Field label="Phone"><span className="font-mono">{q.customer.phone}</span></Field>
              <Field label="Postal code">{q.postcode}</Field>
              <Field label="City">{q.city}</Field>
              <Field label="Mechanics in area">{q.areaMechanics.length}</Field>
              <Field label="Mechanics notified">{q.requests.length}</Field>
              <Field label="Created">{dateTime(q.created)}</Field>
              <Field label="Updated">{dateTime(q.updated)}</Field>
            </dl>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Vehicle &amp; request</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Work required">{q.services.join(", ")}</Field>
              <Field label="Status"><span className="capitalize">{q.status}</span></Field>
              <Field label="Vehicle make">{q.car.make}</Field>
              <Field label="Vehicle model">{q.car.model}</Field>
              <Field label="Engine">{q.car.engine}</Field>
              <Field label="Fuel">{q.car.fuel}</Field>
              <Field label="Year">{q.car.year}</Field>
            </dl>
            <div className="mt-5 rounded-lg bg-sunken p-4 text-sm">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Customer notes</div>
              {q.notes || "—"}
            </div>
          </section>
        </div>
      )}

      {tab === "build" && (
        <QuoteBuilder orderId={q.id} lines={q.adminQuote?.lines ?? []} total={q.adminQuote?.price ?? 0} status={q.adminQuote?.status ?? "unsent"} labourRate={Number(setting?.labour_rate ?? 60)} />
      )}

      {tab === "mechanics" && (
        <div className="space-y-4">
          <section className="card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Notified mechanics</h2>
              <span className="font-mono text-sm text-muted">Mechanics in the area: <b className="text-ink">{q.areaMechanics.length}</b></span>
            </div>
            {q.requests.length === 0 ? <p className="text-muted">No mechanics notified.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead><tr><th className="th">Mechanic</th><th className="th">Distance</th><th className="th">Request</th><th className="th">Quote status</th><th className="th">Labour</th><th className="th">Parts</th><th className="th text-right">Total</th><th className="th">Response date</th></tr></thead>
                  <tbody>
                    {q.requests.map((r) => (
                      <tr key={r.id}>
                        <td className="td"><div className="font-medium">{r.mechanic}</div><span className={`pill mt-1 border-transparent ${r.active ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{r.active ? "Active" : "Blocked"}</span></td>
                        <td className="td font-mono text-xs">{r.miles} miles</td>
                        <td className="td"><StatusBadge status={r.status} /></td>
                        <td className="td text-xs">{r.quote ? (r.quote.status === "QUOTATION SENT" ? <span className="pill border-transparent bg-ok-soft text-ok">Quotation sent</span> : <span className="pill border-transparent bg-sunken text-muted">{r.quote.status || "Viewed"}</span>) : <span className="text-muted">Not viewed</span>}</td>
                        <td className="td text-xs">{r.quote?.labours.map((l) => `${l.name} (${gbp(l.price)})`).join(", ") || "—"}</td>
                        <td className="td text-xs">{r.quote?.parts.map((p) => `${p.name} (${gbp(p.price)})`).join(", ") || "—"}</td>
                        <td className="td text-right font-mono">{r.quote ? gbp(r.quote.price) : "—"}</td>
                        <td className="td font-mono text-xs text-muted">{r.quote ? dateTime(r.quote.at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 font-mono text-xs text-muted">Responded: {responded.length} · Viewed by: {viewed.length}</p>
          </section>
          {q.status === "pending" && (
            <section className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Send quote request to a garage</h2>
              <QuoteRequestForm orderId={q.id} mechanics={q.mechanics} />
            </section>
          )}
          <section className="card p-4">
            <MechanicsMap center={q.center} pins={q.mechanics} />
          </section>
        </div>
      )}

      {tab === "chat" && (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <section className="card h-fit p-5">
            <h3 className="mb-4 font-display text-base font-semibold">Booking #{q.id} details</h3>
            <dl className="space-y-4">
              <Field label="Customer">{q.customer.name}</Field>
              <Field label="Phone"><span className="font-mono">{q.customer.phone}</span></Field>
              <Field label="Work location">{[q.customer.street, q.city, q.postcode].filter(Boolean).join(", ")}</Field>
              <Field label="Car">{q.carTitle} · <span className="font-mono">{q.car.reg}</span></Field>
              <Field label="Order summary">{q.services.join(", ") || q.notes}</Field>
              <Field label="Order status"><span className="capitalize">{q.status}</span></Field>
              <Field label="Total price">{q.adminQuote ? gbp(q.adminQuote.price) : "—"}</Field>
            </dl>
          </section>
          <QuoteChat orderId={q.id} customer={q.customer.name} messages={q.chat} />
        </div>
      )}
    </>
  );
}
