import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/blocks";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "All services" };

export default async function AllServices() {
  const cats = await db.maincategories.findMany({ where: { status: true }, orderBy: { id: "asc" }, include: { servicepages: { where: { status: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } } } });
  return (
    <>
      <PageHero eyebrow="From routine to repairs" title="The right care for your car.">Explore servicing, diagnostics, and repairs. Choose a service to learn more and get a quote for your vehicle.</PageHero>
      <section className="site-container space-y-12 py-16">
        {cats.map((c) => (
          <div key={String(c.id)}>
            <h2 className="font-display text-2xl font-semibold">{c.title}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {c.servicepages.map((p) => (
                <li key={p.slug}><Link href={`/service/${p.slug}`} className="browse-card"><span>{p.name}</span><ArrowRight size={16} className="shrink-0 text-brand" /></Link></li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
