"use client";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

type Group = { name: string; items: { name: string; href: string }[] };
export function BrowseDirectory({ groups, label, placeholder }: { groups: Group[]; label: string; placeholder: string }) {
  const [query, setQuery] = useState("");
  const id = useId();
  const term = query.trim().toLowerCase();
  const filtered = groups.map((group) => ({ ...group, items: group.items.filter((item) => group.name.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)) })).filter((group) => group.items.length);
  const count = filtered.reduce((sum, group) => sum + group.items.length, 0);
  return <section className="site-container py-12 sm:py-16">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
      <div className="w-full max-w-lg"><label htmlFor={id} className="label">{label}</label><div className="relative"><Search size={20} className="pointer-events-none absolute left-4 top-4 text-muted" /><input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="input !min-h-14 !pl-12" /></div></div>
      <p role="status" className="text-sm text-muted">{count} {count === 1 ? "result" : "results"}{term ? " found" : " to explore"}</p>
    </div>
    <div className="space-y-10">{filtered.map((group) => <section key={group.name}><div className="mb-5 flex items-center gap-3"><h2 className="font-display text-xl font-semibold">{group.name}</h2><span className="rounded-full bg-sunken px-2.5 py-1 text-xs text-muted">{group.items.length}</span></div><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{group.items.map((item) => <li key={item.href}><Link href={item.href} className="browse-card !min-h-18"><span>{item.name}</span><ArrowUpRight size={17} className="shrink-0 text-brand" /></Link></li>)}</ul></section>)}</div>
    {!count && <div className="rounded-2xl bg-night p-10 text-center"><h2 className="font-display text-2xl font-semibold">No matches yet</h2><p className="mt-3 text-muted">Try a shorter search or check the spelling.</p><button className="btn btn-secondary mt-5" onClick={() => setQuery("")}>Show all</button></div>}
  </section>;
}
