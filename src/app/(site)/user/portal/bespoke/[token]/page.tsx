import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BespokeAcceptForm } from "@/components/booking/BespokeAcceptForm";
import { NotCustomer } from "@/components/booking/NotCustomer";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { gbp, parseCar } from "@/lib/format";
import { getSession } from "@/lib/session";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your estimate" };

/** BespokeController@bespokeToken — the estimate a mechanic emailed; accept and book. */
export default async function BespokeEstimate({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await db.bespokes.findFirst({ where: { token }, include: { users: true, bespokelabours: true, bespokeparts: true, bespokeusers: { take: 1 } } });
  if (!b) redirect("/");
  const [me, s] = await Promise.all([currentCustomer(), getSession()]);
  const car = parseCar(b.car_data);
  return (
    <>
    <PageHead eyebrow={`Estimate from ${b.users.company || b.users.fname}`} title="Accept your estimate and book">Choose when and where the work happens, then save a card to confirm.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {s && !me ? <NotCustomer name={s.name} back={`/user/portal/bespoke/${token}`} /> : <BespokeAcceptForm token={token} guest={!me} postcode={b.postcode ?? ""} house={me?.house_no ?? ""} street={me?.street ?? ""} city={me?.city ?? ""} />}
        <aside className="card space-y-3 p-5 lg:sticky lg:top-20 lg:self-start">
          <div><span className="font-mono font-bold uppercase">{car.reg}</span><div className="text-sm text-muted">{[car.make, car.model, car.year, car.engine, car.fuel].filter(Boolean).join(" ")}</div></div>
          {b.service && <p className="text-sm">{b.service}</p>}
          <ul className="space-y-1 text-sm">
            {b.bespokelabours.map((l) => <li key={`l${l.id}`} className="flex justify-between gap-2"><span>{l.name}</span><span>{gbp(l.price)}</span></li>)}
            {b.bespokeparts.map((p) => <li key={`p${p.id}`} className="flex justify-between gap-2 text-muted"><span>{p.name}</span><span>{gbp(p.price)}</span></li>)}
          </ul>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>Total</span><span>{gbp(b.price)}</span></div>
          {!me && b.bespokeusers[0] && <p className="text-xs text-muted">Sent to {b.bespokeusers[0].email}. Sign in with that account, or create one below.</p>}
        </aside>
      </div>
    </section>
    </>
  );
}
