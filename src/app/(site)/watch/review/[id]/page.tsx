import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead, QuoteHero, ReviewCards, SectionTitle, Stars } from "@/components/site/blocks";
import { mechanicHref } from "@/components/site/MechanicCard";
import { db } from "@/lib/db";
import { completedJobs } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer review" };

export default async function WatchReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) redirect("/");
  const review = await db.reviews.findUnique({ where: { id: BigInt(id) }, include: { users: true } });
  if (!review) redirect("/");
  const [reviews, done] = await Promise.all([
    db.reviews.findMany({ where: { user_id: review.user_id }, orderBy: { id: "desc" }, include: { orders: { include: { users: { select: { fname: true, lname: true } } } } } }),
    completedJobs(review.user_id),
  ]);
  const m = review.users;
  return (
    <>
      <PageHead
        top={<nav aria-label="Breadcrumb" className="flex gap-2 text-xs text-muted"><Link href="/">Home</Link><span>/</span><Link href={mechanicHref(m)}>{m.company || `${m.fname} ${m.lname}`}</Link><span>/</span><span>Review</span></nav>}
        eyebrow="Customer review"
        title={m.company || `${m.fname} ${m.lname}`}
      >
        <span className="flex flex-wrap items-center gap-3"><Stars value={review.overall} /> {m.city ? `Mobile mechanic in ${m.city}` : "Mobile mechanic"} · {done} jobs completed</span>
      </PageHead>
      <section className="site-container py-12 sm:py-16">
        <figure className="quote-panel max-w-3xl">
          <blockquote className="font-display text-xl leading-9 sm:text-2xl">“{review.review}”</blockquote>
          <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm text-muted">
            <Stars value={review.overall} size={14} />
            <Link href={mechanicHref(m)} className="text-link">View mechanic profile <ArrowRight size={16} /></Link>
          </figcaption>
        </figure>
        {reviews.length > 1 && (
          <div className="mt-16">
            <SectionTitle eyebrow="More from this mechanic" title="Other customer reviews" />
            <ReviewCards reviews={reviews.filter((r) => r.id !== review.id).map((r) => ({ id: Number(r.id), name: `${r.orders.users.fname} ${r.orders.users.lname}`, rating: r.overall, text: r.review ?? "" }))} />
          </div>
        )}
      </section>
      <QuoteHero secondary />
    </>
  );
}
