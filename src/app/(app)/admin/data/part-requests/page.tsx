import { CarPriceDecision } from "@/components/tools/DataTools";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, dateTime, parseCar } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Part price requests" };

/** RequestController@part_price_qoutes: pending part carprices. Accept updates the part default price. */
export default async function PartRequests() {
  await requireStaff();
  const rows = await db.carprices.findMany({ where: { status: "pending", type: "part" }, orderBy: { id: "desc" } });
  return (
    <>
      <PageHeader eyebrow={`Data · ${rows.length} pending`} title="Part price requests" />
      {rows.length === 0 ? <Empty title="No pending requests" /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[720px]">
          <thead><tr><th className="th">Service</th><th className="th">Car</th><th className="th">Price</th><th className="th">Source</th><th className="th">Date</th><th className="th text-right">Decision</th></tr></thead>
          <tbody>{rows.map((r) => { const c = parseCar(r.car); return (
            <tr key={String(r.id)}><td className="td font-medium">{r.name}</td><td className="td text-xs">{carTitle(c)} {c.engine} {c.fuel} {c.year}</td><td className="td font-mono">£{Number(r.value).toFixed(2)}</td><td className="td text-xs">{r.source}</td><td className="td font-mono text-xs text-muted">{dateTime(r.created_at)}</td><td className="td"><CarPriceDecision id={Number(r.id)} /></td></tr>
          ); })}</tbody>
        </table></div></div>
      )}
    </>
  );
}
