import Link from "next/link";
import { ArticleGuide } from "@/components/site/ArticleGuide";
import { QuoteForm } from "@/components/site/QuoteForm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChipGrid, SchemaCode } from "@/components/site/blocks";
import { PriceTable } from "@/components/site/PriceTable";
import { db } from "@/lib/db";
import { decodeSlug, exact, popularRepairs } from "@/lib/site";

export const dynamic = "force-dynamic";
const load = async (raw: string) => {
  const slug = decodeSlug(raw);
  return exact(await db.servicepages.findMany({ where: { slug }, include: { services: { select: { name: true } } } }), slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return { title: { absolute: p?.page_title || p?.name || "Service" }, description: p?.seo_description ?? undefined, keywords: p?.seo_keywords ?? undefined };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await load((await params).slug);
  if (!page) redirect("/");
  const [stats, top] = await Promise.all([popularRepairs((o) => o.notes === page.services.name), db.servicepages.findMany({ take: 9, select: { name: true, slug: true } })]);
  return (
    <>
      <SchemaCode code={page.schema_code} />
      <header className="page-hero">
        <div className="site-container grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          <div><nav aria-label="Breadcrumb" className="mb-7 flex gap-2 text-xs text-muted"><Link href="/">Home</Link><span>/</span><Link href="/service/all">Services</Link><span>/</span><span>{page.name}</span></nav><span className="eyebrow">Understand your car</span><h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{page.job_title || page.name}</h1><p className="mt-5 max-w-lg text-lg leading-8 text-muted">What to know, what to look for, and how to get the right help for your vehicle.</p><a href="#article" className="text-link mt-6">Explore the guide ↓</a></div>
          <div id="quote" className="quote-panel scroll-mt-24"><h2 className="font-display text-xl font-semibold">Get a quote for your car</h2><p className="mb-5 mt-2 text-sm text-muted">Start with your registration and postcode.</p><QuoteForm compact /></div>
        </div>
      </header>
      <div id="article" className="scroll-mt-24"><ArticleGuide html={page.content} title={page.job_title || page.name}>
        <PriceTable title="Example prices for this repair" rows={stats} />
      </ArticleGuide></div>
      <ChipGrid eyebrow="Top jobs" title="Popular repairs" items={top.map((x) => ({ href: `/service/${x.slug}`, label: x.name }))} more="/service/all" tone="sunken" />
    </>
  );
}
