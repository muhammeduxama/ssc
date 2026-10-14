import { ArrowRight, BadgeCheck, CalendarCheck, CalendarClock, CheckCircle2, FileText, Hourglass, PoundSterling, ShieldAlert, ShoppingBag, Sparkles, Truck, UserCheck, Users, Warehouse, Wrench, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHeader } from "@/components/ui";
import { getAdminTiles } from "@/lib/admin/dashboard";
import { listAdminOrders } from "@/lib/admin/orders";
import { gbp } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = { ShoppingBag, CalendarCheck, CalendarClock, BadgeCheck, CheckCircle2, Sparkles, Hourglass, Users, Wrench, Truck, Warehouse, XCircle, ShieldAlert, UserCheck };

function Tile({ label, value, href, icon, tone }: { label: string; value: string | number; href: string; icon?: string; tone?: string }) {
  const I = (icon && ICONS[icon]) || FileText;
  const color = tone === "danger" ? "text-danger" : tone === "accent" ? "text-warn" : "text-brand";
  return (
    <Link href={href} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-medium uppercase leading-4 tracking-[0.1em] text-muted">{label}</span>
        <I size={18} className="shrink-0 text-muted/60" />
      </div>
      <span className={`mt-3 font-display text-3xl font-medium leading-none tracking-tight ${color}`}>{value}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand opacity-70 group-hover:opacity-100">More info <ArrowRight size={12} /></span>
    </Link>
  );
}

export async function AdminDashboard({ name }: { name: string }) {
  const [t, open] = await Promise.all([getAdminTiles(), listAdminOrders("open")]);
  return (
    <>
      <PageHeader eyebrow="Admin overview" title={`Hello, ${name.split(" ")[0]}`}>
        <Link href="/admin/orders/all" className="btn btn-secondary">All orders</Link>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {t.orders.map((x) => <Tile key={x.label} {...x} />)}
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {t.income.map((x) => (
          <Link key={x.label} href="/admin/payments" className="card flex items-center gap-4 p-4 transition hover:shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-soft text-brand"><PoundSterling size={20} /></span>
            <span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{x.label}</span>
              <span className="font-display text-2xl font-medium text-brand">{gbp(x.value)}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Order management</h2>
          <span className="font-mono text-xs text-muted">{open.length} open orders</span>
        </div>
        <OrdersTable rows={open} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold">Quotations</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {t.quotes.map((x) => <Tile key={x.label} {...x} icon={undefined} />)}
        </div>
      </section>
    </>
  );
}
