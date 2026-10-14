import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import { ReviewReply } from "@/components/mechanic/ReviewReply";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Respond to review" };

/** Mechanic\HomeController@respondReview — link from the "new review" email. */
export default async function RespondReview({ params }: { params: Promise<{ token: string }> }) {
  const s = await requireRole("mechanic");
  const { token } = await params;
  const order = await db.orders.findUnique({ where: { token }, include: { orderassigns: { take: 1 }, reviews: { take: 1 } } });
  const review = order?.reviews[0];
  if (!order || order.status !== "completed" || String(order.orderassigns[0]?.user_id) !== s.id || !review || String(review.user_id) !== s.id) notFound();
  return (
    <>
      <PageHeader eyebrow={`Booking #${order.id}`} title="Respond to your review" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={20} className={n <= review.overall ? "fill-accent text-accent" : "text-line-strong"} />)}</div>
          <p className="mt-3 font-mono text-xs text-muted">Quality {review.quality}/5 · Punctuality {review.punctuality}/5 · Communication {review.communication}/5</p>
          <p className="mt-4">{review.review}</p>
        </section>
        <section className="card p-6"><ReviewReply id={Number(review.id)} initial={review.response ?? ""} /></section>
      </div>
    </>
  );
}
