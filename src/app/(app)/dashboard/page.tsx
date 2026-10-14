import { CheckCircle2, ClipboardList, Clock, PoundSterling, TrendingUp, Users, Wrench, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { MechanicDashboard } from "@/components/mechanic/MechanicDashboard";
import { CustomerDashboard } from "@/components/portal/CustomerDashboard";
import { OrdersArea, StatusDonut, ValueBars } from "@/components/charts";
import { Kpi, PageHeader, StatusBadge } from "@/components/ui";
import { gbp, shortDate } from "@/lib/format";
import { getDashboard } from "@/lib/queries";
import { getSession, isStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (isStaff(s)) return <AdminDashboard name={s.name} />;
  if (s.role === "mechanic") return <MechanicDashboard id={s.id} name={s.name} />;
  if (s.role === "customer") return <CustomerDashboard id={s.id} name={s.name} />;
  const d = await getDashboard(s);
  const staff = isStaff(s);
  const first = s.name.split(" ")[0];

  return (
    <>
      <PageHeader eyebrow={staff ? "Admin overview" : "Your account"} title={`Hello, ${first}`}>
        <Link href="/orders" className="btn btn-secondary">
          View all {staff ? "orders" : "bookings"}
        </Link>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Orders" value={d.kpis.total} icon={ClipboardList} hint={`${d.kpis.today} new today`} />
        <Kpi label="Pending" value={d.kpis.pending} icon={Clock} tone="accent" hint="Waiting for a mechanic" />
        <Kpi label="In progress" value={d.kpis.assigned} icon={CalendarDays} hint="Assigned and booked" />
        <Kpi label="Completed" value={d.kpis.completed} icon={CheckCircle2} hint="Finished jobs" />
      </section>

      {(d.income || d.people) && (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {d.income && (
            <Kpi label={staff ? "Platform income" : "Earnings"} value={gbp(d.income.all)} icon={PoundSterling} hint={staff ? `${gbp(d.income.month)} this month` : "Completed jobs"} />
          )}
          {d.people && (
            <>
              <Kpi label="Customers" value={d.people.customers} icon={Users} />
              <Kpi label="Mechanics" value={d.people.mechanics} icon={Wrench} />
            </>
          )}
        </section>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Orders, six-month trend</h2>
              <p className="text-sm text-muted">New orders placed each month, up to your latest order.</p>
            </div>
            <TrendingUp size={18} className="text-muted" />
          </div>
          <OrdersArea data={d.series} />
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">By status</h2>
          <p className="mb-4 text-sm text-muted">Where every order stands today.</p>
          <StatusDonut data={d.byStatus} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <Link href="/orders" className="text-sm font-semibold text-brand hover:underline">See all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Vehicle</th>
                  <th className="th">Service</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id} className="transition hover:bg-brand-soft/50">
                    <td className="td font-mono text-xs">
                      <Link href={`/orders/${o.id}`} className="font-medium text-brand hover:underline">#{o.id}</Link>
                      <div className="text-muted">{shortDate(o.at)}</div>
                    </td>
                    <td className="td">
                      <div className="font-medium">{o.car}</div>
                      <div className="font-mono text-xs text-muted">{o.reg}</div>
                    </td>
                    <td className="td capitalize">{o.service}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                    <td className="td text-right font-mono">{gbp(o.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Order value</h2>
          <p className="mb-4 text-sm text-muted">Quoted value per month.</p>
          <ValueBars data={d.series} />
        </div>
      </section>
    </>
  );
}
