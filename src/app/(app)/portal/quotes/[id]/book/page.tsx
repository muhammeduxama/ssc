import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { bookAdminQuote } from "@/app/actions/portal";
import { ScheduleForm } from "@/components/booking/ScheduleForm";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { carOf } from "@/lib/portal";

export const metadata: Metadata = { title: "Book your quote" };

/** QuoteController@acceptAdminQuote — book the quote SSC prepared. */
export default async function BookAdminQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireCustomer();
  const o = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), user_id: me.id }, include: { postcodes: { include: { cities: true } }, adminquotes: { take: 1, include: { adminquotedetails: true } } } }) : null;
  const q = o?.adminquotes[0];
  if (!o || !q) redirect("/portal/quotes");
  const car = carOf(o.car_data);
  return (
    <>
      <PageHeader eyebrow={`Quote #${o.id}`} title="We need a few more details to complete your booking" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ScheduleForm action={bookAdminQuote.bind(null, Number(o.id))} address={{ house: me.house_no ?? "", street: me.street ?? "", city: me.city || o.postcodes.cities.name }} />
        <aside className="card space-y-3 p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Your basket</div>
          <div><span className="font-mono font-bold uppercase">{car.reg}</span><div className="text-sm text-muted">{car.line}</div></div>
          <ul className="space-y-1 text-sm">{q.adminquotedetails.map((d) => <li key={String(d.id)} className="flex justify-between gap-2"><span>{d.name}</span><span>{gbp(d.price)}</span></li>)}</ul>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>Total</span><span>{gbp(q.price)}</span></div>
          {q.notes && <p className="text-xs text-muted">{q.notes}</p>}
        </aside>
      </div>
    </>
  );
}
