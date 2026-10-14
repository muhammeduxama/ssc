"use client";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { storeReview } from "@/app/actions/portal";

const FIELDS: [string, string][] = [["work_quality", "Work quality"], ["punctuality", "Punctuality"], ["communication", "Communication"], ["overall", "Overall"]];

export function ReviewForm({ orderToken, apiToken, initial, text }: { orderToken: string; apiToken: string; initial: Record<string, number>; text: string }) {
  const [v, setV] = useState<Record<string, number>>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        for (const [k] of FIELDS) f.set(k, String(v[k] ?? ""));
        start(async () => {
          const r = await storeReview(orderToken, apiToken, f);
          setMsg(r);
          if (r.ok && r.link) setTimeout(() => router.push(r.link!), 1200);
        });
      }}
      className="space-y-5"
    >
      {FIELDS.map(([k, label]) => (
        <div key={k}>
          <div className="label">{label} *</div>
          <div className="flex gap-1" role="radiogroup" aria-label={label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={v[k] === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setV({ ...v, [k]: n })} className="text-accent">
                <Star size={28} fill={(v[k] ?? 0) >= n ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div><label className="label" htmlFor="rv-text">Your review</label><textarea id="rv-text" name="review" rows={5} defaultValue={text} className="input" /></div>
      {msg && <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-ok bg-ok-soft" : "border-danger bg-danger-soft"}`}>{msg.message}</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Submit"}</button>
    </form>
  );
}
