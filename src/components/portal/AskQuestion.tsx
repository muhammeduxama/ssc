"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { askQuestion } from "@/app/actions/portal";
import { useToast } from "@/components/Toast";

export function AskQuestion({ requestId }: { requestId: number }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await askQuestion(requestId, msg);
          toast(r.message, r.ok);
          if (r.ok && r.link) router.push(r.link);
        });
      }}
      className="space-y-3"
    >
      <label className="label" htmlFor="ask">Ask the mechanic a question</label>
      <textarea id="ask" value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} required className="input" />
      <button disabled={pending} className="btn btn-primary">{pending ? "Sending…" : "Ask question"}</button>
    </form>
  );
}
