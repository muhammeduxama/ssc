"use client";
import { SendHorizontal } from "lucide-react";
import { useState } from "react";
import { addQuoteRequestLine, deleteQuoteRequestLine, sendQuoteRequestQuote } from "@/app/actions/mechanic-jobs";
import { useAction } from "@/components/useAction";
import { EstimateLines } from "./EstimateLines";
import { gbp } from "@/lib/format";

type Line = { id: number; name: string; price: number };

export function QuoteRequestBuilder({ id, labours, parts, total, commission, status, labourRate }: { id: number; labours: Line[]; parts: Line[]; total: number; commission: number; status: string; labourRate: number }) {
  const { pending, run } = useAction();
  const [l, setL] = useState({ name: "", hours: "1", minutes: "0" });
  const [p, setP] = useState({ name: "", price: "" });
  const sent = status === "QUOTATION SENT";
  const lPrice = Number(l.hours) * labourRate + (Number(l.minutes) / 60) * labourRate;
  return (
    <div className="mech-editor-columns">
      <div className="space-y-4">
        {!sent && (
          <section className="card grid gap-4 p-5 md:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); run(() => addQuoteRequestLine(id, "labour", l.name, Math.round(lPrice * 100) / 100), { after: (r) => r.ok && setL({ name: "", hours: "1", minutes: "0" }) }); }} className="space-y-2">
              <label className="label" htmlFor="ln">Labour</label>
              <input id="ln" value={l.name} onChange={(e) => setL({ ...l, name: e.target.value })} placeholder="e.g. Replace front brake pads" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Hours" value={l.hours} onChange={(e) => setL({ ...l, hours: e.target.value })} className="input">{Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i} h</option>)}</select>
                <select aria-label="Minutes" value={l.minutes} onChange={(e) => setL({ ...l, minutes: e.target.value })} className="input">{[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
              </div>
              <button disabled={pending || !l.name.trim()} className="btn btn-secondary w-full">Add labour · {gbp(lPrice)}</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); run(() => addQuoteRequestLine(id, "part", p.name, Number(p.price)), { after: (r) => r.ok && setP({ name: "", price: "" }) }); }} className="space-y-2">
              <label className="label" htmlFor="pn">Part</label>
              <input id="pn" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="e.g. Front brake pad set" className="input" />
              <input aria-label="Part price" inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} placeholder="Price £" className="input" />
              <button disabled={pending || !p.name.trim()} className="btn btn-secondary w-full">Add part</button>
            </form>
          </section>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <EstimateLines title="Labour" rows={labours} kind="labour" busy={pending} onRemove={sent ? undefined : line => run(() => deleteQuoteRequestLine(id, "labour", line))}/>
          <EstimateLines title="Parts" rows={parts} kind="part" busy={pending} onRemove={sent ? undefined : line => run(() => deleteQuoteRequestLine(id, "part", line))}/>
        </div>
      </div>
      <aside className="card h-fit p-5 mech-estimate-summary">
        <span className="eyebrow">{sent ? "Quote sent" : "Draft quote"}</span>
        <div className="mt-3 font-display text-4xl font-medium text-brand">{gbp(total)}</div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Job fee</span><span className="font-mono">−{gbp(commission)}</span></div>
          <div className="flex justify-between font-semibold"><span>You earn</span><span className="font-mono">{gbp(total - commission)}</span></div>
        </div>
        {!sent && <button disabled={pending || labours.length + parts.length === 0} onClick={() => run(() => sendQuoteRequestQuote(id), { confirm: "Send this quote to the customer?" })} className="btn btn-primary mt-5 w-full"><SendHorizontal size={16} /> Send quote</button>}
      </aside>
    </div>
  );
}
