import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinesEditor } from "@/components/admin/LinesEditor";
import MechanicsMap from "@/components/admin/MapLoader";
import { CancelButtons, GarageRequest, SscNotes } from "@/components/admin/OrderActions";
import { OrderChat } from "@/components/admin/OrderChat";
import { Field, PageHeader, StatusBadge } from "@/components/ui";
import { asset } from "@/lib/asset";
import { getAdminOrder } from "@/lib/admin/orders";
import { dateTime, gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${(await params).id}` };
}

export default async function AdminOrderPage({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const o = await getAdminOrder(Number(id));
  if (!o) notFound();
  const { tab = "info" } = await searchParams;
  const a = o.assigned;
  const tabs = [
    { id: "info", label: "Order information" },
    { id: "services", label: "Services" },
    { id: "chat", label: `Chat (${o.messages} message${o.messages === 1 ? "" : "s"})` },
  ];

  return (
    <>
      <Link href="/admin/orders/all" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> All orders
      </Link>
      <PageHeader eyebrow={`Order #${o.id} · ${o.service}`} title={o.carTitle}>
        <div className="flex items-center gap-3">
          <StatusBadge status={o.status} />
          <span className="rounded-lg bg-brand px-3 py-1.5 font-display text-lg font-semibold text-on-brand">{gbp(o.price)}</span>
          <Link href={`/admin/orders/view/${o.id}/edit`} className="btn btn-secondary"><Pencil size={16} /> Edit</Link>
        </div>
      </PageHeader>

      <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Order sections">
        {tabs.map((t) => (
          <Link key={t.id} href={`?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "info" && (
        <div className="space-y-4">
          <section className="card p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {o.car.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(o.car.logo)} alt="" className="h-10 w-12 object-contain" />
              )}
              {[`${o.car.make ?? ""} ${o.car.model ?? ""}`, o.car.year, o.car.engine, o.car.fuel].filter(Boolean).map((x) => (
                <span key={String(x)} className="pill border-line text-muted">{x}</span>
              ))}
              <span className="ml-auto rounded-md border-2 border-black bg-[#f7ce35] px-3 py-1 font-mono text-lg font-bold tracking-widest text-black">{o.car.reg}</span>
            </div>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Order #">{o.id}</Field>
              <Field label="Client name">{o.customer.name}</Field>
              <Field label="Client phone"><span className="font-mono">{o.customer.phone}</span></Field>
              <Field label="Email">{o.customer.email}</Field>
              <Field label="Location">{[o.location.street, o.location.city, o.location.county].filter(Boolean).join(" ")} · {o.location.postcode}</Field>
              <Field label="Time slots">
                {o.timeslots.length ? (
                  <span className="flex flex-wrap gap-1">{o.timeslots.map((t, i) => <span key={i} className="pill border-line">{t.time} {t.date}</span>)}</span>
                ) : null}
              </Field>
              <Field label="Garage">{a?.company}</Field>
              <Field label="Scheduled">{a ? (a.time && a.date ? `${a.time} ${a.date}` : "Not set by mechanic") : null}</Field>
              <Field label="Order status"><span className="capitalize">{o.status}</span></Field>
              <Field label="Payment status">{o.payment ? o.payment.status : "Uncaptured"}</Field>
              <Field label="Completed date">{a?.completedAt ? dateTime(a.completedAt) : null}</Field>
              <Field label="Created date">{dateTime(o.created)}</Field>
              <Field label="Collection & delivery">
                <span className="flex flex-wrap gap-1">
                  {o.collection && <span className="pill border-line">Collection and delivery by a garage</span>}
                  <span className={`pill border-transparent ${o.driveable ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{o.driveable ? "Vehicle is drivable" : "Vehicle is not drivable"}</span>
                  <span className="pill border-line">{o.fiveMileDrop ? "Customer will drop off" : "Customer won’t drop off"}</span>
                </span>
              </Field>
              <Field label="Work required">{o.work.join(", ")}</Field>
              <Field label="Parts">{o.parts.length ? o.parts.map((p) => `${p.name} = ${p.price.toFixed(2)}`).join(" · ") : null}</Field>
              <Field label="Additional information">{o.notes || "Not provided"}</Field>
            </dl>
            {a && (a.labours.length > 0 || a.parts.length > 0) && (
              <div className="mt-6 grid gap-4 rounded-lg bg-sunken p-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Labour (if quote becomes order)</div>
                  {a.labours.map((l) => <p key={l.id} className="text-sm">{l.description} = {l.price.toFixed(2)}</p>)}
                </div>
                <div>
                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Parts</div>
                  {a.parts.map((p) => <p key={p.id} className="text-sm">{p.description} = {p.price.toFixed(2)}</p>)}
                </div>
              </div>
            )}
            {o.adminQuote && (
              <div className="mt-4 rounded-lg bg-sunken p-4">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Parts included by admin</div>
                {o.adminQuote.map((d, i) => <p key={i} className="text-sm">{d.name} = {d.price.toFixed(2)} ({d.type})</p>)}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <CancelButtons id={o.id} status={o.status} />
              {a && <Link href={`?tab=chat`} className="btn btn-primary">Chat with mechanic</Link>}
            </div>
          </section>

          <section id="notified" className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Notified mechanics</h2>
              <span className="font-mono text-sm text-muted">In the area: <b className="text-ink">{o.requests.length}</b></span>
            </div>
            {o.requests.length === 0 ? (
              <p className="font-display text-xl text-muted">No mechanics notified</p>
            ) : (
              <ul className="divide-y divide-line">
                {o.requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <span className="font-medium">{r.company}</span>
                    <span className="font-mono text-xs text-muted">{r.miles} miles away</span>
                    {r.quotation !== null && (
                      <span className="pill border-transparent bg-brand-soft text-brand">
                        Sent quotation of {gbp(r.quotation)}
                        {a ? ` · accepted by ${a.company}` : ""}
                      </span>
                    )}
                    <span className={`pill ml-auto border-transparent ${r.active ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{r.active ? "Active" : "Blocked"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!a && (
            <section className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Send order request to a garage</h2>
              <GarageRequest id={o.id} mechanics={o.mechanics} />
            </section>
          )}

          <section className="card p-4">
            <MechanicsMap center={{ lat: o.location.lat, lng: o.location.lng }} pins={o.mechanics} />
          </section>
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Order amount</div>
              <div className="mt-2 font-display text-3xl font-medium text-brand">{gbp(a ? a.price : o.price)}</div>
              <div className="mt-1 text-sm text-muted">Payment: {o.payment ? o.payment.status : "Uncaptured"}</div>
            </div>
            <div className="card p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">SSC commission</div>
              <div className="mt-2 font-display text-3xl font-medium text-brand">{o.payment ? gbp(o.payment.fee) : "—"}</div>
            </div>
            <div className="card p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Mileage at start of booking</div>
              <div className="mt-2 font-display text-3xl font-medium">{a && a.mileage > 0 ? a.mileage.toLocaleString("en-GB") : "Not yet entered"}</div>
            </div>
          </div>

          <section className="card p-5">
            <h3 className="mb-3 font-display text-base font-semibold">Additional message by Smart Servicing Centre</h3>
            <SscNotes id={o.id} initial={o.sscNotes} />
          </section>

          <section className="card overflow-hidden">
            <h3 className="border-b border-line px-5 py-3 font-display text-base font-semibold">Services</h3>
            {o.work.length === 0 ? <p className="px-5 py-4 text-sm text-muted">No services.</p> : (
              <ul>{o.work.map((w, i) => <li key={i} className="border-t border-line px-5 py-3 text-sm first:border-t-0">{w}</li>)}</ul>
            )}
          </section>

          {a ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <LinesEditor kind="labour" assignId={a.id} lines={a.labours} />
              <LinesEditor kind="part" assignId={a.id} lines={a.parts} />
            </div>
          ) : (
            <p className="rounded-lg bg-sunken p-4 text-sm text-muted">Labour and parts can be edited once a mechanic has accepted the order.</p>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="card overflow-hidden">
              <h3 className="border-b border-line px-5 py-3 font-display text-base font-semibold">Photos</h3>
              {!a || a.photos.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">No photo listed</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-4">
                  {a.photos.map((p) => (
                    <a key={p.id} href={asset(p.image)} target="_blank" rel="noreferrer" title={p.description ?? ""}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset(p.image)} alt={p.description ?? "Job photo"} className="aspect-square w-full rounded-lg object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </section>
            <section className="card overflow-hidden">
              <h3 className="border-b border-line px-5 py-3 font-display text-base font-semibold">Faults identified</h3>
              {!a || a.faults.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">No faults identified</p>
              ) : (
                <ul>
                  {a.faults.map((f) => (
                    <li key={f.id} className="flex items-start gap-3 border-t border-line px-5 py-3 text-sm first:border-t-0">
                      <span className="flex-1">{f.description}{f.code && <span className="ml-2 font-mono text-xs text-muted">{f.code}</span>}</span>
                      <span className="pill border-line">{f.urgency}</span>
                      {f.fixed && <span className="pill border-transparent bg-ok-soft text-ok">Fixed</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card p-5">
            <h3 className="mb-3 font-display text-base font-semibold">Sundries</h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              {["Screen wash", "Antifreeze", "Brake fluid", "Power steering fluid", "Battery fluid"].map((s) => (
                <li key={s} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-ok" /> {s}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "chat" &&
        (a ? (
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <section className="card p-5">
              <h3 className="mb-4 font-display text-base font-semibold">Booking #{o.id} details</h3>
              <dl className="space-y-4">
                <Field label="Customer">{o.customer.name}</Field>
                <Field label="Phone"><span className="font-mono">{o.customer.phone}</span></Field>
                <Field label="Work location">{[o.location.street, o.location.city, o.location.postcode].filter(Boolean).join(", ")}</Field>
                <Field label="Arrival time">{a.time && a.date ? `${a.time} ${a.date}` : "Not set"}</Field>
                <Field label="Car">{o.carTitle} · <span className="font-mono">{o.car.reg}</span></Field>
                <Field label="Order summary">{o.work.join(", ")}</Field>
                <Field label="Order status"><span className="capitalize">{o.status}</span></Field>
                <Field label="Mechanic">{a.company} · {a.mechanicName} · <span className="font-mono">{a.mechanicPhone}</span></Field>
                <Field label="Total price">{gbp(a.price)}</Field>
              </dl>
            </section>
            <OrderChat orderId={o.id} mechanicId={a.mechanicId} names={{ customer: o.customer.name, mechanic: a.company }} />
          </div>
        ) : (
          <p className="rounded-lg bg-sunken p-6 text-sm text-muted">Chat opens once a mechanic has accepted this order.</p>
        ))}
    </>
  );
}
