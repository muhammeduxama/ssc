import type { Metadata } from "next";
import { Html, QuoteHero, PageHero, SchemaCode } from "@/components/site/blocks";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const a = await db.abouts.findUnique({ where: { id: BigInt(1) } });
  return { title: { absolute: a?.meta_title || "About Smart Servicing Centre" }, description: a?.meta_description ?? undefined, keywords: a?.meta_keywords ?? undefined };
}

export default async function About() {
  const about = await db.abouts.findUnique({ where: { id: BigInt(1) } });
  return (
    <>
      <SchemaCode code={about?.schema_code} />
      <PageHero eyebrow="A little about us" title="Making car care work for you.">Connecting car owners with local mechanics and garages, with a simpler way to book and manage the work.</PageHero>
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8"><Html html={about?.description} /></section>
      <QuoteHero secondary />
    </>
  );
}
