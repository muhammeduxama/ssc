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
            <table className="w-full min-w-[960px] section-responsive-table">
              <thead><tr><th className="th">Quote</th><th className="th">Reg</th><th className="th">Customer</th><th className="th">Sent by</th><th className="th">Postcode</th><th className="th">Price</th><th className="th">Status</th><th className="th">Parts</th><th className="th">Labour</th><th className="th">Created</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td font-mono text-xs font-semibold" data-label="Quote">#{r.id}</td>
                    <td className="td font-mono text-xs" data-label="Reg">{r.reg}</td>
                    <td className="td" data-label="Customer">{r.customer}</td>
                    <td className="td" data-label="Sent by">{r.sentBy}</td>
                    <td className="td font-mono text-xs" data-label="Postcode">{r.postcode}</td>
                    <td className="td font-mono" data-label="Price">{gbp(r.price)}</td>
                    <td className="td" data-label="Status"><StatusBadge status={r.status} /></td>
                    <td className="td text-xs" data-label="Parts">{r.parts.join(", ") || "—"}</td>
                    <td className="td text-xs" data-label="Labour">{r.labours.join(", ") || "—"}</td>
                    <td className="td font-mono text-xs text-muted" data-label="Created">{dateTime(r.created)}</td>
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
