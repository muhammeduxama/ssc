import { Search } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/DataTable";
import { SectionTabs } from "@/components/SectionTabs";
import { MechanicRowActions, StatusToggle } from "@/components/admin/MechanicRowActions";
import { Empty, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";
import { listMechanics, type MechanicFilter } from "@/lib/mechanic/profile";

export const metadata = { title: "Mechanics" };
const TITLES: Record<string, string> = { all: "All mechanics", mobile: "Mobile mechanics", garage: "Garages", incomplete: "Incomplete profiles" };
const DOC = { approved: "bg-ok-soft text-ok", rejected: "bg-danger-soft text-danger", pending: "bg-sunken text-muted" } as Record<string, string>;

export default async function MechanicsPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const session = await requireStaff();
  const sp = await searchParams;
  const type = (sp.type && sp.type in TITLES ? sp.type : "all") as MechanicFilter;
  const rows = await listMechanics(type, sp.q);
  return (
    <>
      <PageHeader eyebrow={`Mechanics · ${rows.length}`} title={TITLES[type]} description="Manage your network, check documents and review mechanic accounts." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTabs label="Mechanic view" items={[...Object.entries(TITLES).map(([k,v]) => ({ href: k === "all" ? "/admin/mechanics" : `/admin/mechanics?type=${k}`, label:v, active:type === k })), ...(session.role === "admin" ? [{href:"/admin/mechanics/requests", label:"Applications", active:false}] : [])]} />
        <form className="relative w-full sm:w-72">
          {type !== "all" && <input type="hidden" name="type" value={type} />}
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Search name, company, email, postcode" className="input pl-9" />
        </form>
      </div>
      {rows.length === 0 ? <Empty title="No mechanics found" /> : (
        <DataTable caption="Mechanics" columns={[
          { key: "company", label: "Mechanic", primary: true }, { key: "contact", label: "Contact", mobileWide: true }, { key: "location", label: "Location" }, { key: "documents", label: "Documents", mobileWide: true }, { key: "status", label: "Account" },
        ]} rows={rows.map((m) => ({ id: m.id, cells: {
          company: <div><Link href={`/admin/mechanics/${m.id}`} className="record-title">{m.company || m.name}</Link><p className="record-subtitle">{m.name} · {m.type}</p></div>,
          contact: <div className="[overflow-wrap:anywhere]">{m.email}<p className="record-subtitle">{m.phone}</p></div>,
          location: <div>{m.city || "Not supplied"}<p className="record-subtitle">{m.postcode}</p></div>,
          documents: <div className="flex flex-wrap gap-1">{m.docs.length ? m.docs.map((d,i) => <span key={i} className={`pill border-transparent ${DOC[d.status] ?? DOC.pending}`}>{d.name}</span>) : <span className="record-subtitle">No documents uploaded</span>}</div>,
          status: <StatusToggle id={m.id} active={m.active} />,
        }, actions: <MechanicRowActions id={m.id} /> }))} />
      )}
    </>
  );
}
