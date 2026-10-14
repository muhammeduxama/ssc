"use client";
import { useState } from "react";
import { saveDocMail, savePostcode, saveSetting, saveStripe } from "@/app/actions/admin-tools";
import { useAction } from "@/components/useAction";

function Box({ title, desc, children, onSave, pending }: { title: string; desc?: string; children: React.ReactNode; onSave: () => void; pending: boolean }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="card flex flex-col p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      <div className="mt-4 flex-1 space-y-3">{children}</div>
      <button disabled={pending} className="btn btn-primary mt-4 self-end">Save</button>
    </form>
  );
}
const Num = ({ id, label, v, set }: { id: string; label: string; v: string; set: (s: string) => void }) => (
  <div><label htmlFor={id} className="label">{label}</label><input id={id} inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} className="input" /></div>
);

export function LabourSettings({ s }: { s: Record<string, number> }) {
  const { pending, run } = useAction();
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(s).map(([k, x]) => [k, String(x)])));
  const f = (k: string) => (x: string) => setV({ ...v, [k]: x });
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Box title="MOT" desc={`Discount is ${Number(s.mot_discount_percent).toFixed(2)}% of the MOT price.`} pending={pending} onSave={() => run(() => saveSetting("mot", v))}>
        <Num id="mot" label="MOT price (£)" v={v.mot} set={f("mot")} />
        <Num id="mot_discount" label="MOT discount (£)" v={v.mot_discount} set={f("mot_discount")} />
      </Box>
      <Box title="Commission" desc="Platform commission taken from each booking." pending={pending} onSave={() => run(() => saveSetting("commission", v))}>
        <Num id="garage_comission" label="Garage commission (%)" v={v.garage_comission} set={f("garage_comission")} />
        <Num id="max_comission" label="Maximum commission (£)" v={v.max_comission} set={f("max_comission")} />
      </Box>
      <Box title="Labour hour limit" pending={pending} onSave={() => run(() => saveSetting("limit", v))}>
        <Num id="labour_hour_limit" label="Default labour hours" v={v.labour_hour_limit} set={f("labour_hour_limit")} />
      </Box>
      <Box title="Labour rate" pending={pending} onSave={() => run(() => saveSetting("hour", v))}>
        <Num id="labour_rate" label="Default labour rate (£/hour)" v={v.labour_rate} set={f("labour_rate")} />
      </Box>
    </div>
  );
}

export function PostcodeEditor({ p }: { p: { id: number; postcode: string; lat: number; long: number; city: string; county: string } }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ postcode: p.postcode, lat: String(p.lat), long: String(p.long), city: p.city, county: p.county });
  const { pending, run } = useAction();
  if (!open) return <button onClick={() => setOpen(true)} className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">Edit</button>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => savePostcode(p.id, v), { after: (r) => r.ok && setOpen(false) }); }} className="flex flex-wrap items-center justify-end gap-1.5">
      {(["postcode", "lat", "long", "city", "county"] as const).map((k) => (
        <input key={k} aria-label={k} placeholder={k} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="input !w-28 !py-1 text-xs" />
      ))}
      <button disabled={pending} className="btn btn-primary !px-2.5 !py-1 !text-xs">Save</button>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary !px-2.5 !py-1 !text-xs">Cancel</button>
    </form>
  );
}

export function StripeForm({ s }: { s: { publishable: string; client: string; secretSet: boolean; secretHint: string } }) {
  const { pending, run } = useAction();
  const [v, setV] = useState({ publish_key: s.publishable, secret_key: "", client_id: s.client });
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveStripe(v), { after: (r) => r.ok && setV({ ...v, secret_key: "" }) }); }} className="card max-w-2xl space-y-4 p-6">
      <div><label htmlFor="pk" className="label">Publishable key</label><input id="pk" value={v.publish_key} onChange={(e) => setV({ ...v, publish_key: e.target.value })} className="input font-mono text-xs" /></div>
      <div>
        <label htmlFor="sk" className="label">Secret key</label>
        <input id="sk" type="password" autoComplete="off" value={v.secret_key} onChange={(e) => setV({ ...v, secret_key: e.target.value })} placeholder={s.secretSet ? `Saved (${s.secretHint}) — leave blank to keep` : "sk_live_…"} className="input font-mono text-xs" />
      </div>
      <div><label htmlFor="ci" className="label">Connect client ID</label><input id="ci" value={v.client_id} onChange={(e) => setV({ ...v, client_id: e.target.value })} className="input font-mono text-xs" /></div>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">Save Stripe keys</button></div>
    </form>
  );
}

export function DocMailForm({ subject, description }: { subject: string; description: string }) {
  const { pending, run } = useAction();
  const [v, setV] = useState({ subject, description });
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveDocMail(v.subject, v.description)); }} className="card max-w-3xl space-y-4 p-6">
      <div><label htmlFor="ds" className="label">Subject</label><input id="ds" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} className="input" /></div>
      <div><label htmlFor="dd" className="label">Description</label><textarea id="dd" rows={8} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="input" /></div>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">Save</button></div>
    </form>
  );
}
