import { Search } from "lucide-react";
import Link from "next/link";
import { MechanicRowActions, StatusToggle } from "@/components/admin/MechanicRowActions";
import { Empty, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";
import { listMechanics, type MechanicFilter } from "@/lib/mechanic/profile";

export const metadata = { title: "Mechanics" };
const TITLES: Record<string, string> = { all: "All mechanics", mobile: "Mobile mechanics", garage: "Garages", incomplete: "Incomplete profiles" };
const DOC = { approved: "bg-ok-soft text-ok", rejected: "bg-danger-soft text-danger", pending: "bg-sunken text-muted" } as Record<string, string>;

export default async function MechanicsPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const type = (sp.type && sp.type in TITLES ? sp.type : "all") as MechanicFilter;
  const rows = await listMechanics(type, sp.q);
  return (
    <>
      <PageHeader eyebrow={`Mechanics · ${rows.length}`} title={TITLES[type]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-raised p-1" aria-label="Mechanic views">
          {Object.entries(TITLES).map(([k, v]) => (
            <Link key={k} href={k === "all" ? "/admin/mechanics" : `/admin/mechanics?type=${k}`} aria-current={type === k ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${type === k ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}>{v}</Link>
          ))}
          <Link href="/admin/mechanics/requests" className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-sunken hover:text-ink">Garage requests</Link>
        </nav>
        <form className="relative w-full sm:w-72">
          {type !== "all" && <input type="hidden" name="type" value={type} />}
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Search name, company, email, postcode" className="input pl-9" />
        </form>
      </div>
      {rows.length === 0 ? <Empty title="No mechanics found" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead><tr><th className="th">ID</th><th className="th">Company</th><th className="th">Name</th><th className="th">Contact</th><th className="th">Location</th><th className="th">Type</th><th className="th">Documents</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-brand-soft/30">
                    <td className="td font-mono text-xs text-muted">{m.id}</td>
                    <td className="td font-medium"><Link href={`/admin/mechanics/${m.id}`} className="hover:text-brand">{m.company || "—"}</Link></td>
                    <td className="td">{m.name}</td>
                    <td className="td text-xs">{m.email}<div className="font-mono text-muted">{m.phone}</div></td>
                    <td className="td text-xs">{m.city || "—"}<div className="font-mono text-muted">{m.postcode}</div></td>
                    <td className="td text-xs">{m.type}</td>
                    <td className="td max-w-64"><div className="flex flex-wrap gap-1">{m.docs.length ? m.docs.map((d, i) => <span key={i} className={`pill border-transparent ${DOC[d.status] ?? DOC.pending}`}>{d.name}</span>) : <span className="text-xs text-muted">None</span>}</div></td>
                    <td className="td"><StatusToggle id={m.id} active={m.active} /></td>
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
