"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TermsBox } from "./GuestFields";
import { SlotPicker, type Slot } from "./SlotPicker";

type R = { ok: boolean; message: string; link?: string };

/** Fields + availability + terms (bespoke estimate acceptance). */
export function ScheduleFormNoQuestions({ action, children }: { action: (f: FormData) => Promise<R>; children?: React.ReactNode }) {
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
          if (r.link) router.push(r.link);
          if (!r.ok) setError(r.message);
        });
      }}
      className="space-y-6"
    >
      {children}
      <fieldset className="card p-5">
        <legend className="px-1 font-display text-lg font-semibold">When are you available?</legend>
        <p className="mb-4 text-sm text-muted">Please select ALL of the times when you are available. Your mechanic will confirm a 2-hour arrival window.</p>
        <SlotPicker value={slots} onChange={setSlots} />
      </fieldset>
      <TermsBox />
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={pending} className="btn btn-primary !px-8 !py-3">{pending ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}</button>
    </form>
  );
}
