import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sendOrderMessage } from "@/app/actions/portal";
import { ActionForm } from "@/components/portal/ActionForm";
import { MessageCentreFields } from "@/components/portal/MessageCentreFields";
import { PageHeader } from "@/components/ui";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { MESSAGE_OPTIONS } from "@/lib/portal-options";

export const metadata: Metadata = { title: "Message centre" };

/** PortalController@messageCenter */
export default async function MessageCentre({ params }: { params: Promise<{ order: string; option: string }> }) {
  const { order, option } = await params;
  const me = (await currentCustomer())!;
  const n = Number(option);
  const o = /^\d+$/.test(order) && MESSAGE_OPTIONS[n] ? await db.orders.findFirst({ where: { id: BigInt(order), user_id: me.id }, include: { orderassigns: { take: 1 } } }) : null;
  if (!o || ((n === 3 || n === 4) && !o.orderassigns.length)) redirect("/portal/orders");
  const assigned = o.orderassigns.length > 0;
  return (
    <>
      <PageHeader eyebrow={MESSAGE_OPTIONS[n]} title={`Message SSC regarding booking #${o.id}`} />
      <div className="card max-w-2xl p-6">
        <ActionForm action={sendOrderMessage.bind(null, Number(o.id), n)} submit="Send">
          <MessageCentreFields cancel={n === 2 && !assigned} lead={!assigned && n === 1 ? "Please describe what change you want to make in the booking in as much detail as possible." : undefined} />
        </ActionForm>
      </div>
    </>
  );
}
