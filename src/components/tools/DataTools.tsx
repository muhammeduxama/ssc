"use client";
import { useRef, useState } from "react";
import { bulkModels, decideCarPrice, decideModelRequest, importCars, importServices, uploadSitemap } from "@/app/actions/admin-tools";
import { useAction } from "@/components/useAction";

export function CarPriceDecision({ id }: { id: number }) {
  const { pending, run } = useAction();
  return (
    <div className="flex justify-end gap-2">
      <button disabled={pending} onClick={() => run(() => decideCarPrice(id, "reject"))} className="btn btn-secondary !px-2.5 !py-1 !text-xs !text-danger">Reject</button>
      <button disabled={pending} onClick={() => run(() => decideCarPrice(id, "accept"))} className="btn btn-primary !px-2.5 !py-1 !text-xs">Accept</button>
    </div>
  );
}

export function ModelRequestDecision({ id, models }: { id: number; models: { id: number; name: string }[] }) {
  const { pending, run } = useAction();
  const [m, setM] = useState("");
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select aria-label="Attach to existing model" value={m} onChange={(e) => setM(e.target.value)} className="input !w-44 !py-1.5 text-xs">
        <option value="">Attach to model…</option>
        {models.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      <button disabled={pending || !m} onClick={() => run(() => decideModelRequest(id, "keyword", Number(m)))} className="btn btn-secondary !px-2.5 !py-1 !text-xs">Add as keyword</button>
      <button disabled={pending} onClick={() => run(() => decideModelRequest(id, "reject"), { confirm: "Remove this request?" })} className="btn btn-secondary !px-2.5 !py-1 !text-xs !text-danger">Reject</button>
      <button disabled={pending} onClick={() => run(() => decideModelRequest(id, "approve"))} className="btn btn-primary !px-2.5 !py-1 !text-xs">Approve as new model</button>
    </div>
  );
}

export function UploadForm({ kind, accept, label, help }: { kind: "cars" | "services" | "sitemap"; accept: string; label: string; help: string }) {
  const { pending, run } = useAction();
  const ref = useRef<HTMLFormElement>(null);
  const name = kind === "sitemap" ? "sitemape_file" : "csv";
  const fn = kind === "cars" ? importCars : kind === "services" ? importServices : uploadSitemap;
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => fn(fd), { after: (r) => r.ok && ref.current?.reset() }); }} className="card max-w-xl space-y-4 p-6">
      <div>
        <label htmlFor="up" className="label">{label}</label>
        <input id="up" type="file" name={name} accept={accept} required className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
        <p className="mt-2 text-xs text-muted">{help}</p>
      </div>
      <button disabled={pending} className="btn btn-primary">{pending ? "Uploading…" : "Upload"}</button>
    </form>
  );
}

export function BulkModelsForm({ makes }: { makes: string[] }) {
  const { pending, run } = useAction();
  const [make, setMake] = useState("");
  const [models, setModels] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => bulkModels(make, models.split(/[\n,]/)), { after: (r) => r.ok && setModels("") }); }} className="card max-w-xl space-y-4 p-6">
      <div>
        <label htmlFor="mk" className="label">Make</label>
        <input id="mk" list="makes" value={make} onChange={(e) => setMake(e.target.value)} className="input" placeholder="e.g. Volkswagen" />
        <datalist id="makes">{makes.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div>
        <label htmlFor="md" className="label">Models (one per line or comma separated)</label>
        <textarea id="md" rows={6} value={models} onChange={(e) => setModels(e.target.value)} className="input" />
        <p className="mt-2 text-xs text-muted">Models that don’t exist yet are added to Car requests for approval.</p>
      </div>
      <button disabled={pending} className="btn btn-primary">Upload models</button>
    </form>
  );
}
