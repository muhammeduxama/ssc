"use client";
import { Package, Timer, Trash2 } from "lucide-react";
import { gbp } from "@/lib/format";

export function EstimateLines({ title, rows, kind, onRemove, busy }: {
  title: string; rows: { id: number; name: string; price: number; hour?: string }[];
  kind: "labour" | "part"; onRemove?: (id: number) => void; busy: boolean;
}) {
  const Icon = kind === "labour" ? Timer : Package;
  return <section className="card overflow-hidden mech-estimate-lines"><header className="mech-panel-heading"><h2><Icon size={16}/>{title}</h2><span>{rows.length}</span></header>
    {!rows.length ? <p className="mech-estimate-empty">No {kind === "labour" ? "labour" : "parts"} added yet.</p> : <ul>{rows.map(r => <li key={r.id}><span>{r.name}{r.hour && <small>{r.hour} hours</small>}</span><strong>{gbp(r.price)}</strong>{onRemove && <button disabled={busy} onClick={() => onRemove(r.id)} aria-label={`Remove ${r.name}`}><Trash2 size={15}/></button>}</li>)}</ul>}
  </section>;
}
