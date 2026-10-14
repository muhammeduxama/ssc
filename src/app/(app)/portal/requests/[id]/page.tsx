import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AskQuestion } from "@/components/portal/AskQuestion";
import { PageHeader } from "@/components/ui";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { carOf } from "@/lib/portal";
import { MechanicAvatar } from "@/components/site/ThemeIcons";

export const metadata: Metadata = { title: "Quote details" };

/** PortalController@quoteDetails — one mechanic's quote (owner only; Laravel had no ownership check). */
export default async function RequestDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await currentCustomer())!;
  const r = /^\d+$/.test(id)
    ? await db.orderrequests.findFirst({ where: { id: BigInt(id), orders: { user_id: me.id } }, include: { users: true, orders: { include: { ordertracks: { take: 1, include: { services: { select: { name: true } } } } } }, orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } } } })
    : null;
  if (!r) redirect("/portal/quotes");
  const car = carOf(r.orders.car_data);
  const q = r.orderrequestquotes[0];
  return (
    <>
      <PageHeader eyebrow={`${car.title} · ${car.reg ?? ""}`} title={r.orders.ordertracks[0]?.services.name ?? "Repair quote"} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <MechanicAvatar photo={r.users.profile_photo_path} className="h-20 w-20" ring="border border-line" />
            <div>
              <div className="font-display text-xl font-semibold">{r.users.company || `${r.users.fname} ${r.users.lname}`}</div>
              {q && <div className="font-display text-2xl font-semibold text-brand">{gbp(q.price)}</div>}
            </div>
          </div>
          {q && (
            <ul className="mt-4 space-y-1 text-sm">
              {q.orderrequestquotelabours.map((l) => <li key={`l${l.id}`} className="flex justify-between"><span>{l.name}</span><span>{gbp(l.price)}</span></li>)}
              {q.orderrequestquoteparts.map((p) => <li key={`p${p.id}`} className="flex justify-between text-muted"><span>{p.name}</span><span>{gbp(p.price)}</span></li>)}
            </ul>
          )}
          {r.orders.notes && <div className="mt-4"><div className="label">Notes</div><p className="text-sm">{r.orders.notes}</p></div>}
          {q && r.orders.status === "pending" && <Link href={`/portal/quotes/${r.order_id}/accept/${r.id}`} className="btn btn-primary mt-5">Book me in</Link>}
        </section>
        <section className="card p-6"><AskQuestion requestId={Number(r.id)} /></section>
      </div>
    </>
  );
}
