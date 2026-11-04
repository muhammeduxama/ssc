"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TermsBox } from "./GuestFields";
import { SlotPicker, type Slot } from "./SlotPicker";

type R = { ok: boolean; message: string; link?: string };
const QUESTIONS: [string, string][] = [
  ["rd_mobile_mech", "Can a garage collect and return your car?"],
  ["rd_safe_drive", "Is your vehicle drivable?"],
  ["drop_off_location", "Could you drop your car off at a garage within 5 miles?"],
];

/** Address + availability + collection answers (admin-quote booking, mechanic-quote booking, bespoke). */
export function ScheduleForm({ action, address, children, submit = "Proceed to next" }: { action: (f: FormData) => Promise<R>; address?: { house: string; street: string; city: string } | null; children?: React.ReactNode; submit?: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        f.set("slots", JSON.stringify(slots));
        start(async () => {
          setError(null);
          const r = await action(f);
          if (r.ok && r.link) router.push(r.link);
          else if (r.ok) router.refresh();
          else setError(r.message);
        });
      }}
      className="booking-details-form"
    >
      {children}
      {address && (
        <fieldset className="booking-form-section grid gap-4 sm:grid-cols-3">
          <legend className="px-1 font-display text-lg font-semibold">Your address</legend>
          <div><label className="label" htmlFor="s-house">House no / house name *</label><input id="s-house" name="house_no" required defaultValue={address.house} className="input" /></div>
          <div><label className="label" htmlFor="s-street">Street address *</label><input id="s-street" name="street" required defaultValue={address.street} className="input" /></div>
          <div><label className="label" htmlFor="s-city">City *</label><input id="s-city" name="city" required defaultValue={address.city} className="input" /></div>
        </fieldset>
      )}
      <fieldset className="booking-form-section">
        <legend className="px-1 font-display text-lg font-semibold">Schedule date</legend>
        <p className="mb-4 text-sm text-muted">Please select ALL of the times when you are available across multiple days. Once a mechanic has been assigned you will receive a 2-hour arrival window.</p>
        <SlotPicker value={slots} onChange={setSlots} />
      </fieldset>
      <fieldset className="booking-form-section space-y-3">
        <legend className="px-1 font-display text-lg font-semibold">Collection and delivery</legend>
        {QUESTIONS.map(([name, q]) => (
          <div key={name} role="radiogroup" aria-label={q} className="booking-preference">
            <span className="text-sm font-medium">{q}</span>
            <span className="booking-radio-options">{["Yes", "No"].map((v) => <label key={v} className="booking-radio-option"><input type="radio" name={name} value={v} required className="accent-[var(--brand)]" /> {v}</label>)}</span>
          </div>
        ))}
        <div><label className="label" htmlFor="s-notes">Additional information (optional) — where should we collect your car?</label><textarea id="s-notes" name="notes" rows={3} className="input" /></div>
      </fieldset>
      <TermsBox />
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={pending} className="btn btn-primary !px-8 !py-3">{pending ? <Loader2 size={18} className="animate-spin" /> : <>{submit} <ArrowRight size={16} /></>}</button>
    </form>
  );
}
