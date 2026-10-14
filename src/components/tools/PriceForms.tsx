"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveFixedPrices, saveQuotePrices, saveRangePrices, skipQuotePrices } from "@/app/actions/admin-tools";
import { useAction } from "@/components/useAction";
import { gbp } from "@/lib/format";

type Part = { id: number; name: string; price: number; make?: string; year?: string; engine?: string; fuel?: string };
export type RangeOptions = { makes: string[]; fuels: string[]; years: number[]; engines: string[] };

export function ServicePicker({ services, current, base }: { services: { id: number; name: string }[]; current: number; base: string }) {
  const router = useRouter();
  return (
    <div className="max-w-xl">
      <label htmlFor="svc" className="label">Service</label>
      <select id="svc" value={current} onChange={(e) => router.push(`${base}?service=${e.target.value}`)} className="input">
        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

export function FixedPriceForm({ serviceId, labourHour, parts }: { serviceId: number; labourHour: number; parts: Part[] }) {
  const [hour, setHour] = useState(String(labourHour));
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(parts.map((p) => [p.id, String(p.price)])));
  const { pending, run } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveFixedPrices(serviceId, hour, prices)); }} className="card mt-4 p-6">
      <div className="max-w-xs">
        <label htmlFor="lh" className="label">Labour hours</label>
        <input id="lh" inputMode="decimal" value={hour} onChange={(e) => setHour(e.target.value)} className="input" />
      </div>
      <h3 className="mb-3 mt-6 font-display text-base font-semibold">Part prices</h3>
      {parts.length === 0 ? <p className="text-sm text-muted">This service has no parts.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p) => (
            <div key={p.id}>
              <label htmlFor={`p${p.id}`} className="label">{p.name}</label>
              <input id={`p${p.id}`} inputMode="decimal" value={prices[p.id]} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} className="input" />
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end"><button disabled={pending} className="btn btn-primary">Save prices</button></div>
    </form>
  );
}

function RangeFields({ o, v, set }: { o: RangeOptions; v: RangeState; set: (v: RangeState) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="md:col-span-2 xl:col-span-3">
        <span className="label">Makes</span>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line-strong p-2">
          {["ALL", ...o.makes].map((m) => {
            const on = v.make.includes(m);
            return (
              <button type="button" key={m} onClick={() => set({ ...v, make: on ? v.make.filter((x) => x !== m) : m === "ALL" ? ["ALL"] : [...v.make.filter((x) => x !== "ALL"), m] })} aria-pressed={on} className={`rounded-md px-2 py-1 text-xs font-medium ${on ? "bg-brand text-on-brand" : "bg-sunken text-ink hover:bg-brand-soft"}`}>{m}</button>
            );
          })}
        </div>
      </div>
      <div>
        <label htmlFor="fuel" className="label">Fuel</label>
        <select id="fuel" value={v.fuel} onChange={(e) => set({ ...v, fuel: e.target.value })} className="input"><option>ALL</option>{o.fuels.map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="yf" className="label">Year from</label><select id="yf" value={v.yearFrom} onChange={(e) => set({ ...v, yearFrom: e.target.value })} className="input"><option>ALL</option>{o.years.map((y) => <option key={y}>{y}</option>)}</select></div>
        <div><label htmlFor="yt" className="label">Year to</label><select id="yt" value={v.yearTo} onChange={(e) => set({ ...v, yearTo: e.target.value })} className="input"><option>ALL</option>{o.years.map((y) => <option key={y}>{y}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="ef" className="label">Engine from</label><select id="ef" value={v.engineFrom} onChange={(e) => set({ ...v, engineFrom: e.target.value })} className="input"><option>ALL</option>{o.engines.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label htmlFor="et" className="label">Engine to</label><select id="et" value={v.engineTo} onChange={(e) => set({ ...v, engineTo: e.target.value })} className="input"><option>ALL</option>{o.engines.map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
    </div>
  );
}
type RangeState = { make: string[]; fuel: string; yearFrom: string; yearTo: string; engineFrom: string; engineTo: string };
const blank: RangeState = { make: ["ALL"], fuel: "ALL", yearFrom: "ALL", yearTo: "ALL", engineFrom: "ALL", engineTo: "ALL" };

export function RangePriceForm({ serviceId, labourHour, parts, o }: { serviceId: number; labourHour: number; parts: Part[]; o: RangeOptions }) {
  const [hour, setHour] = useState(String(labourHour));
  const [r, setR] = useState<RangeState>(blank);
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(parts.map((p) => [p.id, String(p.price)])));
  const { pending, run } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveRangePrices(serviceId, hour, r, prices)); }} className="card mt-4 space-y-6 p-6">
      <div className="max-w-xs"><label htmlFor="lh" className="label">Labour hours</label><input id="lh" inputMode="decimal" value={hour} onChange={(e) => setHour(e.target.value)} className="input" /></div>
      <RangeFields o={o} v={r} set={setR} />
      <div>
        <h3 className="mb-3 font-display text-base font-semibold">Part prices for this range</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr><th className="th">Part</th><th className="th">Current rule</th><th className="th w-40">Price (£)</th></tr></thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.name}</td>
                  <td className="td font-mono text-xs text-muted">make {p.make} · year {p.year} · engine {p.engine} · fuel {p.fuel}</td>
                  <td className="td"><input aria-label={`Price for ${p.name}`} inputMode="decimal" value={prices[p.id]} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} className="input" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">Set range price</button></div>
    </form>
  );
}

export function QuotePriceCard({ q, o }: { q: { id: number; order: number; car: string; lines: { name: string; price: number; type: string }[] }; o: RangeOptions }) {
  const [r, setR] = useState<RangeState>(blank);
  const { pending, run } = useAction();
  return (
    <section className="card space-y-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-semibold">Admin quote for order #{q.order}</h3>
        <span className="font-mono text-xs text-muted">{q.car}</span>
      </div>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {q.lines.map((l, i) => <li key={i} className="flex justify-between gap-3 rounded-md bg-sunken px-3 py-1.5"><span>{l.name} <span className="font-mono text-xs text-muted">({l.type})</span></span><span className="font-mono">{gbp(l.price)}</span></li>)}
      </ul>
      <RangeFields o={o} v={r} set={setR} />
      <div className="flex justify-end gap-2">
        <button disabled={pending} onClick={() => run(() => skipQuotePrices(q.id))} className="btn btn-secondary">Don’t save</button>
        <button disabled={pending} onClick={() => run(() => saveQuotePrices(q.id, r))} className="btn btn-primary">Save these prices</button>
      </div>
    </section>
  );
}
