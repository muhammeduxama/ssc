"use client";
import { Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { addReview, deleteReview, updateReview } from "@/app/actions/admin-tools";
import { useAction } from "@/components/useAction";

const AREAS = ["quality", "punctuality", "communication", "overall"] as const;
type V = Record<(typeof AREAS)[number] | "review", string>;

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-sm capitalize">{label}</span>
      <div className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="p-0.5">
            <Star size={20} className={n <= value ? "fill-accent text-accent" : "text-line-strong"} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Editor({ init, onSubmit, pending, submit }: { init: V; onSubmit: (v: V) => void; pending: boolean; submit: string }) {
  const [v, setV] = useState(init);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-3">
      {AREAS.map((a) => <Stars key={a} label={a} value={Number(v[a])} onChange={(n) => setV({ ...v, [a]: String(n) })} />)}
      <textarea aria-label="Review" rows={3} value={v.review} onChange={(e) => setV({ ...v, review: e.target.value })} placeholder="What the customer said…" className="input" />
      <button disabled={pending} className="btn btn-primary">{submit}</button>
    </form>
  );
}

export function AddReview({ orders }: { orders: { id: number; label: string }[] }) {
  const [order, setOrder] = useState(String(orders[0]?.id ?? ""));
  const { pending, run } = useAction();
  return (
    <section className="card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">Add a review for a completed order</h2>
      <label htmlFor="ord" className="label">Order</label>
      <select id="ord" value={order} onChange={(e) => setOrder(e.target.value)} className="input mb-4">{orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      <Editor init={{ quality: "5", punctuality: "5", communication: "5", overall: "5", review: "" }} pending={pending} submit="Add review & notify mechanic" onSubmit={(v) => order && run(() => addReview(Number(order), v))} />
    </section>
  );
}

export function ReviewRow({ r }: { r: { id: number; quality: number; punctuality: number; communication: number; overall: number; review: string } }) {
  const [edit, setEdit] = useState(false);
  const { pending, run } = useAction();
  if (edit)
    return (
      <div className="rounded-lg bg-sunken p-3">
        <Editor init={{ quality: String(r.quality), punctuality: String(r.punctuality), communication: String(r.communication), overall: String(r.overall), review: r.review }} pending={pending} submit="Save review" onSubmit={(v) => run(() => updateReview(r.id, v), { after: (x) => x.ok && setEdit(false) })} />
      </div>
    );
  return (
    <div className="flex justify-end gap-1">
      <button onClick={() => setEdit(true)} aria-label="Edit review" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><Pencil size={15} /></button>
      <button disabled={pending} onClick={() => run(() => deleteReview(r.id), { confirm: "Delete this review?" })} aria-label="Delete review" className="rounded-md p-1.5 text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>
    </div>
  );
}
