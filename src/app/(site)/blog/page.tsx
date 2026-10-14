import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHero, SectionTitle } from "@/components/site/blocks";
import { cardSelect, Categories, PostCard } from "@/components/site/BlogBits";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };

// BlogController@index: fixed category sections with their Laravel limits.
const SECTIONS: [number, number][] = [[16, 4], [13, 10], [1, 19], [14, 10], [17, 5], [15, 19]];

export default async function Blog() {
  const [categs, recent, ...sections] = await Promise.all([
    db.blogcategories.findMany({ where: { status: true }, select: { id: true, title: true, slug: true } }),
    db.blogs.findMany({ where: { status: true }, orderBy: { created_at: "desc" }, take: 5, select: cardSelect }),
    ...SECTIONS.map(([id, take]) => db.blogs.findMany({ where: { status: true, blogcategory_id: BigInt(id) }, orderBy: { created_at: "desc" }, take, select: cardSelect })),
  ]);
  const name = (id: number) => categs.find((c) => Number(c.id) === id);
  return (
    <>
      <PageHero eyebrow="Car care journal" title="Car care advice, prices and know-how.">Guides to servicing, repairs and running costs, written to help you make the right call for your car.</PageHero>
      <div className="site-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-14">
          {recent.length > 0 && (
            <section>
              <SectionTitle eyebrow="Latest" title="Recent posts" />
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="md:row-span-2"><PostCard b={recent[0]} big /></div>
                {recent.slice(1).map((b) => <PostCard key={String(b.id)} b={b} />)}
              </div>
            </section>
          )}
          {SECTIONS.map(([id], i) => {
            const rows = sections[i];
            const c = name(id);
            if (!rows.length || !c) return null;
            return (
              <section key={id}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <SectionTitle title={c.title} />
                  <Link href={`/blog/tag/${c.slug}`} className="text-link">View all <ArrowRight size={16} /></Link>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((b) => <PostCard key={String(b.id)} b={b} />)}</div>
              </section>
            );
          })}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start"><Categories categs={categs} /></aside>
      </div>
    </>
  );
}
