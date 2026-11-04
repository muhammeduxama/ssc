"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SectionTabs({ items, label = "Views" }: { items: { href: string; label: string; active: boolean }[]; label?: string }) {
  const router = useRouter();
  const active = items.find((i) => i.active)?.href ?? "";
  return <div className="section-views">
    <label className="section-view-select"><span>{label}</span><select value={active} onChange={(e) => router.push(e.target.value)} aria-label={label}>
      {!active && <option value="" disabled>Choose a view</option>}
      {items.map((i) => <option key={i.href} value={i.href}>{i.label}</option>)}
    </select></label>
    <nav aria-label={label} className="section-tabs">{items.map((i) => <Link href={i.href} key={i.href} aria-current={i.active ? "page" : undefined}>{i.label}</Link>)}</nav>
  </div>;
}
