"use client";
import { useState } from "react";
import { respondToReview } from "@/app/actions/mechanic-jobs";
import { useAction } from "@/components/useAction";

export function ReviewReply({ id, initial }: { id: number; initial: string }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => respondToReview(id, v)); }} className="space-y-3">
      <label className="label" htmlFor="rr">Your response</label>
      <textarea id="rr" rows={4} value={v} onChange={(e) => setV(e.target.value)} className="input" />
      <button disabled={pending || !v.trim()} className="btn btn-primary">Send response</button>
    </form>
  );
}
