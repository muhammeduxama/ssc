import { ArrowLeft, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Field, PageHeader, StatusBadge } from "@/components/ui";
import { gbp, shortDate } from "@/lib/format";
import { getOrder } from "@/lib/queries";
import { getSession, isStaff } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${(await params).id}` };
}

export default async function OrderPage({ params }: Props) {
  const s = await getSession();
  if (!s) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const o = await getOrder(s, id);
  if (!o) notFound();
  const staff = isStaff(s);

  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> All orders
      </Link>
      <PageHeader eyebrow={`Order #${o.id}`} title={`${o.title} — ${o.service}`}>
        <div className="flex items-center gap-3">
          <StatusBadge status={o.status} />
          <Link href="/messages" className="btn btn-secondary"><MessageSquare size={16} /> Messages</Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Vehicle &amp; job</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Registration"><span className="font-mono">{o.car.reg}</span></Field>
              <Field label="Make / model">{o.title}</Field>
              <Field label="Year">{o.car.year}</Field>
              <Field label="Fuel">{o.car.fuel}</Field>
              <Field label="Engine">{o.car.engine}</Field>
              <Field label="Quoted price"><span className="font-mono">{gbp(o.price)}</span></Field>
              <Field label="Drivable">{o.driveable ? "Yes" : "No"}</Field>
              <Field label="Drop-off">{o.dropOff ? "Customer drops off" : "Mobile visit"}</Field>
              <Field label="Collection">{o.collection ? "Free collection & delivery" : "None"}</Field>
            </dl>
            {o.notes && (
              <div className="mt-5 rounded-lg bg-sunken p-4 text-sm">
                <div className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">Customer notes</div>
                {o.notes}
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <h2 className="p-6 pb-4 font-display text-lg font-semibold">Mechanics on this order</h2>
            {o.assignments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">No mechanic has been assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr><th className="th">Mechanic</th><th className="th">Visit</th><th className="th">Status</th><th className="th text-right">Price</th></tr>
                  </thead>
                  <tbody>
                    {o.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="td">
                          <div className="font-medium">{a.mechanic}</div>
                          {staff && <div className="font-mono text-xs text-muted">{a.phone}</div>}
                          {a.services.length > 0 && (
                            <ul className="mt-1 text-xs text-muted">
                              {a.services.map((x, i) => <li key={i}>{x.name} · {gbp(x.labour)}</li>)}
                            </ul>
                          )}
                        </td>
                        <td className="td font-mono text-xs">{[a.date, a.time].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="td"><StatusBadge status={a.status} /></td>
                        <td className="td text-right font-mono">{gbp(a.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Customer</h2>
            <dl className="space-y-4">
              <Field label="Name">{o.customer.name}</Field>
              {staff && <Field label="Email">{o.customer.email}</Field>}
              {staff && <Field label="Phone"><span className="font-mono">{o.customer.phone}</span></Field>}
              <Field label="Location">{[o.city, o.postcode].filter(Boolean).join(", ")}</Field>
              <Field label="Placed">{shortDate(o.createdAt)}</Field>
            </dl>
          </section>

          {(staff || s.role === "customer") && (
            <section className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Payments</h2>
              {o.payments.length === 0 ? (
                <p className="text-sm text-muted">No payment recorded.</p>
              ) : (
                <ul className="space-y-4">
                  {o.payments.map((p) => (
                    <li key={p.id} className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted">Total</span><span className="font-mono font-medium">{gbp(p.total)}</span></div>
                      {staff && <div className="flex justify-between"><span className="text-muted">Mechanic payout</span><span className="font-mono">{gbp(p.mechanic)}</span></div>}
                      {staff && <div className="flex justify-between"><span className="text-muted">Platform fee</span><span className="font-mono">{gbp(p.fee)}</span></div>}
                      <div className="flex justify-between pt-1"><span className="text-muted">Status</span><span className={`pill border-transparent ${p.status === "Success" ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{p.status}</span></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
