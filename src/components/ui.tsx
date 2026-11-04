import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";
import { STATUS_TONE } from "@/lib/format";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="section-heading">
      <div className="min-w-0">{eyebrow && <p className="section-kicker">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="section-description">{description}</p>}</div>
      {children && <div className="section-heading-actions">{children}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = STATUS_TONE[status.toLowerCase()] ?? { label: status, cls: "bg-sunken text-muted" };
  return (
    <span className={`pill border-transparent ${t.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t.label}
    </span>
  );
}

export function Kpi({ label, value, icon: Icon, hint, tone = "brand", href }: { href?: string; label: string; value: string | number; icon: LucideIcon; hint?: string; tone?: "brand" | "accent" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "accent" ? "text-warn" : "text-brand";
  const content = (
    <div className="card h-full p-4 transition hover:-translate-y-0.5 hover:shadow-card sm:p-6">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
          <Icon size={18} />
        </span>
      </div>
      <div className={`mt-3 font-display text-3xl sm:text-4xl font-medium leading-none tracking-tight ${color}`}>{value}</div>
      {hint && <p className="mt-2 text-xs text-muted sm:text-sm">{hint}</p>}
      {href && <span className="mt-3 block text-xs font-semibold text-brand">View details →</span>}
    </div>
  );
  return href ? <Link href={href} className="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-brand">{content}</Link> : content;
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card section-empty">
      <Inbox size={28} aria-hidden /><h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children || "—"}</dd>
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, href }: { page: number; pages: number; total: number; pageSize: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return <nav className="section-pagination" aria-label="Pagination">
    <p>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
    <div>{page > 1 ? <Link href={href(page - 1)} className="btn btn-secondary">Previous</Link> : <span className="pagination-disabled">Previous</span>}<span className="pagination-position">Page {page} of {pages}</span>{page < pages ? <Link href={href(page + 1)} className="btn btn-secondary">Next</Link> : <span className="pagination-disabled">Next</span>}</div>
  </nav>;
}
