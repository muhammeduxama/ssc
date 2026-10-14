"use client";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteLine, saveLine } from "@/app/(app)/admin/orders/actions";
import { useToast } from "@/components/Toast";
import { gbp } from "@/lib/format";

type Line = { id: number; description: string; price: number };

export function LinesEditor({ kind, assignId, lines }: { kind: "part" | "labour"; assignId: number; lines: Line[] }) {
  const [edit, setEdit] = useState<{ id: number | null; name: string; price: string } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const label = kind === "part" ? "Part" : "Labour";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    start(async () => {
      const r = await saveLine(kind, assignId, edit.id, edit.name, edit.price);
      toast(r.message, r.ok);
      if (r.ok) {
        setEdit(null);
        router.refresh();
      }
    });
  };

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="font-display text-base font-semibold">{label}</h3>
        <button onClick={() => setEdit({ id: null, name: "", price: "" })} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"><Plus size={14} /> Add {label.toLowerCase()}</button>
      </header>
      {edit && (
        <form onSubmit={submit} className="flex flex-col gap-2 border-b border-line bg-sunken/60 p-4 sm:flex-row">
          <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={`${label} name`} aria-label={`${label} name`} className="input flex-1" />
          <input value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} placeholder="Price" inputMode="decimal" aria-label="Price" className="input sm:w-32" />
          <button disabled={pending} className="btn btn-primary">Save {label.toLowerCase()}</button>
          <button type="button" onClick={() => setEdit(null)} className="btn btn-secondary" aria-label="Cancel"><X size={16} /></button>
        </form>
      )}
      {lines.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">No {label.toLowerCase()} added.</p>
      ) : (
        <ul>
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-t border-line px-5 py-3 first:border-t-0">
              <span className="flex-1 text-sm">{l.description}</span>
              <span className="font-mono text-sm">{gbp(l.price)}</span>
              <button onClick={() => setEdit({ id: l.id, name: l.description, price: String(l.price) })} aria-label={`Edit ${l.description}`} className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink"><Pencil size={15} /></button>
              <button
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete ${l.description}?`)) return;
                  start(async () => {
                    const r = await deleteLine(kind, l.id);
                    toast(r.message, r.ok);
                    router.refresh();
                  });
                }}
                aria-label={`Delete ${l.description}`}
                className="rounded-md p-1.5 text-danger hover:bg-danger-soft"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
