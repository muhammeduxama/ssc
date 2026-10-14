"use client";
import { SendHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { addBespokeLine, createBespoke, deleteBespoke, deleteBespokeLine, sendBespoke } from "@/app/actions/bespokes";
import { useToast } from "@/components/Toast";
import { useAction } from "@/components/useAction";
import { gbp } from "@/lib/format";
import { VehiclePicker } from "./VehiclePicker";

export function NewBespoke() {
  const [state, run, pending] = useActionState(createBespoke, null);
  const [manual, setManual] = useState(false);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok);
    if (state.needsManual) setManual(true);
    if (state.ok && state.link) router.push(state.link);
  }, [state, toast, router]);
  const f = (name: string, label: string, type = "text", placeholder = "") => (
    <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type={type} placeholder={placeholder} className="input" /></div>
  );
  return (
    <form action={run} className="card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {f("email", "Customer email address", "email", "customer@example.com")}
        {f("phone", "Customer phone number (optional)")}
        {f("name", "Customer first name (optional)")}
        {f("last_name", "Customer last name (optional)")}
        <div><label className="label" htmlFor="registration">Vehicle registration</label><input id="registration" name="registration" className="input font-mono uppercase" /></div>
        {f("postcode", "Customer postal code (optional)")}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} className="h-4 w-4" /> Select the vehicle manually</label>
      {manual && <VehiclePicker />}
      <div><label className="label" htmlFor="service">Message to the customer (optional)</label><textarea id="service" name="service" rows={3} placeholder="Describe any extra detail the customer needs to know" className="input" /></div>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">{pending ? "Creating…" : "Create estimate"}</button></div>
    </form>
  );
}

type Line = { id: number; name: string; price: number; hour?: string };
export function BespokeEditor({ id, status, labours, parts, total, labourRate }: { id: number; status: string; labours: Line[]; parts: Line[]; total: number; labourRate: number }) {
  const { pending, run } = useAction();
  const router = useRouter();
  const [l, setL] = useState({ name: "", hours: "1" });
  const [p, setP] = useState({ name: "", price: "" });
  const sent = status === "Sent" || status === "accepted";
  const lPrice = Number(l.hours) * labourRate;
  const List = ({ title, rows, kind }: { title: string; rows: Line[]; kind: "labour" | "part" }) => (
    <div className="card overflow-hidden">
      <h3 className="border-b border-line px-4 py-2.5 font-display text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? <p className="px-4 py-3 text-sm text-muted">None yet.</p> : (
        <ul>{rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-sm first:border-t-0">
            <span className="flex-1">{r.name}{r.hour ? <span className="text-xs text-muted"> · {r.hour}h</span> : null}</span><span className="font-mono">{gbp(r.price)}</span>
            {!sent && <button onClick={() => run(() => deleteBespokeLine(id, kind, r.id))} aria-label={`Remove ${r.name}`} className="rounded-md p-1.5 text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>}
          </li>
        ))}</ul>
      )}
    </div>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {!sent && (
          <section className="card grid gap-4 p-5 md:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); run(() => addBespokeLine(id, "labour", l.name, lPrice, l.hours), { after: (r) => r.ok && setL({ name: "", hours: "1" }) }); }} className="space-y-2">
              <label className="label" htmlFor="ln">Labour</label>
              <input id="ln" value={l.name} onChange={(e) => setL({ ...l, name: e.target.value })} className="input" placeholder="Work description" />
              <select aria-label="Hours" value={l.hours} onChange={(e) => setL({ ...l, hours: e.target.value })} className="input">{["0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8"].map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
              <button disabled={pending || !l.name.trim()} className="btn btn-secondary w-full">Add labour · {gbp(lPrice)}</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); run(() => addBespokeLine(id, "part", p.name, Number(p.price)), { after: (r) => r.ok && setP({ name: "", price: "" }) }); }} className="space-y-2">
              <label className="label" htmlFor="pn">Part</label>
              <input id="pn" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="input" placeholder="Part name" />
              <input aria-label="Part price" inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} className="input" placeholder="Price £" />
              <button disabled={pending || !p.name.trim()} className="btn btn-secondary w-full">Add part</button>
            </form>
          </section>
        )}
        <div className="grid gap-4 md:grid-cols-2"><List title="Labour" rows={labours} kind="labour" /><List title="Parts" rows={parts} kind="part" /></div>
      </div>
      <aside className="card h-fit p-5">
        <span className="eyebrow">{status}</span>
        <div className="mt-3 font-display text-4xl font-medium text-brand">{gbp(total)}</div>
        {!sent && <button disabled={pending} onClick={() => run(() => sendBespoke(id), { confirm: "Send this estimate to the customer?" })} className="btn btn-primary mt-5 w-full"><SendHorizontal size={16} /> Send estimate</button>}
        <button disabled={pending} onClick={() => run(() => deleteBespoke(id), { confirm: "Delete this estimate?", after: (r) => r.ok && router.push("/mechanic/bespokes") })} className="btn btn-secondary mt-2 w-full !text-danger"><Trash2 size={16} /> Delete</button>
      </aside>
    </div>
  );
}
