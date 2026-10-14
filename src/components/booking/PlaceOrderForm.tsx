"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/actions/booking";
import { GuestFields, TermsBox } from "./GuestFields";
import { SlotPicker, type Slot } from "./SlotPicker";

const QUESTIONS: [string, string][] = [
  ["rd_mobile_mech", "Are you happy with garage free collection & delivery service?"],
  ["rd_safe_drive", "Is your vehicle drivable?"],
  ["drop_off_location", "Are you happy to drop off the vehicle at a vetted garage within 5 miles?"],
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
        const f = new FormData(e.currentTarget);
        f.set("slots", JSON.stringify(slots));
        start(async () => {
          setError(null);
          const r = await placeOrder(f);
          if (r.ok && r.link) router.push(r.link);
          else {
            setError(r.message);
            if (r.link) router.push(r.link);
          }
        });
      }}
      className="space-y-6"
    >
      {guest && <GuestFields />}
      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-display text-lg font-semibold">Vehicle registration &amp; postcode</legend>
        <div><label className="label" htmlFor="o-postcode">Postcode</label><input id="o-postcode" value={postcode} disabled className="input" /></div>
        <div><label className="label" htmlFor="o-reg">Vehicle registration number</label><input id="o-reg" value={reg} disabled className="input uppercase" /></div>
        <div><label className="label" htmlFor="o-house">House no / house name *</label><input id="o-house" name="house_no" required defaultValue={houseNo} className="input" /></div>
        <div><label className="label" htmlFor="o-street">Street address *</label><input id="o-street" name="street" required defaultValue={street} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="o-city">City *</label><input id="o-city" name="city" required defaultValue={city} className="input" /></div>
      </fieldset>
      <fieldset className="card p-5">
        <legend className="px-1 font-display text-lg font-semibold">Schedule date</legend>
        <p className="mb-4 text-sm text-muted">Please select ALL of the times when you are available across multiple days. Once a mechanic has been assigned you will receive a 2-hour arrival window.</p>
        <SlotPicker value={slots} onChange={setSlots} />
      </fieldset>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-display text-lg font-semibold">Collection and delivery</legend>
        <p className="text-sm text-muted">Your booking will be offered to a mobile mechanic for free collection and delivery as standard. If you are happy with garage free collection &amp; delivery, please select below.</p>
        {QUESTIONS.map(([name, q]) => (
          <div key={name} role="radiogroup" aria-label={q} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sunken px-4 py-3">
            <span className="text-sm font-medium">{q}</span>
            <span className="flex gap-4 text-sm">
              {["Yes", "No"].map((v) => (
                <label key={v} className="flex items-center gap-1.5"><input type="radio" name={name} value={v} required className="accent-[var(--brand)]" /> {v}</label>
              ))}
            </span>
          </div>
        ))}
        <div><label className="label" htmlFor="o-notes">Additional information (optional) — where should we collect your car?</label><textarea id="o-notes" name="notes" rows={3} className="input" /></div>
      </fieldset>
      <TermsBox />
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={pending} className="btn btn-primary w-full !py-3 sm:w-auto sm:!px-8">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <>Proceed to next <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
