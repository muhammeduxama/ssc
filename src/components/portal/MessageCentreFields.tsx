"use client";
import { useState } from "react";
import { CANCEL_REASONS } from "@/lib/portal-options";

export function MessageCentreFields({ cancel, lead }: { cancel: boolean; lead?: string }) {
  const [reason, setReason] = useState("");
  return (
    <>
      {cancel && (
        <fieldset className="space-y-2">
          <legend className="label">Please select your cancellation reason from the list below</legend>
          {CANCEL_REASONS.map((r) => <label key={r} className="flex items-center gap-2 text-sm"><input type="radio" name="cancel_reason" value={r} required onChange={() => setReason(r)} className="accent-[var(--brand)]" /> {r}</label>)}
          {reason === "Other" && <input name="other_reason" required placeholder="Your reason" aria-label="Your reason" className="input" />}
          <p className="text-sm text-muted">We&apos;re sorry to hear that you wish to cancel your booking. As soon as you submit this form we will cancel this order.</p>
        </fieldset>
      )}
      <div>
        <label className="label" htmlFor="mc-message">{lead ?? "Please describe your problem in as much detail as possible."}</label>
        <textarea id="mc-message" name="message" required rows={5} className="input" />
      </div>
    </>
  );
}
