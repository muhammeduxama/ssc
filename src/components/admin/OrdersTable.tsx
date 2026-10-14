import { Eye, MessageSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import type { listAdminOrders } from "@/lib/admin/orders";
import { dateTime } from "@/lib/format";

const TONE = { ok: "bg-ok-soft/50", warn: "bg-warn-soft/60", danger: "bg-danger-soft/50" } as const;

export function OrdersTable({ rows }: { rows: Awaited<ReturnType<typeof listAdminOrders>> }) {
  return (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Order</th>
                  <th className="th">Reg</th>
                  <th className="th">Customer</th>
                  <th className="th">Work required</th>
                  <th className="th">City</th>
                  <th className="th">Status</th>
                  <th className="th">Notified</th>
                  <th className="th">Accepted by</th>
                  <th className="th">Dated</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => (
                  <tr key={o.id} className={TONE[o.tone]}>
                    <td className="td font-mono text-xs text-muted">{i + 1}</td>
                    <td className="td font-mono text-xs font-semibold"><Link href={`/admin/orders/view/${o.id}`} className="text-brand hover:underline">#{o.id}</Link></td>
                    <td className="td"><span className="rounded border border-ink/20 bg-[#f7ce35] px-1.5 py-0.5 font-mono text-xs font-semibold text-black">{o.reg}</span></td>
                    <td className="td">{o.customer}</td>
                    <td className="td max-w-56 text-xs">{o.work.map((w) => w.split(" ").slice(0, 3).join(" ")).join(", ") || "—"}</td>
                    <td className="td text-xs">{o.city}<div className="font-mono text-muted">{o.postcode}</div></td>
                    <td className="td">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={o.status} />
                        <span className={`pill border-transparent ${o.verified ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{o.verified ? "verified" : "unverified"}</span>
                      </div>
                    </td>
                    <td className="td">
                      <Link href={`/admin/orders/view/${o.id}#notified`} className="btn btn-secondary !px-2.5 !py-1 !text-xs">{o.notified} mechanics</Link>
                    </td>
                    <td className="td text-xs">
                      {o.accepted ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold">{o.accepted.company}</div>
                          <div className="font-mono text-muted">{dateTime(o.accepted.at)}</div>
                          {o.accepted.slot && <div className="font-mono text-muted">{o.accepted.slot}</div>}
                        </div>
                      ) : (
                        <span className="pill border-transparent bg-danger-soft text-danger">Not accepted yet</span>
                      )}
                    </td>
                    <td className="td font-mono text-xs text-muted">{dateTime(o.created)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {o.accepted && o.mechanicId && (
                          <Link href={`/admin/orders/view/${o.id}?tab=chat`} title={`${o.messages} messages`} aria-label={`${o.messages} messages`} className="rounded-md p-1.5 text-brand hover:bg-brand-soft">
                            <MessageSquare size={16} />
                          </Link>
                        )}
                        <Link href={`/admin/orders/view/${o.id}`} title="View" aria-label="View order" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><Eye size={16} /></Link>
                        <Link href={`/admin/orders/view/${o.id}/edit`} title="Edit" aria-label="Edit order" className="rounded-md p-1.5 text-muted hover:bg-sunken"><Pencil size={16} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
}
