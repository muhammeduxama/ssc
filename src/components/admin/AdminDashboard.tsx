import { OrdersTable } from "./OrdersTable";
import { CalendarCheck, CalendarClock, ClipboardList, FileText, MessageSquare, Plus, PoundSterling, Search, ShieldAlert, Users, Wrench, Hourglass, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { DashboardPanel, DashboardRow, DashboardStat } from "@/components/Dashboard";
import { getAdminTiles } from "@/lib/admin/dashboard";
import { listAdminOrders } from "@/lib/admin/orders";
import { gbp } from "@/lib/format";

export async function AdminDashboard({ name, isAdmin = true }: { name: string; isAdmin?: boolean }) {
  const [t, open] = await Promise.all([getAdminTiles(), listAdminOrders("open")]);
  const item = (href: string) => t.orders.find((x) => x.href === href)!;
  const count = (href: string) => item(href).value;
  return <div className="dashboard-page admin-dashboard">
    <header className="dashboard-heading">
      <div><p className="dashboard-kicker">Operations overview</p><h1>Welcome back, {name.split(" ")[0]}</h1><p>Keep bookings moving and your network connected.</p></div>
      <Link href="/admin/clients/new" className="btn btn-primary"><Plus size={16} /> Add customer</Link>
    </header>
    <section aria-label="Booking overview" className="dashboard-stats">
      <DashboardStat label="Open bookings" value={open.length} href="/admin/orders/open" icon={ClipboardList} detail="Manage the active queue" />
      <DashboardStat label="Visits today" value={count("/admin/orders/today")} href="/admin/orders/today" icon={CalendarCheck} detail="Today's appointments" />
      <DashboardStat label="Visits tomorrow" value={count("/admin/orders/tomorrow")} href="/admin/orders/tomorrow" icon={CalendarClock} detail="Plan the next day" />
      <DashboardStat label="Income this month" value={gbp(t.income[1].value)} href="/admin/payments" icon={PoundSterling} detail="Platform fees received" />
    </section>
    <div className="dashboard-columns">
      <DashboardPanel title="Booking queue" description={`${open.length} open bookings · latest first`} href="/admin/orders/open">
        <form action="/admin/orders/all" className="dashboard-search"><Search size={17} aria-hidden /><input name="q" aria-label="Search bookings" placeholder="Booking number, registration or customer" /><button type="submit">Search</button></form>
        {!open.length ? <p className="px-5 py-8 text-sm text-muted">All caught up. New bookings will appear here.</p> : <OrdersTable variant="queue" rows={open.slice(0, 6)}/>}
      </DashboardPanel>
      <DashboardPanel title="Needs attention" description="Resolve these to move bookings forward.">
        <DashboardRow title="Payment details missing" description="Bookings without a saved card" value={count("/admin/orders/unverified")} href="/admin/orders/unverified" icon={ShieldAlert} tone="warn" />
        <DashboardRow title="Quotes awaiting a response" description="Review requests not yet sent to mechanics" value={t.quotes.find((x) => x.href === "/admin/quotes/not-responded")!.value} href="/admin/quotes/not-responded" icon={FileText} tone="warn" />
        <DashboardRow title="Inactive bookings" description="Review expired appointment preferences" value={count("/admin/orders/inactive")} href="/admin/orders/inactive" icon={Hourglass} />
        <DashboardRow title="Customer support" description="Open conversations and reply" href="/messages" icon={MessageSquare} />
        {isAdmin && <DashboardRow title="Mechanic applications" description="Review new network applications" href="/admin/mechanics/requests" icon={Wrench} />}
      </DashboardPanel>
    </div>
    <div className="dashboard-columns">
      <DashboardPanel title="Your network" description="Manage people and services.">
        <div className="dashboard-network-grid">
          <DashboardRow title="Customers" value={count("/admin/clients")} href="/admin/clients" icon={Users} />
          <DashboardRow title="Mechanics" value={count("/admin/mechanics")} href="/admin/mechanics" icon={Wrench} />
          <DashboardRow title="Completed bookings" value={count("/admin/orders/completed")} href="/admin/orders/completed" icon={CheckCircle2} />
          <DashboardRow title="Service catalogue" description="Add services and update prices" href="/admin/r/services" icon={ClipboardList} />
        </div>
      </DashboardPanel>
      <DashboardPanel title="Income summary" description="Platform fees from successful payments." href="/admin/payments" action="Payments">
        <dl className="dashboard-money-list">{[t.income[2], t.income[3], t.income[0]].map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{gbp(x.value)}</dd></div>)}</dl>
      </DashboardPanel>
    </div>
    <DashboardPanel title="Quote management" description="Track repair requests and estimates." href="/admin/quotes/all">
      <div className="dashboard-quote-summary">{t.quotes.map((x) => <Link href={x.href} key={x.href}><span>{x.label.replace("quotations", "quotes").replace("Not responded quotes", "Awaiting response")}</span><strong>{x.value}</strong></Link>)}</div>
    </DashboardPanel>
  </div>;
}
