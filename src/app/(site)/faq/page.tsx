import { FaqList } from "@/components/site/FaqList";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHero } from "@/components/site/blocks";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "FREQUENTLY ASKED QUESTIONS | Smart Servicing centre" } };

export default async function Faq() {
  const faqs = await db.faqs.findMany({ orderBy: { id: "asc" } });
  return (
    <>
      <PageHero eyebrow="A little clarity" title="Your questions, answered.">
        From choosing a service to managing your booking, find the details you need right here.
      </PageHero>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <FaqList items={faqs.map((f) => ({ id: String(f.id), title: f.title, description: f.description ?? "" }))} />
        <div className="mt-10 rounded-2xl bg-brand-soft p-7"><h2 className="font-display text-xl font-semibold">Still have a question?</h2><p className="mt-2 text-sm text-muted">Our team can help you find the right next step.</p><Link href="/contact-us" className="btn btn-primary mt-5">Contact our team</Link></div>
      </section>
    </>
  );
}
