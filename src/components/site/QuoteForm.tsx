"use client";
import { ArrowRight, Loader2, CarFront, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startBooking, startBookingManual } from "@/app/actions/booking";
import { Modal } from "@/components/mechanic/Modal";
import { VehiclePicker } from "@/components/mechanic/VehiclePicker";

/** Reg + postcode quote form from the Laravel home page, plus the "I don't know my registration" modal. */
export function QuoteForm({ compact = false }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vehicleComplete, setVehicleComplete] = useState(false);
  const [manual, setManual] = useState(false);
  const router = useRouter();

  const go = (fn: () => Promise<{ ok: boolean; message: string; link?: string }>) =>
    start(async () => {
      setError(null);
      try {
        const r = await fn();
        if (r.ok && r.link) router.push(r.link);
        else setError(r.message);
      } catch { setError("We couldn’t check your vehicle. Please try again."); }
    });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          go(() => startBooking(String(f.get("registration_no") ?? ""), String(f.get("post_code") ?? "")));
        }}
        className={`grid gap-3 ${compact ? "" : "sm:grid-cols-[1.2fr_1fr_auto]"}`}
      >
        <div>
          <label htmlFor="registration_no" className="label">Registration number</label>
          <input id="registration_no" name="registration_no" required placeholder="AB12 CDE" autoComplete="off" className="input !h-12 bg-accent/15 font-mono text-lg font-semibold uppercase tracking-widest" />
        </div>
        <div>
          <label htmlFor="post_code" className="label">Postcode</label>
          <input id="post_code" name="post_code" required placeholder="RG30 2RG" autoComplete="postal-code" className="input !h-12 text-lg uppercase" />
        </div>
        <div className="flex items-end">
          <button disabled={pending} className="btn btn-primary !h-12 w-full !px-6">
            {pending ? <Loader2 size={18} className="animate-spin" /> : <>Get quote <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button type="button" onClick={() => { setVehicleComplete(false); setError(null); setManual(true); }} className="mt-3 text-sm font-medium text-brand underline underline-offset-4">
        I don&apos;t know my registration number
      </button>

      <Modal busy={pending} open={manual} onClose={() => setManual(false)} title="Let’s find your vehicle" description="No registration? No problem. A few details will help us find the right services and prices." wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            go(() => startBookingManual(f));
          }}
          className="manual-vehicle-form"
        >
          <section className="manual-form-section">
            <div className="manual-section-title"><span className="icon-tile"><MapPin size={19} /></span><div><h3 className="font-semibold">Where do you need us?</h3><p className="mt-0.5 text-xs text-muted">We’ll use this to find services in your area.</p></div></div>
            <label htmlFor="m-postcode" className="label">Your postcode</label>
            <input id="m-postcode" name="postcode" autoFocus autoComplete="postal-code" placeholder="e.g. RG30 2RG" required className="input uppercase" />
          </section>
          <section className="manual-form-section">
            <div className="manual-section-title"><span className="icon-tile"><CarFront size={20} /></span><div><h3 className="font-semibold">Which car do you drive?</h3><p className="mt-0.5 text-xs text-muted">Select the details in the order below.</p></div></div>
            <VehiclePicker onCompleteChange={setVehicleComplete} />
          </section>
          {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
          <div className="manual-form-footer"><p className="text-xs leading-5 text-muted">{vehicleComplete ? "Your vehicle details are ready. Let’s find your services." : "Complete all five vehicle details to continue."}</p><div className="flex gap-3"><button type="button" disabled={pending} onClick={() => setManual(false)} className="btn btn-secondary">Cancel</button><button disabled={pending || !vehicleComplete} className="btn btn-primary">{pending ? "Checking…" : "Find services"}<ArrowRight size={17} /></button></div></div>
        </form>
      </Modal>
    </div>
  );
}
