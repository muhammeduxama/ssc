"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/actions/booking";
import { GuestFields, TermsBox } from "./GuestFields";
import { SlotPicker, type Slot } from "./SlotPicker";

const QUESTIONS: [string, string][] = [
  ["rd_mobile_mech", "Can a garage collect and return your car?"],
  ["rd_safe_drive", "Is your car safe to drive?"],
  ["drop_off_location", "Could you drop your car off at a garage within 5 miles?"],
];

export function PlaceOrderForm({ guest, postcode, reg, city, street, houseNo }: { guest: boolean; postcode: string; reg: string; city: string; street: string; houseNo: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (!slots.length) { setError("Please choose at least one arrival window."); document.getElementById("booking-availability")?.focus(); return; }
        const f = new FormData(e.currentTarget);
        f.set("slots", JSON.stringify(slots));
        start(async () => {
          setError(null);
          try {
            const r = await placeOrder(f);
            if (r.ok && r.link) router.push(r.link);
            else { setError(r.message); if (r.link) router.push(r.link); }
          } catch { setError("We couldn't save your booking. Please check your connection and try again."); }
        });
      }}
      className="booking-details-form"
    >
      {guest && <GuestFields />}
      <fieldset className="booking-form-section grid gap-4 sm:grid-cols-2">
        <legend>Where will your car be?</legend>
        <div><label className="label" htmlFor="o-postcode">Postcode</label><input id="o-postcode" value={postcode} disabled className="input" /></div>
        <div><label className="label" htmlFor="o-reg">Vehicle registration number</label><input id="o-reg" value={reg} disabled className="input uppercase" /></div>
        <div><label className="label" htmlFor="o-house">House number or name *</label><input id="o-house" name="house_no" autoComplete="address-line1" required defaultValue={houseNo} className="input" /></div>
        <div><label className="label" htmlFor="o-street">Street address *</label><input id="o-street" name="street" autoComplete="address-line2" required defaultValue={street} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="o-city">City *</label><input id="o-city" name="city" autoComplete="address-level2" required defaultValue={city} className="input" /></div>
      </fieldset>
      <fieldset id="booking-availability" tabIndex={-1} className="booking-form-section">
        <legend>When are you available?</legend>
        <p className="mb-4 text-sm text-muted">Choose the arrival windows that work for you, across one or more days. Your mechanic will confirm the visit once your request is accepted.</p>
        <SlotPicker value={slots} onChange={setSlots} />
      </fieldset>
      <fieldset className="booking-form-section space-y-4">
        <legend>Your visit preferences</legend>
        <p className="text-sm text-muted">These details help us match your booking with a suitable mobile mechanic or garage.</p>
        {QUESTIONS.map(([name, q]) => (
          <div key={name} role="radiogroup" aria-label={q} className="booking-preference">
            <span className="text-sm font-medium">{q}</span>
            <span className="booking-radio-options">
              {["Yes", "No"].map((v) => (
                <label key={v} className="booking-radio-option"><input type="radio" name={name} value={v} required className="accent-[var(--brand)]" /> {v}</label>
              ))}
            </span>
          </div>
        ))}
        <div><label className="label" htmlFor="o-notes">Anything else we should know? (optional)</label><textarea id="o-notes" name="notes" rows={3} className="input" /></div>
      </fieldset>
      <TermsBox />
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={pending} className="btn btn-primary w-full !py-3 sm:w-auto sm:!px-8">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <>Continue to payment <ArrowRight size={16} /></>}
      </button>
      <p className="booking-field-help">Next: add your card securely and confirm your booking request.</p>
    </form>
  );
}
