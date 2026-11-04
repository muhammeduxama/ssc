import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

/** Shared dashboard primitives keep the three workspaces consistent without changing detail pages. */
export function DashboardStat({ label, value, href, icon: Icon, detail, tone = "brand" }: {
  label: string; value: string | number; href: string; icon: LucideIcon; detail: string; tone?: "brand" | "warn" | "danger";
}) {
  return <Link href={href} className={`dashboard-stat dashboard-stat-${tone} group`}>
    <span className="dashboard-stat-top"><span>{label}</span><Icon size={18} aria-hidden /></span>
    <strong className="dashboard-stat-value">{value}</strong>
    <span className="dashboard-stat-bottom"><span>{detail}</span><ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden /></span>
  </Link>;
}

export function DashboardPanel({ title, description, href, action = "View all", children, className = "" }: {
  title: string; description?: string; href?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return <section className={`dashboard-panel ${className}`}>
    <div className="dashboard-panel-heading"><div className="min-w-0"><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {href && <Link href={href} className="dashboard-text-link">{action}<ArrowRight size={14} aria-hidden /></Link>}
    </div>
    {children}
  </section>;
}

export function DashboardRow({ title, description, href, value, icon: Icon, tone }: {
  title: string; description?: string; href: string; value?: string | number; icon?: LucideIcon; tone?: "warn" | "danger";
}) {
  return <Link href={href} className="dashboard-row group">
    {Icon && <span className={`dashboard-row-icon ${tone === "danger" ? "!bg-danger-soft !text-danger" : tone === "warn" ? "!bg-warn-soft !text-warn" : ""}`}><Icon size={18} aria-hidden /></span>}
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold [overflow-wrap:anywhere]">{title}</span>{description && <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>}</span>
    {value !== undefined && <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>}
    <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
  </Link>;
}

export function DashboardEmpty({ icon: Icon, title, description, href, action }: {
  icon: LucideIcon; title: string; description: string; href: string; action: string;
}) {
  return <div className="dashboard-empty"><span className="dashboard-row-icon"><Icon size={24} aria-hidden /></span><h3>{title}</h3><p>{description}</p><Link href={href} className="btn btn-secondary">{action}<ArrowRight size={15} aria-hidden /></Link></div>;
}
