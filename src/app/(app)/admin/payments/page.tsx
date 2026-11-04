import { DataTable } from "@/components/DataTable";
import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateTime, gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Payment details" };

/** HomeController@paymentDetails: successful order payments, newest first. */
export default async function Payments() {
  await requireStaff();
  const rows = await db.orderpayments.findMany({
    where: { status: "Success" },
    orderBy: { updated_at: "desc" },
    include: { orders: { include: { users: { select: { fname: true, lname: true } }, orderassigns: { take: 1, include: { users: { select: { company: true, fname: true, lname: true } } } } } } },
  });
  const total = rows.reduce((a, r) => a + Number(r.platform_fee ?? 0), 0);
  return (
    <>
      <PageHeader eyebrow={`${rows.length} payments · ${gbp(total)} platform fees`} title="Payments" description="Successful customer payments, mechanic payouts and platform fees." />
      {rows.length === 0 ? <Empty title="No successful payments yet" /> : (
        <DataTable caption="Successful payments" columns={[
          {key:"booking",label:"Booking",primary:true},{key:"mechanic",label:"Mechanic"},{key:"total",label:"Customer paid",align:"right"},{key:"payout",label:"Mechanic payout",align:"right"},{key:"fee",label:"Platform fee",align:"right"},{key:"date",label:"Charged"},
        ]} rows={rows.map((p) => { const m = p.orders.orderassigns[0]?.users; return {id:String(p.id), cells:{
          booking:<div><Link href={`/admin/orders/view/${p.order_id}`} className="record-title">Booking #{String(p.order_id)}</Link><p className="record-subtitle">{p.orders.users.fname} {p.orders.users.lname}</p></div>,
          mechanic:m ? m.company || `${m.fname} ${m.lname}` : "Not assigned", total:gbp(p.total_payment), payout:gbp(p.mechanic_payment), fee:<span className="font-semibold text-brand">{gbp(p.platform_fee)}</span>, date:<span className="record-date">{dateTime(p.updated_at)}</span>,
        }}; })} />
      )}
    </>
  );
}
