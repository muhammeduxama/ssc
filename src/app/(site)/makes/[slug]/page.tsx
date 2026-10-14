import { ArticleGuide } from "@/components/site/ArticleGuide";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChipGrid, QuoteHero, SchemaCode } from "@/components/site/blocks";
import { PriceTable } from "@/components/site/PriceTable";
import { db } from "@/lib/db";
import { decodeSlug, exact, popularRepairs } from "@/lib/site";

export const dynamic = "force-dynamic";
const load = async (raw: string) => {
  const slug = decodeSlug(raw);
  return exact(await db.makes.findMany({ where: { slug }, include: { makepages: { take: 1 } } }), slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = await load((await params).slug);
  const p = m?.makepages[0];
  return { title: { absolute: p?.page_title || m?.name || "Make" }, description: p?.page_description ?? undefined, keywords: p?.page_keywords ?? undefined };
}

export default async function MakePage({ params }: { params: Promise<{ slug: string }> }) {
  const make = await load((await params).slug);
  const page = make?.makepages[0];
  if (!make || !page) redirect("/");
  const [stats, makes] = await Promise.all([popularRepairs((o) => o.car.make === make.name), db.makes.findMany({ take: 12, select: { name: true, slug: true } })]);
  return (
    <>
      <SchemaCode code={page.schema_code} />
      <QuoteHero what={make.name} />
      <ArticleGuide html={page.detail} title={`${make.name} servicing and repairs`}>
        <PriceTable title={`Popular repairs for ${make.name}`} rows={stats} showNotes />
      </ArticleGuide>
      <ChipGrid eyebrow="Makes & models" title="We service most makes & models" items={makes.map((m) => ({ href: `/makes/${m.slug ?? ""}`, label: m.name }))} more="/make/all" tone="sunken" />
    </>
  );
}
