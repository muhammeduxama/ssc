import { CheckCircle2, ExternalLink, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, dateTime, gbp, parseCar } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { appUrl } from "@/lib/mail/layout";

export const metadata = { title: "Payments" };

/** Mechanic\Payment\PaymentController@payments: Stripe Connect + completed jobs. */
export default async function Payments({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const s = await requireRole("mechanic");
  const sp = await searchParams;
  const me = BigInt(s.id);
  const [keys, conn, jobs, user] = await Promise.all([
    db.stripes.findFirst({ select: { client_id: true } }),
    db.userstripes.findFirst({ where: { user_id: me } }),
    db.orderassigns.findMany({ where: { user_id: me, status: "completed" }, orderBy: { updated_at: "desc" }, include: { orders: { include: { orderpayments: { take: 1 } } } } }),
    db.users.findUniqueOrThrow({ where: { id: me }, select: { email: true } }),
  ]);
  const connect = keys?.client_id
    ? `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${keys.client_id}&scope=read_write&redirect_uri=${encodeURIComponent(appUrl("/mechanic/stripe/response"))}&stripe_user[business_type]=standard&stripe_user[email]=${encodeURIComponent(user.email)}`
    : null;
  const earned = jobs.reduce((t, j) => t + Number(j.orders.orderpayments[0]?.mechanic_payment ?? 0), 0);
  return (
    <>
      <PageHeader eyebrow="Business overview" title="Payments & earnings" description="Your payout account and a clear record of payments from completed work."><Link href="/messages" className="btn btn-secondary"><LifeBuoy size={16}/> Payment support</Link></PageHeader>
      {sp.stripe === "error" && <p className="mb-4 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm">Stripe didn’t finish connecting. Please try again.</p>}
      <div className="mech-payment-overview">
        <section className="mech-payment-card">
          <h2 className="font-display text-lg font-semibold">Stripe payouts</h2>
          {conn?.stripe_user_id ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ok"><CheckCircle2 size={18} /> Connected ({conn.livemode ? "live" : "test"} mode) · {conn.stripe_user_id}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">Connect your Stripe account so customers’ card payments go straight to you. Smart Servicing Centre’s commission is taken automatically.</p>
              {connect ? <a href={connect} className="btn btn-primary mt-4"><ExternalLink size={16} /> Connect with Stripe</a> : <p className="mt-3 text-sm text-danger">Stripe is not configured yet — contact support.</p>}
            </>
          )}
        </section>
        <section className="mech-payment-card">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Paid out for completed jobs</div>
          <div className="mech-payout-total">{gbp(earned)}</div>
          <p className="mt-1 text-sm text-muted">Recorded payments for your completed jobs. Bank arrival times follow your Stripe payout schedule.</p>
        </section>
      </div>
      {jobs.length === 0 ? <Empty title="No completed jobs yet" /> : (
        <div className="card overflow-hidden"><div className="mech-panel-heading"><div><h2>Payment history</h2><p>Charges, platform fees and your recorded share.</p></div><span>{jobs.length} completed jobs</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] section-responsive-table">
          <thead><tr><th className="th">Booking</th><th className="th">Vehicle</th><th className="th text-right">Charged</th><th className="th text-right">Fee</th><th className="th text-right">You received</th><th className="th">Completed</th></tr></thead>
          <tbody>{jobs.map((j) => { const p = j.orders.orderpayments[0]; const c = parseCar(j.orders.car_data); return (
            <tr key={String(j.id)}>
              <td className="td font-mono text-xs" data-label="Booking"><Link href={`/mechanic/jobs/${j.id}`} className="font-semibold text-brand hover:underline">#{String(j.order_id)}</Link></td>
              <td className="td" data-label="Vehicle">{carTitle(c)} <span className="font-mono text-xs text-muted">{c.reg}</span></td>
              <td className="td text-right font-mono" data-label="Charged">{gbp(p?.total_payment ?? j.price)}</td>
              <td className="td text-right font-mono text-muted" data-label="Fee">{gbp(p?.platform_fee ?? 0)}</td>
              <td className="td text-right font-mono font-semibold text-brand" data-label="You received">{gbp(p?.mechanic_payment ?? 0)}</td>
              <td className="td font-mono text-xs text-muted" data-label="Completed">{dateTime(j.updated_at)}</td>
            </tr>
          ); })}</tbody>
        </table></div></div>
      )}
    </>
  );
}
