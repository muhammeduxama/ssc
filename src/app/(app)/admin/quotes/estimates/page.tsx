import { PageHeader, Empty, StatusBadge } from "@/components/ui";
import { listEstimates } from "@/lib/admin/quotes";
import { dateTime, gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Sent estimates" };

export default async function Estimates() {
  await requireStaff();
  const rows = await listEstimates();
  return (
    <>
      <PageHeader eyebrow={`Bespoke estimates · ${rows.length}`} title="Sent estimates" />
      {rows.length === 0 ? <Empty title="No estimates sent yet" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead><tr><th className="th">Quote</th><th className="th">Reg</th><th className="th">Customer</th><th className="th">Sent by</th><th className="th">Postcode</th><th className="th">Price</th><th className="th">Status</th><th className="th">Parts</th><th className="th">Labour</th><th className="th">Created</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td font-mono text-xs font-semibold">#{r.id}</td>
                    <td className="td font-mono text-xs">{r.reg}</td>
                    <td className="td">{r.customer}</td>
                    <td className="td">{r.sentBy}</td>
                    <td className="td font-mono text-xs">{r.postcode}</td>
                    <td className="td font-mono">{gbp(r.price)}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                    <td className="td text-xs">{r.parts.join(", ") || "—"}</td>
                    <td className="td text-xs">{r.labours.join(", ") || "—"}</td>
                    <td className="td font-mono text-xs text-muted">{dateTime(r.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
