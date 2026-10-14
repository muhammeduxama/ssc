"use client";
import { Paperclip, SendHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addQuoteLine, deleteQuoteLine, sendAdminQuote, sendQuoteChat, sendQuoteRequest, type Result } from "@/app/(app)/admin/quotes/actions";
import { useToast } from "@/components/Toast";
import { asset } from "@/lib/asset";
import { gbp } from "@/lib/format";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const r = await fn();
        toast(r.message, r.ok);
        if (r.ok) {
          after?.();
          router.refresh();
        }
      }),
  };
}

function Suggest({ type, value, onChange, onPick, placeholder, id }: { type: "service" | "part"; value: string; onChange: (v: string) => void; onPick: (name: string, price?: number) => void; placeholder: string; id: string }) {
  const [items, setItems] = useState<{ name: string; price?: number; hours?: number }[]>([]);
  useEffect(() => {
    if (value.trim().length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/search?type=${type}&q=${encodeURIComponent(value)}`);
      if (r.ok) setItems(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [value, type]);
  return (
    <div className="relative">
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" autoComplete="off" />
      {items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-raised shadow-card">
          {items.map((i) => (
            <li key={i.name}>
              <button type="button" onClick={() => { onPick(i.name, i.price); setItems([]); }} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-brand-soft">
                <span>{i.name}</span>
                <span className="font-mono text-xs text-muted">{i.price !== undefined ? gbp(i.price) : `${i.hours}h`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuoteBuilder({ orderId, lines, total, status, labourRate }: { orderId: number; lines: { id: number; name: string; price: number; type: string }[]; total: number; status: string; labourRate: number }) {
  const { pending, run } = useRun();
  const [svc, setSvc] = useState({ name: "", price: "" });
  const [part, setPart] = useState({ name: "", price: "" });
  const [notes, setNotes] = useState("");
  const labours = lines.filter((l) => l.type === "labour");
  const parts = lines.filter((l) => l.type === "part");

  const Table = ({ title, rows }: { title: string; rows: typeof lines }) => (
    <div className="card overflow-hidden">
      <h4 className="border-b border-line px-4 py-2.5 font-display text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? <p className="px-4 py-3 text-sm text-muted">None yet.</p> : (
        <ul>
          {rows.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-sm first:border-t-0">
              <span className="w-6 font-mono text-xs text-muted">{i + 1}</span>
              <span className="flex-1">{l.name}</span>
              <span className="font-mono">{gbp(l.price)}</span>
              <button disabled={pending} onClick={() => confirm(`Remove ${l.name}?`) && run(() => deleteQuoteLine(orderId, l.id))} aria-label={`Remove ${l.name}`} className="rounded-md p-1.5 text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <section className="card p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Add quotation lines</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); run(() => addQuoteLine(orderId, "labour", svc.name, svc.price), () => setSvc({ name: "", price: "" })); }} className="space-y-2 rounded-lg bg-sunken/60 p-3">
              <label htmlFor="svc" className="label">Service name</label>
              <Suggest id="svc" type="service" value={svc.name} onChange={(v) => setSvc({ ...svc, name: v })} onPick={(n) => setSvc({ ...svc, name: n })} placeholder="e.g. Brake pads replacement" />
              <label htmlFor="svcp" className="label">Labour price (£)</label>
              <input id="svcp" inputMode="decimal" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value })} placeholder={`e.g. ${labourRate.toFixed(2)}`} className="input" />
              <button disabled={pending} className="btn btn-primary w-full">Add labour</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); run(() => addQuoteLine(orderId, "part", part.name, part.price), () => setPart({ name: "", price: "" })); }} className="space-y-2 rounded-lg bg-sunken/60 p-3">
              <label htmlFor="prt" className="label">Part name</label>
              <Suggest id="prt" type="part" value={part.name} onChange={(v) => setPart({ ...part, name: v })} onPick={(n, p) => setPart({ name: n, price: p !== undefined ? String(p) : part.price })} placeholder="e.g. Front brake pads" />
              <label htmlFor="prtp" className="label">Part price (£)</label>
              <input id="prtp" inputMode="decimal" value={part.price} onChange={(e) => setPart({ ...part, price: e.target.value })} placeholder="e.g. 25" className="input" />
              <button disabled={pending} className="btn btn-primary w-full">Add part</button>
            </form>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <Table title="Labour" rows={labours} />
          <Table title="Parts" rows={parts} />
        </div>
      </div>
      <aside className="card h-fit p-5">
        <span className="eyebrow">{status === "Sent" ? "Sent quote" : "Unsent quote"}</span>
        <div className="mt-3 font-display text-4xl font-medium text-brand">{gbp(total)}</div>
        <p className="mt-1 text-sm text-muted">{labours.length} labour · {parts.length} parts</p>
        <form onSubmit={(e) => { e.preventDefault(); if (confirm("Send this quote to the customer?")) run(() => sendAdminQuote(orderId, notes)); }} className="mt-5 space-y-3">
          <label htmlFor="notes" className="label">Additional information</label>
          <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes for the customer" className="input" />
          <button disabled={pending || lines.length === 0} className="btn btn-primary w-full"><SendHorizontal size={16} /> {status === "Sent" ? "Resend quote" : "Send quote to customer"}</button>
        </form>
      </aside>
    </div>
  );
}

export function QuoteRequestForm({ orderId, mechanics }: { orderId: number; mechanics: { id: number; label: string; miles: number; active: boolean }[] }) {
  const [m, setM] = useState(String(mechanics[0]?.id ?? ""));
  const { pending, run } = useRun();
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (m) run(() => sendQuoteRequest(orderId, Number(m))); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="mech" className="label">Select garage</label>
        <select id="mech" value={m} onChange={(e) => setM(e.target.value)} className="input">
          {mechanics.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.miles} miles away) {x.active ? "Active" : "Blocked"}</option>)}
        </select>
      </div>
      <button disabled={pending || !m} className="btn btn-primary">Send quote request</button>
    </form>
  );
}

export function QuoteChat({ orderId, customer, messages }: { orderId: number; customer: string; messages: { id: number; sender: string; text: string; file: string | null; at: string }[] }) {
  const router = useRouter();
  const { pending, run } = useRun();
  const form = useRef<HTMLFormElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  return (
    <div className="card flex h-[600px] flex-col overflow-hidden">
      <header className="border-b border-line px-5 py-3">
        <h3 className="font-display text-base font-semibold">Chat with {customer}</h3>
        <p className="text-xs text-muted">The customer gets an email with a reply link for every message.</p>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-sunken/40 p-4">
        {messages.length === 0 && <p className="text-center text-sm text-muted">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.sender === "admin";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm border border-line bg-raised"}`}>
                <div className="mb-0.5 text-xs font-semibold opacity-80">{mine ? "Smart Servicing Centre" : customer}</div>
                {m.file && (/\.(png|jpe?g|gif|webp)$/i.test(m.file) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset(m.file)} alt="Attachment" className="mb-1 max-h-56 rounded-lg" />
                ) : (
                  <a href={asset(m.file)} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-1 text-xs underline"><Paperclip size={12} /> Attachment</a>
                ))}
                {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                <div className="mt-1 text-right font-mono text-[10px] opacity-70">{new Date(m.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form ref={form} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => sendQuoteChat(orderId, fd), () => form.current?.reset()); }} className="flex items-center gap-2 border-t border-line p-3">
        <label className="cursor-pointer rounded-md p-2 text-muted hover:bg-sunken hover:text-ink" title="Attach file">
          <Paperclip size={18} />
          <input type="file" name="file" className="sr-only" />
        </label>
        <input name="message" placeholder="Type message…" aria-label="Message" className="input" />
        <button disabled={pending} className="btn btn-primary !px-3.5" aria-label="Send"><SendHorizontal size={18} /></button>
      </form>
    </div>
  );
}
