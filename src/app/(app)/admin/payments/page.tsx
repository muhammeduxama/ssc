import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateTime, gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Payment details" };

/** HomeController@paymentDetails: successful order payments, newest first. */
export default async function Payments() {
  await requireStaff();
  const rows = await db.orderpayments.findMany({
    where: { status: "Success" },
    orderBy: { updated_at: "desc" },
    include: { orders: { include: { users: { select: { fname: true, lname: true } }, orderassigns: { take: 1, include: { users: { select: { company: true, fname: true, lname: true } } } } } } },
  });
  const total = rows.reduce((a, r) => a + Number(r.platform_fee ?? 0), 0);
  return (
    <>
      <PageHeader eyebrow={`${rows.length} payments · ${gbp(total)} platform fees`} title="Payment details" />
      {rows.length === 0 ? <Empty title="No successful payments yet" /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px]">
          <thead><tr><th className="th">#</th><th className="th">Order</th><th className="th">Customer</th><th className="th">Mechanic</th><th className="th text-right">Total</th><th className="th text-right">Mechanic payout</th><th className="th text-right">Platform fee</th><th className="th">Charge date</th></tr></thead>
          <tbody>{rows.map((p, i) => { const m = p.orders.orderassigns[0]?.users; return (
            <tr key={String(p.id)}>
              <td className="td font-mono text-xs text-muted">{i + 1}</td>
              <td className="td font-mono text-xs"><Link href={`/admin/orders/view/${p.order_id}`} className="font-semibold text-brand hover:underline">#{String(p.order_id)}</Link></td>
              <td className="td">{p.orders.users.fname} {p.orders.users.lname}</td>
              <td className="td">{m ? m.company || `${m.fname} ${m.lname}` : "—"}</td>
              <td className="td text-right font-mono">{gbp(p.total_payment)}</td>
              <td className="td text-right font-mono">{gbp(p.mechanic_payment)}</td>
              <td className="td text-right font-mono font-semibold text-brand">{gbp(p.platform_fee)}</td>
              <td className="td font-mono text-xs text-muted">{dateTime(p.updated_at)}</td>
            </tr>
          ); })}</tbody>
        </table></div></div>
      )}
    </>
  );
}
