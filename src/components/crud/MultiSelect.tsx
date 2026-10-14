"use client";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

export function MultiSelect({ name, choices, defaultValue }: { name: string; choices: { value: string; label: string }[]; defaultValue?: string | null }) {
  const [picked, setPicked] = useState<string[]>(defaultValue ? String(defaultValue).split(",").filter(Boolean) : []);
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(choices.map((c) => [c.value, c.label])), [choices]);
  const results = choices.filter((c) => !picked.includes(c.value) && c.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  return (
    <div className="rounded-lg border border-line-strong bg-raised p-2">
      <div className="flex flex-wrap gap-1.5">
        {picked.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-xs font-medium">
            {byId.get(v) ?? v}
            <button type="button" aria-label={`Remove ${byId.get(v)}`} onClick={() => setPicked(picked.filter((x) => x !== v))} className="text-muted hover:text-ink">
              <X size={12} />
            </button>
            <input type="hidden" name={name} value={v} />
          </span>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to add…" className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none" />
      </div>
      {q && results.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto border-t border-line pt-1">
          {results.map((c) => (
            <li key={c.value}>
              <button
                type="button"
                onClick={() => {
                  setPicked([...picked, c.value]);
                  setQ("");
                }}
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-brand-soft"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
