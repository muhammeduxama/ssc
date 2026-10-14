import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArticleGuide } from "@/components/site/ArticleGuide";
import { ChipGrid, SchemaCode } from "@/components/site/blocks";
import { PriceTable } from "@/components/site/PriceTable";
import { QuoteForm } from "@/components/site/QuoteForm";
import { db } from "@/lib/db";
import { popularRepairs } from "@/lib/site";

export const dynamic = "force-dynamic";
const page = () => db.servicepages.findFirst({ where: { slug: "mobile-mechanics" } });

export async function generateMetadata(): Promise<Metadata> {
  const p = await page();
  return { title: { absolute: p?.page_title || "Mobile Mechanics" }, description: p?.seo_description ?? undefined, keywords: p?.seo_keywords ?? undefined };
}

export default async function MobileMechanics() {
  const [p, pages, cities, stats] = await Promise.all([
    page(),
    db.servicepages.findMany({ take: 9, select: { name: true, slug: true } }),
    db.cities.findMany({ take: 12, select: { name: true, slug: true } }),
    popularRepairs(() => true),
  ]);
  if (!p) redirect("/");
  return (
    <>
      <SchemaCode code={p.schema_code} />
      <header className="page-hero">
        <div className="site-container grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="mb-7 flex gap-2 text-xs text-muted"><Link href="/">Home</Link><span>/</span><span>Mobile mechanics</span></nav>
            <span className="eyebrow">Mechanics who come to you</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{p.job_title || p.name}</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted">Servicing, repairs and diagnostics at your home or workplace, from vetted local mechanics.</p>
            <div className="mt-6 flex flex-wrap gap-6">
              <a href="#article" className="text-link">Read the guide ↓</a>
              <Link href="/city/all" className="text-link">Find mechanics near you <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div id="quote" className="quote-panel scroll-mt-24">
            <h2 className="font-display text-xl font-semibold">Get a quote for your car</h2>
            <p className="mb-5 mt-2 text-sm text-muted">Start with your registration and postcode.</p>
            <QuoteForm compact />
          </div>
        </div>
      </header>
      <div id="article" className="scroll-mt-24">
        <ArticleGuide html={p.content} title={p.job_title || p.name}>
          <PriceTable title="Example prices from recent quotes" rows={stats} showNotes />
        </ArticleGuide>
      </div>
      <ChipGrid eyebrow="Top jobs" title="Popular repairs" items={pages.map((x) => ({ href: `/service/${x.slug}`, label: x.name }))} more="/service/all" tone="sunken" />
      <ChipGrid eyebrow="Areas we cover" title="Mobile mechanics by city" items={cities.map((c) => ({ href: `/city/${c.slug}`, label: c.name }))} more="/city/all" />
    </>
  );
}
