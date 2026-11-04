"use client";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Stripe card element + confirmCardSetup (getPaymentCard.blade.php). The card is saved for later
 * use; nothing is charged until the mechanic completes the job.
 */
export function CardForm({ publishableKey, clientSecret, name, onSaved, button = "Save card" }: { publishableKey: string; clientSecret: string; name: string; onSaved: (setupIntentId: string) => Promise<{ ok: boolean; message: string; link?: string }>; button?: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [card, setCard] = useState<StripeCardElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let el: StripeCardElement | null = null;
    let cancelled = false;
    loadStripe(publishableKey).then((s) => {
      if (cancelled || !mount.current) return;
      if (!s) { setError("Secure card entry could not load. Please refresh the page."); return; }
      const css = getComputedStyle(document.documentElement);
      el = s.elements().create("card", { hidePostalCode: false, style: { base: { fontSize: "16px", color: css.getPropertyValue("--ink").trim() || "#172033", "::placeholder": { color: css.getPropertyValue("--muted").trim() || "#526179" } } } });
      el.mount(mount.current);
      el.on("change", (e) => { setError(e.error?.message ?? null); setComplete(e.complete); });
      setStripe(s);
      setCard(el);
    }).catch(() => { if (!cancelled) setError("Secure card entry could not load. Please check your connection and refresh."); });
    return () => {
      cancelled = true;
      el?.destroy();
    };
  }, [publishableKey]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !card || !complete || busy) return;
        setBusy(true);
        setError(null);
        let navigating = false;
        try {
          const r = await stripe.confirmCardSetup(clientSecret, { payment_method: { card, billing_details: { name } } });
          if (r.error || !r.setupIntent) { setError(r.error?.message ?? "Your card could not be saved."); return; }
          const saved = await onSaved(r.setupIntent.id);
          if (!saved.ok) { setError(saved.message); return; }
          router.push(saved.link ?? "/dashboard");
          navigating = true;
        } catch { setError("Your card could not be confirmed. Please check your connection and try again."); }
        finally { if (!navigating) setBusy(false); }
      }}
      className="booking-card-form"
    >
      <div>
        <span id="booking-card-label" className="label">Card details</span>
        <div className="input !h-auto py-3.5"><div ref={mount} role="group" aria-labelledby="booking-card-label"/></div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      <button disabled={!card || !complete || busy} className="btn btn-primary w-full !py-3">{busy ? <Loader2 size={18} className="animate-spin" /> : <><Lock size={16} /> {button}</>}</button>
      <p className="flex items-center gap-2 text-xs text-muted"><Lock size={12} /> Stripe processes your card details securely. We never see your full card number.</p>
    </form>
  );
}
