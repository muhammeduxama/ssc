import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thank you" };

/** HomeController@orderStatus */
export default async function OrderStatus({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const order = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), ...(s.kind === "user" ? { user_id: BigInt(s.id) } : {}) } }) : null;
  if (!order) redirect("/dashboard");
  const quote = order.price == null || Number(order.price) <= 0;
  const next = quote
    ? ["Your job has been offered to our network of service providers and their quotes will be emailed to you.", "We have notified mechanics in your area about your order.", "Once you have received your quotes, simply choose the best quote for you.", "It can take a bit longer for a garage / mobile mechanic to send you a quote if you have a rare car or if you live in a rural area. If there are any issues our friendly customer service team will contact you."]
    : ["We're currently finding the best mobile mechanic/garage for you from our network.", "Once we've matched your booking request with a trusted garage / mobile mechanic, you will receive an email confirmation. This typically takes less than 5 hours.", "It can take a bit longer to find a suitable garage / mobile mechanic if you have a rare car or if you live in a rural area. If there are any issues, our friendly customer service team will contact you."];
  return (
    <>
    <PageHead top={<span className="icon-tile !bg-ok-soft !text-ok"><CheckCircle2 size={22} /></span>} eyebrow={quote ? "Quote request sent" : "Booking request sent"} title="Thanks! You're all set.">
      <p>We have sent a confirmation email to {s.email}.</p>
      <p className="mt-1">{quote ? "Your job has been offered to our network of service providers and their quotes will be emailed to you." : "We have sent your request to local mobile mechanics and garages."}</p>
    </PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="quote-panel max-w-3xl">
        <h2 className="font-display text-xl font-semibold">What happens next</h2>
        <ol className="mt-4 space-y-3">{next.map((t, i) => <li key={i} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs text-brand">{i + 1}</span><span className="text-muted">{t}</span></li>)}</ol>
        <Link href="/dashboard" className="btn btn-primary mt-8">View my dashboard</Link>
      </div>
    </section>
    </>
  );
}
