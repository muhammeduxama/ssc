import { Plus } from "lucide-react";
import Link from "next/link";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, dateTime, gbp, parseCar } from "@/lib/format";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Bespoke quotes" };
export default async function Bespokes() {
  const s = await requireRole("mechanic");
  const rows = await db.bespokes.findMany({ where: { user_id: BigInt(s.id) }, orderBy: { id: "desc" }, include: { bespokeusers: { take: 1 } } });
  return (
    <>
      <PageHeader eyebrow={`${rows.length} estimates`} title="Bespoke quotes"><Link href="/mechanic/bespokes/new" className="btn btn-primary"><Plus size={16} /> New estimate</Link></PageHeader>
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Send your own customers a priced estimate. They get a “Book me in” link and pay through Smart Servicing Centre.</p>
      {rows.length === 0 ? <Empty title="No estimates yet" /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px]">
          <thead><tr><th className="th">Estimate</th><th className="th">Customer</th><th className="th">Vehicle</th><th className="th">Status</th><th className="th text-right">Price</th><th className="th">Created</th></tr></thead>
          <tbody>{rows.map((b) => { const c = parseCar(b.car_data); const u = b.bespokeusers[0]; return (
            <tr key={String(b.id)} className="hover:bg-brand-soft/40">
              <td className="td font-mono text-xs"><Link href={`/mechanic/bespokes/${b.id}`} className="font-semibold text-brand hover:underline">#{String(b.id)}</Link></td>
              <td className="td">{u ? [u.fname, u.lname].filter(Boolean).join(" ") || u.email : "—"}<div className="text-xs text-muted">{u?.email}</div></td>
              <td className="td">{carTitle(c)}<div className="font-mono text-xs text-muted">{c.reg}</div></td>
              <td className="td"><StatusBadge status={b.status} /></td>
              <td className="td text-right font-mono">{gbp(b.price)}</td>
              <td className="td font-mono text-xs text-muted">{dateTime(b.created_at)}</td>
            </tr>
          ); })}</tbody>
        </table></div></div>
      )}
    </>
  );
}
