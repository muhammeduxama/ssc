import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { QuoteForm } from "@/components/site/QuoteForm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChipGrid, Html, ReviewCards, SchemaCode, SectionTitle } from "@/components/site/blocks";
import { MechanicCard } from "@/components/site/MechanicCard";
import { PriceTable } from "@/components/site/PriceTable";
import { db } from "@/lib/db";
import { decodeSlug, exact, popularRepairs } from "@/lib/site";

export const dynamic = "force-dynamic";
const load = async (raw: string) => {
  const slug = decodeSlug(raw);
  return exact(await db.cities.findMany({ where: { slug } }), slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  return { title: { absolute: c?.page_title || c?.name || "City" }, description: c?.seo_description ?? undefined, keywords: c?.seo_keywords ?? undefined };
}

const withCounts = async (rows: { id: bigint; company: string | null; note: string | null; profile_photo_path: string | null; city: string | null }[]) => {
  const counts = await db.orderassigns.groupBy({ by: ["user_id"], where: { status: "completed", user_id: { in: rows.map((r) => r.id) } }, _count: true });
  const by = new Map(counts.map((c) => [String(c.user_id), c._count]));
  const ratings = await db.reviews.groupBy({ by: ["user_id"], where: { user_id: { in: rows.map((r) => r.id) } }, _avg: { overall: true }, _count: true });
  const scores = new Map(ratings.map((r) => [String(r.user_id), r]));
  return rows.map((r) => ({ ...r, completed: by.get(String(r.id)) ?? 0, where: r.city ? `Based in ${r.city}` : "Location not listed", rating: scores.get(String(r.id))?._avg.overall ?? null, reviewCount: scores.get(String(r.id))?._count ?? 0 }));
};

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await load((await params).slug);
  if (!page) redirect("/city/all");
  const sel = { id: true, company: true, note: true, profile_photo_path: true, city: true } as const;
  const [cities, reviews, local, othersAll, stats] = await Promise.all([
    db.cities.findMany({ take: 12, select: { name: true, slug: true } }),
    db.reviews.findMany({ where: { city: page.name }, orderBy: { id: "desc" }, include: { orders: { include: { users: { select: { fname: true, lname: true } } } } } }),
    db.users.findMany({ where: { role_id: 1, city: page.name }, take: 10, select: sel }),
    db.users.findMany({ where: { role_id: 1, NOT: { city: page.name } }, orderBy: { id: "asc" }, take: 6, select: sel }),
    popularRepairs((o) => o.city === page.name),
  ]);
  const mechanics = await withCounts([...local, ...othersAll]);
  const localMechanics = mechanics.filter((m) => m.city === page.name);
  const otherMechanics = mechanics.filter((m) => m.city !== page.name);
  return (
    <>
      <SchemaCode code={page.schema_code} />
      <header className="page-hero"><div className="site-container grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-16"><div><Link href="/city/all" className="text-link mb-7">← All locations</Link><div className="flex items-center gap-2 text-sm font-medium text-brand"><MapPin size={18} />{page.name}</div><h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Car care, local to {page.name}.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-muted">Meet local mechanics, explore their experience, and read customer reviews before taking the next step.</p><a href="#mechanics" className="text-link mt-6">Explore mechanics <ArrowRight size={17} /></a></div><div id="quote" className="quote-panel scroll-mt-24"><h2 className="font-display text-xl font-semibold">Find services in your area</h2><p className="mb-6 mt-2 text-sm text-muted">Enter your vehicle and postcode to start a quote.</p><QuoteForm compact /></div></div></header>
      {page.description && <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6"><Html html={page.description} /></section>}
      <section id="mechanics" className="site-container scroll-mt-24 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4"><SectionTitle eyebrow="Meet the local network" title={`Mechanics based in ${page.name}`} /><span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand">{localMechanics.length} profiles</span></div>
        <ul className="mt-8 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">{localMechanics.map((m) => <MechanicCard key={String(m.id)} m={m} />)}</ul>
        {!localMechanics.length && <p className="mt-6 rounded-2xl bg-night p-6 text-muted">No local profiles are listed yet. Enter your postcode above to check service options.</p>}
        {!!otherMechanics.length && <div className="mt-16"><SectionTitle eyebrow="Explore the wider network" title="Mechanics based elsewhere" /><p className="mt-3 text-sm text-muted">These profiles are outside {page.name}. Coverage and availability need to be confirmed when booking.</p><ul className="mt-7 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">{otherMechanics.map((m) => <MechanicCard key={String(m.id)} m={m} />)}</ul></div>}
        <PriceTable title={`Popular repairs in ${page.name}`} rows={stats} showNotes />
      </section>
      {reviews.length > 0 && (
        <section className="bg-sunken py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="Reviews" title="Recent mechanic reviews near you" />
            <ReviewCards reviews={reviews.map((r) => ({ id: Number(r.id), name: `${r.orders.users.fname} ${r.orders.users.lname}`, rating: r.overall, text: r.review ?? "" }))} />
          </div>
        </section>
      )}
      <ChipGrid eyebrow="Area we cover" title="Other cities" items={cities.map((c) => ({ href: `/city/${c.slug}`, label: c.name }))} more="/city/all" />
    </>
  );
}
