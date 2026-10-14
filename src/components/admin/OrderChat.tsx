"use client";
import { RefreshCw, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sendAdminOrderMessage } from "@/app/(app)/admin/orders/actions";
import { asset } from "@/lib/asset";
import { useToast } from "@/components/Toast";

type Msg = { id: number; who: "customer" | "mechanic" | "ssc"; text: string; file: string | null; fileType: string | null; at: string };

export function OrderChat({ orderId, mechanicId, names }: { orderId: number; mechanicId: number; names: { customer: string; mechanic: string } }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/orders/${orderId}/messages?mechanic=${mechanicId}`, { cache: "no-store" });
    if (r.ok) setMsgs(await r.json());
  }, [orderId, mechanicId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs?.length]);

  const label = { customer: names.customer, mechanic: names.mechanic, ssc: "Smart Servicing Centre" };
  return (
    <div className="card flex h-[620px] flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <h3 className="font-display text-base font-semibold">Customer ↔ mechanic chat</h3>
          <p className="text-xs text-muted">Messages you send appear as Smart Servicing Centre in both inboxes.</p>
        </div>
        <button onClick={load} className="btn btn-secondary !px-2.5 !py-1.5" aria-label="Reload messages"><RefreshCw size={15} /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-sunken/40 p-4">
        {msgs === null && <p className="text-center text-sm text-muted">Loading…</p>}
        {msgs?.length === 0 && <p className="text-center text-sm text-muted">No messages yet.</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`flex ${m.who === "mechanic" || m.who === "ssc" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.who === "ssc" ? "bg-accent text-on-accent" : m.who === "mechanic" ? "bg-brand text-on-brand" : "border border-line bg-raised"}`}>
              <div className="mb-0.5 text-xs font-semibold opacity-80">{label[m.who]}</div>
              {m.file && m.fileType === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.file.startsWith("data:") ? m.file : asset(m.file)} alt="Attachment" className="mb-1 max-h-56 rounded-lg" />
              )}
              {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
              <div className="mt-1 text-right font-mono text-[10px] opacity-70">{new Date(m.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          start(async () => {
            const r = await sendAdminOrderMessage(orderId, mechanicId, body);
            if (r.ok) {
              setText("");
              load();
            } else toast(r.message, false);
          });
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message as Smart Servicing Centre…" aria-label="Message" className="input" />
        <button disabled={pending || !text.trim()} className="btn btn-primary !px-3.5" aria-label="Send"><SendHorizontal size={18} /></button>
      </form>
    </div>
  );
}
