import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { addClient } from "@/app/actions/clients";
import { ClientForm } from "@/components/admin/ClientForms";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Add client" };
export default async function NewClient() {
  await requireStaff();
  return (
    <>
      <Link href="/admin/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Clients</Link>
      <PageHeader eyebrow="Clients" title="Add client" />
      <ClientForm action={addClient} withPassword submit="Add client" />
    </>
  );
}
