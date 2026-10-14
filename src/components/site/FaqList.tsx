"use client";
import { Search } from "lucide-react";
import { useId, useState } from "react";

export function FaqList({ items }: { items: { id: string; title: string; description: string }[] }) {
  const [query, setQuery] = useState("");
  const id = useId();
  const matches = items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div>
    <label htmlFor={id} className="label">Find an answer</label>
    <div className="relative"><Search size={19} className="pointer-events-none absolute left-4 top-4 text-muted" /><input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘booking’, ‘payment’, or ‘service’" className="input !min-h-14 !pl-12" /></div>
    <p role="status" className="mb-6 mt-3 text-xs text-muted">{matches.length} {matches.length === 1 ? "answer" : "answers"}{query.trim() ? " found" : " to common questions"}</p>
    <div className="space-y-3">{matches.map((item) => <details key={item.id} className="card group p-5 open:shadow-card"><summary className="cursor-pointer list-none font-display text-lg font-semibold marker:hidden"><span className="flex items-center justify-between gap-4">{item.title}<span aria-hidden="true" className="text-brand transition group-open:rotate-45">+</span></span></summary><p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-7 text-muted">{item.description}</p></details>)}</div>
    {!matches.length && <div className="rounded-2xl bg-sunken p-8 text-center"><h2 className="font-display text-xl font-semibold">No answers found</h2><p className="mt-2 text-sm text-muted">Try a different word, or contact our team below.</p><button type="button" onClick={() => setQuery("")} className="btn btn-secondary mt-5">Clear search</button></div>}
  </div>;
}
