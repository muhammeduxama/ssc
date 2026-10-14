import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/portal/ReviewForm";
import { db } from "@/lib/db";
import { mechanicByRef } from "@/lib/magic";
import { PageHead } from "@/components/site/blocks";

export const metadata: Metadata = { title: "Review your mechanic" };

/** PortalController@review — rate the mechanic after a completed job (link from the completion email). */
export default async function ReviewPage({ params }: { params: Promise<{ otoken: string; api: string }> }) {
  const { otoken, api } = await params;
  const [mechanic, order] = await Promise.all([mechanicByRef(api), db.orders.findFirst({ where: { token: otoken }, include: { orderassigns: { take: 1 } } })]);
  if (!mechanic || !order || order.status !== "completed" || order.orderassigns[0]?.user_id !== mechanic.id) redirect("/");
  const r = await db.reviews.findFirst({ where: { order_id: order.id, user_id: mechanic.id } });
  return (
    <>
    <PageHead eyebrow={`Work review · booking #${String(order.id)}`} title={`How did ${mechanic.company || mechanic.fname} do?`}>Your review helps other drivers choose, and helps your mechanic improve.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="quote-panel max-w-2xl">
        <ReviewForm orderToken={otoken} apiToken={api} initial={{ work_quality: r?.quality ?? 0, punctuality: r?.punctuality ?? 0, communication: r?.communication ?? 0, overall: r?.overall ?? 0 }} text={r?.review ?? ""} />
      </div>
    </section>
    </>
  );
}
