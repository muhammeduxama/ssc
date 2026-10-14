import { ModelRequestDecision } from "@/components/tools/DataTools";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Car requests" };

/** ModelRequestsController@requests: unknown model names found during lookups/imports. */
export default async function ModelRequests() {
  await requireStaff();
  const rows = await db.modeldatas.findMany({ orderBy: { id: "desc" }, include: { makes: { select: { name: true, modals: { select: { id: true, name: true }, orderBy: { name: "asc" } } } } } });
  return (
    <>
      <PageHeader eyebrow={`Data · ${rows.length} pending`} title="Car requests" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Approve a name as a new model, or attach it as a search keyword to an existing model (cars using the name are renamed).</p>
      {rows.length === 0 ? <Empty title="No car requests" /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px]">
          <thead><tr><th className="th">Make</th><th className="th">Requested model</th><th className="th">Date</th><th className="th text-right">Decision</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={String(r.id)}><td className="td font-medium">{r.makes.name}</td><td className="td">{r.name}</td><td className="td font-mono text-xs text-muted">{dateTime(r.created_at)}</td><td className="td"><ModelRequestDecision id={Number(r.id)} models={r.makes.modals.map((m) => ({ id: Number(m.id), name: m.name }))} /></td></tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  );
}
