import { CLOSE_REASONS } from "@/lib/portal-options";

export function CloseQuoteFields() {
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="label">Please select your reason</legend>
        {CLOSE_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm"><input type="radio" name="subject" value={r} required className="accent-[var(--brand)]" /> {r}</label>
        ))}
      </fieldset>
      <div>
        <label className="label" htmlFor="cq-message">Please describe your problem in as much detail as possible</label>
        <textarea id="cq-message" name="message" rows={4} className="input" />
      </div>
    </>
  );
}
