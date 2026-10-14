import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderEditForm } from "@/components/admin/OrderEditForm";
import { PageHeader } from "@/components/ui";
import { getAdminOrder } from "@/lib/admin/orders";
import { requireStaff } from "@/lib/guard";
import { updateOrder } from "../../../actions";

export default async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const o = await getAdminOrder(Number(id));
  if (!o) notFound();
  const back = `/admin/orders/view/${o.id}`;
  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Order #{o.id}</Link>
      <PageHeader eyebrow={`Order #${o.id}`} title="Edit order" />
      <OrderEditForm
        action={updateOrder.bind(null, o.id)}
        back={back}
        hasAssign={!!o.assigned}
        v={{
          reg: o.car.reg ?? "",
          date: o.assigned?.date ?? "",
          time: o.assigned?.time ?? "",
          street: o.customer.street,
          city: o.customer.city,
          county: o.customer.county,
          postcode: o.customer.postcode,
          notes: o.notes ?? "",
        }}
      />
    </>
  );
}
