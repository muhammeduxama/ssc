import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

export function DetailPage({ children }: { children: React.ReactNode }) {
  return <div className="detail-page">{children}</div>;
}

export function DetailHeader({ title, eyebrow, description, children, back }: {
  title: string; eyebrow?: string; description?: string; children?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return <header className="detail-header">
    {back && <Link href={back.href} className="detail-back"><ArrowLeft size={15}/>{back.label}</Link>}
    <div className="detail-heading-row"><div className="min-w-0">{eyebrow && <p className="section-kicker">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="detail-description">{description}</p>}</div>{children && <div className="detail-actions">{children}</div>}</div>
  </header>;
}

export function DetailMetrics({ items }: { items: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon }[] }) {
  return <dl className="detail-metrics">{items.map(({ label, value, hint, icon: Icon }) => <div key={label} className="detail-metric"><span className="detail-metric-icon"><Icon size={18} aria-hidden/></span><div><dt>{label}</dt><dd>{value || "—"}</dd>{hint && <p>{hint}</p>}</div></div>)}</dl>;
}

export function DetailSection({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="card detail-section"><header className="detail-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header><div className="detail-section-body">{children}</div></section>;
}
