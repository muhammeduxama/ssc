import Link from "next/link";
import { prepareArticle } from "@/components/site/ArticleGuide";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Html, SchemaCode } from "@/components/site/blocks";
import { cardSelect, Categories, PostCard } from "@/components/site/BlogBits";
import { asset } from "@/lib/asset";
import { db } from "@/lib/db";
import { exact, sample } from "@/lib/site";

export const dynamic = "force-dynamic";
const dec = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
const load = async (raw: string) => {
  const slug = dec(raw);
  return exact(await db.blogs.findMany({ where: { slug }, include: { blogcategories: { select: { title: true, slug: true } } } }), slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = await load((await params).slug);
  return { title: { absolute: b?.meta_title || b?.title || "Blog" }, description: b?.meta_description ?? undefined, keywords: b?.meta_keywords ?? undefined };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const blog = await load((await params).slug);
  if (!blog) redirect("/");
  await db.blogs.update({ where: { id: blog.id }, data: { views: { increment: 1 } } });
  const [categs, ids] = await Promise.all([
    db.blogcategories.findMany({ where: { status: true }, select: { title: true, slug: true } }),
    db.blogs.findMany({ where: { status: true, NOT: { id: blog.id } }, select: { id: true } }),
  ]);
  const pick = sample(ids, 6).map((r) => r.id);
  const more = await db.blogs.findMany({ where: { id: { in: pick } }, select: cardSelect });
  const article = prepareArticle(blog.description);
  return (
    <>
      <SchemaCode code={blog.schema_code} />
      <article className="site-container grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-7 flex gap-2 text-xs text-muted"><Link href="/">Home</Link><span>/</span><Link href="/blog">Car care journal</Link></nav>
          <a href={`/blog/tag/${blog.blogcategories.slug}`} className="eyebrow">{blog.blogcategories.title}</a>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.15] tracking-[-.035em] sm:text-5xl">{blog.title}</h1>
          <div className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-muted">
            {blog.created_at?.toLocaleDateString("en-GB", { dateStyle: "long" })}{blog.author ? ` · ${blog.author}` : ""} · {article.minutes} min read
          </div>
          {blog.feature_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset(blog.feature_image)} alt={blog.feature_image_alertnative ?? ""} className="mt-8 max-h-[520px] w-full rounded-2xl border border-line object-cover" />
          )}
          <div className="reading-article mt-10"><Html html={article.html} /></div>
          {more.length > 0 && (
            <section className="mt-14">
              <h2 className="font-display text-2xl font-semibold">You may also like</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{more.map((b) => <PostCard key={String(b.id)} b={b} />)}</div>
            </section>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start"><Categories categs={categs} active={blog.blogcategories.slug} /></aside>
      </article>
    </>
  );
}
