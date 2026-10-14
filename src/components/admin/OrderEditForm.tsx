"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { Result } from "@/app/(app)/admin/orders/actions";
import { useToast } from "@/components/Toast";

const SLOTS = ["08-10 AM", "10-12 AM", "12-02 AM", "02-04 AM", "04-06 AM", "06-08 AM"];

export function OrderEditForm({
  action,
  v,
  hasAssign,
  back,
}: {
  action: (s: Result | null, f: FormData) => Promise<Result>;
  v: { reg: string; date: string; time: string; street: string; city: string; county: string; postcode: string; notes: string };
  hasAssign: boolean;
  back: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok);
    if (state.ok) router.push(back);
  }, [state, toast, router, back]);

  return (
    <form action={run} className="card grid gap-5 p-6 md:grid-cols-2">
      <div>
        <label className="label" htmlFor="reg_no">Registration number</label>
        <input id="reg_no" name="reg_no" defaultValue={v.reg} className="input font-mono uppercase" required />
      </div>
      <div>
        <label className="label" htmlFor="date">Schedule date</label>
        <input id="date" name="date" defaultValue={v.date} placeholder="e.g. 06 Apr 2021" className="input" disabled={!hasAssign} />
      </div>
      <div>
        <label className="label" htmlFor="time_slot">Time slot</label>
        <select id="time_slot" name="time_slot" defaultValue={v.time} className="input" disabled={!hasAssign}>
          <option value="">Select one option</option>
          {v.time && !SLOTS.includes(v.time) && <option value={v.time}>{v.time}</option>}
          {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!hasAssign && <p className="mt-1 text-xs text-muted">Schedule can be set once a mechanic accepts the order.</p>}
      </div>
      <div>
        <label className="label" htmlFor="street">Street</label>
        <input id="street" name="street" defaultValue={v.street} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <input id="city" name="city" defaultValue={v.city} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="county">County</label>
        <input id="county" name="county" defaultValue={v.county} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="post_code">Postal code</label>
        <input id="post_code" defaultValue={v.postcode} className="input" disabled />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="information">Additional information</label>
        <textarea id="information" name="information" defaultValue={v.notes} rows={4} className="input" />
      </div>
      <div className="flex justify-end md:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Update order"}</button>
      </div>
    </form>
  );
}
