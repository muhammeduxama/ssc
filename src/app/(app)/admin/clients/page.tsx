import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { ClientActions, ClientStatus } from "@/components/admin/ClientForms";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Clients" };

/** ClientController@listClients */
export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const t = q?.trim();
  const rows = await db.users.findMany({
    where: { role_id: 2, ...(t ? { OR: [{ fname: { contains: t } }, { lname: { contains: t } }, { email: { contains: t } }, { phone: { contains: t } }] } : {}) },
    orderBy: { id: "asc" },
    take: 400,
    include: { _count: { select: { orders: true } } },
  });
  return (
    <>
      <PageHeader eyebrow={`Customers · ${rows.length}`} title="Clients">
        <Link href="/admin/clients/new" className="btn btn-primary"><Plus size={16} /> Add client</Link>
      </PageHeader>
      <form className="relative mb-4 w-full sm:w-80">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="input pl-9" />
      </form>
      {rows.length === 0 ? <Empty title="No clients found" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr><th className="th">ID</th><th className="th">Name</th><th className="th">Email</th><th className="th">Phone</th><th className="th">Email status</th><th className="th text-center">Orders</th><th className="th">Joined</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={String(c.id)}>
                    <td className="td font-mono text-xs text-muted">{String(c.id)}</td>
                    <td className="td font-medium">{c.fname} {c.lname}</td>
                    <td className="td">{c.email}</td>
                    <td className="td font-mono text-xs">{c.phone}</td>
                    <td className="td"><span className={`pill border-transparent ${c.email_verified_at ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{c.email_verified_at ? "Verified" : "Not verified"}</span></td>
                    <td className="td text-center font-mono">{c._count.orders}</td>
                    <td className="td font-mono text-xs text-muted">{dateTime(c.created_at)}</td>
                    <td className="td"><ClientStatus id={Number(c.id)} active={c.status} /></td>
                    <td className="td"><ClientActions id={Number(c.id)} /></td>
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
