import type { LucideIcon } from "lucide-react";
import { STATUS_TONE } from "@/lib/format";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
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

export function Kpi({ label, value, icon: Icon, hint, tone = "brand" }: { label: string; value: string | number; icon: LucideIcon; hint?: string; tone?: "brand" | "accent" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "accent" ? "text-warn" : "text-brand";
  return (
    <div className="card p-6 transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
          <Icon size={18} />
        </span>
      </div>
      <div className={`mt-3 font-display text-4xl font-medium leading-none tracking-tight ${color}`}>{value}</div>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <div className="font-display text-lg font-semibold">{title}</div>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
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
