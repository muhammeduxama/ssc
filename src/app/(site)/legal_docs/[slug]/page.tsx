import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Html, PageHero } from "@/components/site/blocks";
import { db } from "@/lib/db";
import { formatLegal } from "@/lib/legal-format";

export const dynamic = "force-dynamic";

const TABS: [string, string][] = [
  ["customer-terms", "Terms & Conditions"],
  ["cookies", "Cookies Policy"],
  ["privacy", "Privacy Policy"],
  ["booking", "Booking Policy"],
  ["warranty", "Warranty requirements"],
  ["acceptable", "Acceptable Use Policy"],
];
// MySQL default collation is case-insensitive; Laravel used BINARY for exact slug matches.
const bySlug = async (slug: string) => (await db.pages.findMany({ where: { slug } })).find((p) => p.slug === slug) ?? null;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await bySlug((await params).slug);
  return { title: p?.title ?? "Legal documents" };
}

export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await bySlug(slug);
  if (!page) redirect("/");
  const terms = slug === "customer-terms" || slug === "mechanic-terms";
  const [mechanic, customer] = terms ? await Promise.all([bySlug("mechanic-terms"), bySlug("customer-terms")]) : [null, null];
  const current = TABS.find(([s]) => s === slug || (s === "customer-terms" && terms))?.[1] ?? page.title ?? "Legal documents";
  return (
    <>
      <PageHero eyebrow="Smart Servicing Centre" title={current}>The policies and terms that apply when you book with us or join our network.</PageHero>
      <section className="site-container py-12 sm:py-16">
        <div className="article-layout">
          <aside className="article-aside">
            <nav aria-label="Legal documents" className="rounded-2xl border border-line bg-night p-6">
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} className="text-brand" />Legal documents</div>
              <ul className="mt-5 space-y-1">
                {TABS.map(([s, label]) => {
                  const active = s === slug || (s === "customer-terms" && terms);
                  return (
                    <li key={s}>
                      <Link href={`/legal_docs/${s}`} aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:text-brand"}`}>{label}</Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
          <article className="reading-article min-w-0">
            {terms ? (
              <div className="space-y-14">
                <div><span className="eyebrow">For mechanics &amp; garages</span><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Mechanic terms &amp; conditions</h2><Html html={formatLegal(mechanic?.description)} className="legal-doc mt-6" /></div>
                <div className="border-t border-line pt-12"><span className="eyebrow">For customers</span><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Customer terms &amp; conditions</h2><Html html={formatLegal(customer?.description)} className="legal-doc mt-6" /></div>
              </div>
            ) : (
              <Html html={formatLegal(page.description)} className="legal-doc" />
            )}
          </article>
        </div>
      </section>
    </>
  );
}
