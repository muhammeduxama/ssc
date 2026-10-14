import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BespokeEditor } from "@/components/mechanic/BespokeForms";
import { Field, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { settings } from "@/lib/mechanic/jobs";

export const metadata = { title: "Estimate" };
export default async function BespokePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("mechanic");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await db.bespokes.findFirst({ where: { id: BigInt(id), user_id: BigInt(s.id) }, include: { bespokelabours: { orderBy: { id: "asc" } }, bespokeparts: { orderBy: { id: "asc" } }, bespokeusers: { take: 1 } } });
  if (!b) notFound();
  const me = await db.users.findUniqueOrThrow({ where: { id: BigInt(s.id) } });
  const pc = me.post_code ? await db.postcodes.findFirst({ where: { postcode: me.post_code.replace(/\s+/g, "").toUpperCase() }, include: { cities: true } }) : null;
  const rate = Number(pc?.cities?.labour_rate ?? (await settings()).labourRate);
  const c = parseCar(b.car_data);
  const u = b.bespokeusers[0];
  return (
    <>
      <Link href="/mechanic/bespokes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Bespoke quotes</Link>
      <PageHeader eyebrow={`Estimate #${id}`} title={carTitle(c)} />
      <section className="card mb-4 p-6">
        <dl className="grid gap-4 sm:grid-cols-4">
          <Field label="Customer">{u ? [u.fname, u.lname].filter(Boolean).join(" ") || "—" : "—"}</Field>
          <Field label="Email">{u?.email}</Field>
          <Field label="Vehicle">{[c.make, c.model, c.engine, c.fuel, c.year].filter(Boolean).join(" ")} · <span className="font-mono">{c.reg}</span></Field>
          <Field label="Postcode">{b.postcode}</Field>
        </dl>
        {b.service && <p className="mt-4 rounded-lg bg-sunken p-3 text-sm">{b.service}</p>}
      </section>
      <BespokeEditor id={Number(b.id)} status={b.status} total={Number(b.price)} labourRate={rate} labours={b.bespokelabours.map((l) => ({ id: Number(l.id), name: l.name, price: Number(l.price), hour: l.hour }))} parts={b.bespokeparts.map((p) => ({ id: Number(p.id), name: p.name, price: Number(p.price) }))} />
    </>
  );
}
