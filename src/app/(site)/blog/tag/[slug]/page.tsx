import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Html, PageHero } from "@/components/site/blocks";
import { cardSelect, Categories, PostCard } from "@/components/site/BlogBits";
import { db } from "@/lib/db";
import { exact } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = exact(await db.blogcategories.findMany({ where: { slug } }), slug);
  return { title: c?.title ?? "Blog" };
}

export default async function BlogTag({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const ctg = exact(await db.blogcategories.findMany({ where: { slug } }), slug);
  if (!ctg) redirect("/");
  const where = { status: true, blogcategory_id: ctg.id };
  const [categs, rows, count] = await Promise.all([
    db.blogcategories.findMany({ where: { status: true }, select: { title: true, slug: true } }),
    db.blogs.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * 12, take: 12, select: cardSelect }),
    db.blogs.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(count / 12));
  return (
    <>
      <PageHero eyebrow="Car care journal" title={ctg.title}>
        <nav aria-label="Breadcrumb" className="flex gap-2 text-xs"><Link href="/">Home</Link><span>/</span><Link href="/blog">Car care journal</Link><span>/</span><span>{ctg.title}</span></nav>
      </PageHero>
      <div className="site-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <Html html={ctg.description} className="mb-8 text-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((b) => <PostCard key={String(b.id)} b={b} />)}</div>
          {pages > 1 && (
            <nav className="mt-8 flex flex-wrap gap-2" aria-label="Pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={`/blog/tag/${slug}?page=${n}`} aria-current={n === page ? "page" : undefined} className={`btn !px-3 !py-1.5 ${n === page ? "btn-primary" : "btn-secondary"}`}>{n}</Link>
              ))}
            </nav>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start"><Categories categs={categs} active={slug} /></aside>
      </div>
    </>
  );
}
