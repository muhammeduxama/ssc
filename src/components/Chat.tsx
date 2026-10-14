"use client";
import { ArrowLeft, Paperclip, Search, SendHorizontal, LifeBuoy, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initials } from "@/lib/format";
import type { Message, Thread } from "@/lib/chat";

const time = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
    : "";
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date();
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);
};

export function Chat({ initialThreads, initialKey }: { initialThreads: Thread[]; initialKey?: string }) {
  const [threads, setThreads] = useState(initialThreads);
  const [active, setActive] = useState<string | null>(initialKey ?? initialThreads[0]?.key ?? null);
  const [mobileThread, setMobileThread] = useState(!!initialKey);
  const [q, setQ] = useState("");

  // Keep the list fresh.
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch("/api/chat/threads", { cache: "no-store" });
      if (r.ok) setThreads(await r.json());
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? threads.filter((t) => (t.title + t.subtitle + t.last).toLowerCase().includes(n)) : threads;
  }, [threads, q]);
  const current = threads.find((t) => t.key === active) ?? null;

  return (
    <div className="card grid h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden lg:grid-cols-[340px_1fr]">
      {/* thread list */}
      <div className={`${mobileThread ? "hidden" : "flex"} min-h-0 flex-col border-r border-line lg:flex`}>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="input pl-9" aria-label="Search conversations" />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted">No conversations yet.</li>}
          {filtered.map((t) => (
            <li key={t.key}>
              <button
                onClick={() => {
                  setActive(t.key);
                  setMobileThread(true);
                }}
                aria-current={active === t.key}
                className={`flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left transition hover:bg-sunken ${active === t.key ? "bg-brand-soft/60" : ""}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs font-medium text-brand">
                  {t.kind === "support" ? <LifeBuoy size={18} /> : initials(t.title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{t.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{time(t.lastAt)}</span>
                  </span>
                  <span className="block truncate font-mono text-[11px] text-muted">{t.subtitle}</span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted">{t.last || "No messages yet"}</span>
                    {t.unread > 0 && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-medium text-on-accent">{t.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* conversation */}
      <div className={`${mobileThread ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}>
        {current ? (
          <Conversation key={current.key} thread={current} onBack={() => setMobileThread(false)} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-muted">
            <div>
              <User size={28} className="mx-auto mb-3" />
              Select a conversation to start.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Conversation({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const url = `/api/chat/${encodeURIComponent(thread.key)}`;

  const load = useCallback(async () => {
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) setMsgs(await r.json());
  }, [url]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    setMsgs((m) => [...(m ?? []), { id: `tmp${Date.now()}`, mine: true, author: "You", text: body, file: null, fileType: null, at: new Date().toISOString() }]);
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: body }) });
    setSending(false);
    load();
  }

  let lastDay = "";
  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onBack} aria-label="Back to conversations" className="rounded-md p-1.5 text-muted hover:bg-sunken lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-mono text-xs font-medium text-brand">
          {thread.kind === "support" ? <LifeBuoy size={18} /> : initials(thread.title)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{thread.title}</div>
          <div className="truncate font-mono text-[11px] text-muted">{thread.subtitle}</div>
        </div>
        <Link href={`/orders/${thread.orderId}`} className="btn btn-secondary !py-1.5 !text-xs">View order</Link>
      </header>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-sunken/40 px-4 py-5">
        {msgs === null && <p className="text-center text-sm text-muted">Loading…</p>}
        {msgs?.length === 0 && <p className="text-center text-sm text-muted">No messages yet. Say hello.</p>}
        {msgs?.map((m) => {
          const d = dayLabel(m.at);
          const head = d !== lastDay;
          lastDay = d;
          return (
            <div key={m.id}>
              {head && (
                <div className="my-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted">
                  <span className="h-px flex-1 bg-line" />
                  {d}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm border border-line bg-raised"}`}>
                  {!m.mine && <div className="mb-0.5 text-xs font-semibold text-brand">{m.author}</div>}
                  {m.file && m.fileType === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.file.startsWith("data:") ? m.file : `data:image/jpeg;base64,${m.file}`} alt="Attachment" className="mb-1 max-h-56 rounded-lg" />
                  )}
                  {m.file && m.fileType !== "image" && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs opacity-80"><Paperclip size={12} /> Attachment</div>
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  <div className={`mt-1 text-right font-mono text-[10px] ${m.mine ? "text-on-brand/70" : "text-muted"}`}>{time(m.at)}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          rows={1}
          placeholder="Write a message…"
          aria-label="Message"
          className="input max-h-32 min-h-[42px] resize-none"
        />
        <button className="btn btn-primary !px-3.5" disabled={!text.trim() || sending} aria-label="Send">
          <SendHorizontal size={18} />
        </button>
      </form>
    </>
  );
}
