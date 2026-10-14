"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrder, saveSscNotes, sendGarageRequest, type Result } from "@/app/(app)/admin/orders/actions";
import { useToast } from "@/components/Toast";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<Result>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok);
      if (r.ok) router.refresh();
    });
  };
  return { pending, run };
}

export function CancelButtons({ id, status }: { id: number; status: string }) {
  const { pending, run } = useRun();
  if (status === "rejected") return <span className="pill border-transparent bg-danger-soft text-danger">This order is cancelled</span>;
  if (status !== "assigned" && status !== "pending") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={pending} onClick={() => run(() => cancelOrder(id, "email"), "Reject this order and email the customer?")} className="btn btn-secondary !text-danger">Cancel with email</button>
      <button disabled={pending} onClick={() => run(() => cancelOrder(id, "silent"), "Cancel this order without sending any email?")} className="btn btn-secondary">Cancel without email</button>
      <button disabled={pending} onClick={() => run(() => cancelOrder(id, "no-mechanic"), "Reject and send the “no mechanic accepted” email?")} className="btn btn-secondary">Cancel with no-mechanic email</button>
    </div>
  );
}

export function SscNotes({ id, initial }: { id: number; initial: string | null }) {
  const [v, setV] = useState(initial ?? "");
  const { pending, run } = useRun();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSscNotes(id, v));
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} placeholder="What Smart Servicing Centre says…" className="input flex-1" aria-label="Note by SSC" />
      <button disabled={pending} className="btn btn-primary sm:self-start">Save note</button>
    </form>
  );
}

export function GarageRequest({ id, mechanics }: { id: number; mechanics: { id: number; label: string; miles: number; active: boolean }[] }) {
  const [m, setM] = useState(String(mechanics[0]?.id ?? ""));
  const { pending, run } = useRun();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (m) run(() => sendGarageRequest(id, Number(m)));
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="garage" className="label">Select garage</label>
        <select id="garage" value={m} onChange={(e) => setM(e.target.value)} className="input">
          {mechanics.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label} ({x.miles} miles away) {x.active ? "Active" : "Blocked"}
            </option>
          ))}
        </select>
      </div>
      <button disabled={pending || !m} className="btn btn-primary">Send request</button>
    </form>
  );
}
