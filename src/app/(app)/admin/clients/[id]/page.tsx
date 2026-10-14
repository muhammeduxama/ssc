import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClient } from "@/app/actions/clients";
import { ClientForm } from "@/components/admin/ClientForms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Edit client" };
export default async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const c = await db.users.findFirst({ where: { id: BigInt(id), role_id: 2 } });
  if (!c) notFound();
  return (
    <>
      <Link href="/admin/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Clients</Link>
      <PageHeader eyebrow={`Client #${id}`} title={`${c.fname} ${c.lname}`} />
      <ClientForm action={updateClient.bind(null, Number(id))} values={{ fname: c.fname, lname: c.lname, phone: c.phone, email: c.email }} withPassword={false} submit="Save client" />
    </>
  );
}
