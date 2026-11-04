import { Mail, Phone, ShieldCheck } from "lucide-react";
import { DetailPage, DetailHeader, DetailMetrics } from "@/components/DetailPage";
import { notFound } from "next/navigation";
import { updateClient } from "@/app/actions/clients";
import { ClientForm } from "@/components/admin/ClientForms";
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
    <DetailPage>
      <DetailHeader back={{ href: "/admin/clients", label: "Clients" }} eyebrow={`Client #${id}`} title={`${c.fname} ${c.lname}`} />
      <DetailMetrics items={[
        { label: "Email address", value: c.email ? <a href={`mailto:${c.email}`} className="detail-contact">{c.email}</a> : "Not provided", icon: Mail },
        { label: "Phone number", value: c.phone ? <a href={`tel:${c.phone}`} className="detail-contact">{c.phone}</a> : "Not provided", icon: Phone },
        { label: "Account status", value: c.status ? "Active" : "Blocked", icon: ShieldCheck },
      ]}/>
      <h2 className="detail-form-heading">Contact information</h2>
      <p className="detail-form-description">Keep the customer’s contact details up to date.</p>
      <ClientForm action={updateClient.bind(null, Number(id))} values={{ fname: c.fname, lname: c.lname, phone: c.phone, email: c.email }} withPassword={false} submit="Save client" />
    </DetailPage>
  );
}
