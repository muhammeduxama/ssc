import Link from "next/link";
import { MechanicRowActions, StatusToggle } from "@/components/admin/MechanicRowActions";
import { Empty, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { listMechanics } from "@/lib/mechanic/profile";

export const metadata = { title: "Garage requests" };

/** MechanicController@garageRequest: mechanics waiting for approval (status = 0). */
export default async function GarageRequests() {
  await requireStaff(true);
  const rows = await listMechanics("requests");
  return (
    <>
      <PageHeader eyebrow={`Awaiting approval · ${rows.length}`} title="Garage requests" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Review each application and its documents, then switch the account to <b>Approved</b> to let the mechanic start accepting work.</p>
      {rows.length === 0 ? <Empty title="No pending requests" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr><th className="th">ID</th><th className="th">Company</th><th className="th">Name</th><th className="th">Contact</th><th className="th">Postcode</th><th className="th">Type</th><th className="th">Applied</th><th className="th">Account</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="td font-mono text-xs text-muted">{m.id}</td>
                    <td className="td font-medium"><Link href={`/admin/mechanics/${m.id}`} className="hover:text-brand">{m.company || "—"}</Link></td>
                    <td className="td">{m.name}</td>
                    <td className="td text-xs">{m.email}<div className="font-mono text-muted">{m.phone}</div></td>
                    <td className="td font-mono text-xs">{m.postcode}</td>
                    <td className="td text-xs">{m.type}</td>
                    <td className="td font-mono text-xs text-muted">{dateTime(m.joined)}</td>
                    <td className="td"><StatusToggle id={m.id} active={m.active} labels={["Approved", "Pending"]} /></td>
                    <td className="td"><MechanicRowActions id={m.id} /></td>
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
