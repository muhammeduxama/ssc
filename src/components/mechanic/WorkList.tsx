"use client";
import { ArrowRight, CalendarClock, CarFront, ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, Search, SlidersHorizontal, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/ui";
import { gbp } from "@/lib/format";

export type WorkItem = {
  id: number; orderId: number; href: string; car: string; reg: string; work: string;
  location: string; amount: number | null; amountLabel: string; status: string;
  date?: string | null; timestamp?: string | null; miles?: number; customer?: string; schedule?: string; note?: string;
};
type Mode = "requests" | "current" | "previous" | "quotes" | "estimates";
const sections = [
  { mode: "requests", href: "/mechanic/requests", label: "Job requests" },
  { mode: "current", href: "/mechanic/jobs", label: "Current jobs" },
  { mode: "previous", href: "/mechanic/jobs/previous", label: "Previous jobs" },
  { mode: "quotes", href: "/mechanic/quote-requests", label: "Quote requests" },
  { mode: "estimates", href: "/mechanic/bespokes", label: "Bespoke quotes" },
];

function workStatus(status: string) {
  const key = status.toLowerCase();
  return key === "not delivered" ? "Draft" : key === "quotation sent" ? "Quote sent" : status;
}

export function WorkList({ items, mode, empty }: { items: WorkItem[]; mode: Mode; empty: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const search = query.trim().toLowerCase();
  const filtered = items.filter(r => [r.orderId, r.car, r.reg, r.work, r.location, r.customer, r.status, workStatus(r.status)].join(" ").toLowerCase().includes(search));
  const rows = [...filtered].sort((a, b) => {
    if (sort === "value") return (b.amount ?? -1) - (a.amount ?? -1);
    if (sort === "distance") return (a.miles ?? Infinity) - (b.miles ?? Infinity);
    if (sort === "schedule") return (a.timestamp ? Date.parse(a.timestamp) : Infinity) - (b.timestamp ? Date.parse(b.timestamp) : Infinity);
    return b.id - a.id;
  });
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const currentPage = Math.min(page, pages);
  const shown = rows.slice((currentPage - 1) * 12, currentPage * 12);
  const priced = items.filter(r => r.amount !== null);
  const highest = priced.length ? Math.max(...priced.map(r => r.amount!)) : null;
  const scheduled = items.filter(r => r.schedule && r.timestamp).length;
  return <div className="mech-work-browser">
    <nav className="mech-work-tabs" aria-label="Mechanic work sections">{sections.map(s => <Link key={s.mode} href={s.href} aria-current={mode === s.mode ? "page" : undefined}>{s.label}{mode === s.mode && <span>{items.length}</span>}</Link>)}</nav>
    <div className="mech-list-summary">
      <div><span className="mech-summary-icon"><Wrench size={18}/></span><span><small>{mode === "requests" ? "Available to review" : mode === "quotes" ? "Repair requests" : mode === "estimates" ? "Your estimates" : "Bookings"}</small><strong>{items.length}<em>{mode === "requests" || mode === "quotes" ? "request" : mode === "estimates" ? "estimate" : "job"}{items.length !== 1 && "s"}</em></strong></span></div>
      <div><span className="mech-summary-icon"><CarFront size={18}/></span><span><small>{mode === "requests" ? "Highest earning opportunity" : mode === "quotes" || mode === "estimates" ? "Highest estimate value" : "Highest booking value"}</small><strong>{highest === null ? "No price yet" : gbp(highest)}</strong></span></div>
      <div><span className="mech-summary-icon"><CalendarClock size={18}/></span><span><small>{mode === "current" || mode === "previous" ? "With an appointment" : "Your next step"}</small><strong className="mech-summary-copy">{mode === "current" || mode === "previous" ? `${scheduled} scheduled` : mode === "requests" ? "Review & choose a time" : "Prepare your estimate"}</strong></span></div>
    </div>
    <section className="mech-list-panel" aria-label="Work records">
      <div className="mech-list-toolbar">
        <label className="mech-search"><Search size={17}/><input aria-label="Search mechanic work" placeholder="Search booking, registration, vehicle or area…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}/>{query && <button onClick={() => { setQuery(""); setPage(1); }} aria-label="Clear search"><X size={15}/></button>}</label>
        <div className="mech-toolbar-options"><label className="mech-sort"><SlidersHorizontal size={15}/><span className="sr-only">Sort work</span><select aria-label="Sort work" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="recent">Latest first</option><option value="value">Highest value</option>{mode === "requests" && <option value="distance">Nearest first</option>}{(mode === "current" || mode === "previous") && <option value="schedule">Appointment date</option>}</select></label><div className="mech-view-toggle" aria-label="List layout"><button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={17}/></button><button aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={16}/></button></div></div>
      </div>
      <div className="mech-results-count" aria-live="polite">{rows.length} {rows.length === 1 ? "result" : "results"}{search && <> for “{query}”</>}<span>{mode === "requests" ? "Earnings shown after the platform fee" : "Open a record to see the full details"}</span></div>
      {!shown.length ? <div className="mech-empty"><Search size={26}/><h2>{query ? "No matching records" : empty}</h2><p>{query ? "Try another vehicle, registration or booking number." : "You’re all caught up. New work will appear here when it’s available."}</p>{query && <button className="btn btn-secondary" onClick={() => { setQuery(""); setPage(1); }}>Clear search</button>}</div> : <div className={`mech-work-items mech-work-${view}`}>
        {shown.map(r => <article key={r.id} className="mech-work-item">
          <div className="mech-work-vehicle"><span className="mech-vehicle-icon"><CarFront size={22}/></span><div><div className="mech-record-id"><Link href={r.href}>#{r.orderId}</Link><Registration value={r.reg}/></div><h2><Link href={r.href}>{r.car || "Vehicle details pending"}</Link></h2>{r.customer && <p>{r.customer}</p>}</div></div>
          <div className="mech-work-description"><h3>{r.work || "Work details pending"}</h3><p><MapPin size={13}/>{r.location || "Location to be confirmed"}{r.miles !== undefined && <span>· {r.miles} mi</span>}</p><p><CalendarClock size={13}/>{r.schedule || (r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Date to be confirmed")}</p>{r.note && <p className="mech-work-note">{r.note}</p>}</div>
          <div className="mech-work-status"><StatusBadge status={workStatus(r.status)}/></div>
          <div className="mech-work-value"><small>{r.amountLabel}</small><strong>{r.amount === null ? "Not quoted" : gbp(r.amount)}</strong></div>
          <Link className="mech-open-record" href={r.href}>{mode === "requests" ? "Review job" : mode === "quotes" ? "View request" : mode === "estimates" ? "Edit estimate" : "Open job"}<ArrowRight size={15}/></Link>
        </article>)}
      </div>}
      {rows.length > 0 && <footer className="mech-pagination"><p>Showing {(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, rows.length)} of {rows.length}</p><div><button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>{currentPage} / {pages}</span><button aria-label="Next page" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>}
    </section>
  </div>;
}

export function Registration({ value }: { value: string }) {
  const known = !!value && !["unknown", "n/a", "null"].includes(value.toLowerCase());
  return <span className={known ? "mech-registration" : "mech-registration mech-registration-missing"}>{known ? value.toUpperCase() : "No registration"}</span>;
}
