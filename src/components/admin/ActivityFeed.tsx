"use client";
import { ArrowUpRight, ClipboardList, LifeBuoy, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Kind = "case" | "message" | "support";
export type ActivityItem = { id: string; kind: Kind; title: string; author: string; text: string; at: string | null; href: string };
const kinds = { case: { label: "Resolution case", icon: ClipboardList }, message: { label: "Booking message", icon: MessageSquare }, support: { label: "Support message", icon: LifeBuoy } };
const views = [{ key: "all", label: "All activity" }, { key: "case", label: "Cases" }, { key: "message", label: "Booking messages" }, { key: "support", label: "Support" }] as const;
const date = (at: string | null) => at ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(at)) : "Date unavailable";
const time = (at: string | null) => at ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(at)) : "";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [view, setView] = useState<string>("all");
  const [q, setQ] = useState("");
  const filtered = items.filter((i) => (view === "all" || view === i.kind) && `${i.title} ${i.author} ${i.text}`.toLowerCase().includes(q.trim().toLowerCase()));
  return <section className="activity-panel card">
    <div className="activity-toolbar"><nav aria-label="Activity type" className="activity-tabs">{views.map((v) => <button type="button" aria-pressed={view === v.key} key={v.key} onClick={() => setView(v.key)}>{v.label}<span>{v.key === "all" ? items.length : items.filter((i) => i.kind === v.key).length}</span></button>)}</nav>
      <div className="section-search"><Search size={16} aria-hidden /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recent activity" aria-label="Search recent activity" /></div>
    </div>
    <p className="activity-result" role="status">{filtered.length} event{filtered.length === 1 ? "" : "s"} · latest first</p>
    {!filtered.length && <div className="section-empty"><MessageSquare size={28} /><h2>No activity to show</h2><p>{q ? "Try another search or choose a different activity type." : "New cases and conversations will appear here."}</p></div>}
    <ol className="activity-timeline">{filtered.map((item, index) => {
      const day = date(item.at); const showDay = index === 0 || day !== date(filtered[index - 1].at); const I = kinds[item.kind].icon;
      return <li key={item.id}>{showDay && <h2 className="activity-day">{day}</h2>}<Link href={item.href} className={`activity-event activity-${item.kind}`}>
        <span className="activity-event-icon"><I size={18} aria-hidden /></span><span className="activity-event-body"><span className="activity-event-meta">{kinds[item.kind].label}<time dateTime={item.at ?? undefined}>{time(item.at)}</time></span><strong>{item.title}</strong><span className="activity-author">{item.author}</span><span className="activity-preview">{item.text || "Open to view the details."}</span></span><ArrowUpRight size={17} className="shrink-0 text-muted" aria-hidden />
      </Link></li>;
    })}</ol>
  </section>;
}
