import { Star } from "lucide-react";
import Link from "next/link";
import { AddReview, ReviewRow } from "@/components/tools/ReviewTools";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, dateTime, parseCar } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Order reviews" };

/** Admin\Order\ReviewController (resource /ssc/order/reviews) */
export default async function Reviews() {
  await requireStaff();
  const [reviews, orders] = await Promise.all([
    db.reviews.findMany({ orderBy: { id: "desc" }, include: { users: { select: { company: true, fname: true, lname: true } }, orders: { select: { id: true, car_data: true, users: { select: { fname: true, lname: true } } } } } }),
    db.orders.findMany({ where: { status: "completed" }, orderBy: { id: "desc" }, select: { id: true, car_data: true, users: { select: { fname: true, lname: true } } } }),
  ]);
  return (
    <>
      <PageHeader eyebrow={`${reviews.length} reviews`} title="Order reviews" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[820px]">
          <thead><tr><th className="th">Order</th><th className="th">Mechanic</th><th className="th">Customer</th><th className="th">Ratings</th><th className="th">Review</th><th className="th">Mechanic response</th><th className="th text-right"></th></tr></thead>
          <tbody>{reviews.map((r) => (
            <tr key={String(r.id)} className="align-top">
              <td className="td font-mono text-xs"><Link href={`/admin/orders/view/${r.order_id}`} className="font-semibold text-brand hover:underline">#{String(r.order_id)}</Link><div className="text-muted">{dateTime(r.created_at)}</div></td>
              <td className="td">{r.users.company || `${r.users.fname} ${r.users.lname}`}</td>
              <td className="td">{r.orders.users.fname} {r.orders.users.lname}</td>
              <td className="td text-xs"><div className="flex items-center gap-1 font-semibold"><Star size={13} className="fill-accent text-accent" /> {r.overall}/5 overall</div><div className="font-mono text-muted">Q {r.quality} · P {r.punctuality} · C {r.communication}</div></td>
              <td className="td max-w-64 text-sm">{r.review || "—"}</td>
              <td className="td max-w-56 text-sm text-muted">{r.response || "—"}</td>
              <td className="td"><ReviewRow r={{ id: Number(r.id), quality: r.quality, punctuality: r.punctuality, communication: r.communication, overall: r.overall, review: r.review ?? "" }} /></td>
            </tr>
          ))}</tbody>
        </table></div></div>
        <AddReview orders={orders.map((o) => ({ id: Number(o.id), label: `#${o.id} · ${carTitle(parseCar(o.car_data))} · ${o.users.fname} ${o.users.lname}` }))} />
      </div>
    </>
  );
}
