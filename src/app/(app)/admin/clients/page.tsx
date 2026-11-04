import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/DataTable";
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
      <PageHeader eyebrow={`Customers · ${rows.length}`} title="Customers" description="Manage contact details, account access and booking history.">
        <Link href="/admin/clients/new" className="btn btn-primary"><Plus size={16} /> Add customer</Link>
      </PageHeader>
      <form className="relative mb-4 w-full sm:w-80">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="input pl-9" />
      </form>
      {rows.length === 0 ? <Empty title="No clients found" /> : (
        <DataTable caption="Customers" columns={[
          { key: "name", label: "Customer", primary: true }, { key: "contact", label: "Contact", mobileWide: true }, { key: "bookings", label: "Bookings" }, { key: "verified", label: "Email" }, { key: "status", label: "Account" }, { key: "joined", label: "Joined" },
        ]} rows={rows.map((c) => ({ id: String(c.id), cells: {
          name: <Link href={`/admin/clients/${c.id}`} className="record-title">{c.fname} {c.lname}<span className="record-subtitle block">Customer #{String(c.id)}</span></Link>,
          contact: <div className="[overflow-wrap:anywhere]"><span>{c.email}</span><p className="record-subtitle">{c.phone || "No phone number"}</p></div>,
          bookings: c._count.orders,
          verified: <span className={`pill border-transparent ${c.email_verified_at ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{c.email_verified_at ? "Verified" : "Not verified"}</span>,
          status: <ClientStatus id={Number(c.id)} active={c.status} />,
          joined: <span className="record-date">{dateTime(c.created_at)}</span>,
        }, actions: <ClientActions id={Number(c.id)} /> }))} />
      )}
    </>
  );
}
