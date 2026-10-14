"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRepairQuote } from "@/app/actions/booking";
import { GuestFields, TermsBox } from "./GuestFields";

export function RepairQuoteForm(p: { serviceId: number; serviceName: string; guest: boolean; postcode: string; reg: string; city: string; county: string; street: string; houseNo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const r = await saveRepairQuote(p.serviceId, f);
          if (r.link && (r.ok || r.link === "/")) router.push(r.link);
          if (!r.ok) setError(r.message);
        });
      }}
      className="space-y-6"
    >
      {p.guest && <GuestFields />}
      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-display text-lg font-semibold">Vehicle registration &amp; postcode</legend>
        <div><label className="label" htmlFor="q-postcode">Postal code</label><input id="q-postcode" value={p.postcode} readOnly className="input" /></div>
        <div><label className="label" htmlFor="q-reg">Vehicle registration number</label><input id="q-reg" value={p.reg} readOnly className="input uppercase" /></div>
        <div><label className="label" htmlFor="q-house">House no / house name *</label><input id="q-house" name="house_no" required defaultValue={p.houseNo} className="input" /></div>
        <div><label className="label" htmlFor="q-street">Street address *</label><input id="q-street" name="street" required defaultValue={p.street} className="input" /></div>
        <div><label className="label" htmlFor="q-city">City</label><input id="q-city" name="city" defaultValue={p.city} className="input" /></div>
        <div><label className="label" htmlFor="q-county">County</label><input id="q-county" value={p.county} readOnly className="input" /></div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q-service">What was the repair you wanted a quote on? *</label>
          <textarea id="q-service" name="service" required rows={4} defaultValue={p.serviceName} className="input" />
          <p className="mt-1 text-xs text-muted">You can describe any extra detail the mechanic needs to know, if necessary.</p>
        </div>
      </fieldset>
      <TermsBox />
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={pending} className="btn btn-primary !px-8 !py-3">{pending ? <Loader2 size={18} className="animate-spin" /> : "Submit"}</button>
    </form>
  );
}
