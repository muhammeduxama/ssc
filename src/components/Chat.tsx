"use client";
import { ArrowLeft, Paperclip, Search, SendHorizontal, LifeBuoy, User, RefreshCw, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asset } from "@/lib/asset";
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

export function Chat({ initialThreads, initialKey, role }: { initialThreads: Thread[]; initialKey?: string; role: string }) {
  const [threads, setThreads] = useState(initialThreads);
  const selectedKey = initialThreads.some((t) => t.key === initialKey) ? initialKey! : null;
  const [active, setActive] = useState<string | null>(selectedKey ?? initialThreads[0]?.key ?? null);
  const [mobileThread, setMobileThread] = useState(!!selectedKey);
  const [listError, setListError] = useState(false);
  const [q, setQ] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Schedule the next poll after the current request completes; never overlap slow requests.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const r = await fetch("/api/chat/threads", { cache: "no-store", signal: controller.signal });
        if (!r.ok) throw new Error("Could not refresh conversations");
        const data: Thread[] = await r.json();
        if (!stopped) { setThreads((previous) => { const selected = previous.find((t) => t.key === initialKey); return selected && !data.some((t) => t.key === selected.key) ? [selected, ...data] : data; }); setListError(false); }
      } catch { if (!stopped) setListError(true); }
      finally { if (!stopped) timer = setTimeout(poll, 6000); }
    };
    timer = setTimeout(poll, 6000);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [initialKey]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return threads.filter((t) => (!unreadOnly || t.unread > 0) && (!n || (t.title + t.subtitle + t.last).toLowerCase().includes(n)));
  }, [threads, q, unreadOnly]);
  const current = threads.find((t) => t.key === active) ?? null;

  return (
    <div className="inbox-frame card grid min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[minmax(240px,30%)_minmax(0,1fr)]">
      {/* thread list */}
      <div className={`${mobileThread ? "hidden" : "flex"} min-h-0 flex-col min-w-0 border-r border-line md:flex`}>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="input pl-9" aria-label="Search conversations" />
          </div>
        </div>
        <div className="inbox-filters" aria-label="Conversation filter"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All conversations</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread <span>{threads.filter((t) => t.unread > 0).length}</span></button></div>
        {listError && <p role="status" className="px-3 py-2 text-xs text-danger">Connection interrupted. Reconnecting…</p>}
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted">{q ? "No conversations match your search." : unreadOnly ? "You’re all caught up. No unread conversations." : "No conversations yet. Open a booking to contact your mechanic or support."}</li>}
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
      <div className={`${mobileThread ? "flex" : "hidden"} min-h-0 min-w-0 flex-col md:flex`}>
        {current ? (
          <Conversation key={current.key} thread={current} role={role} onRead={() => setThreads((rows) => rows.map((t) => t.key === current.key ? { ...t, unread: 0 } : t))} onBack={() => setMobileThread(false)} />
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

function Conversation({ thread, role, onBack, onRead }: { thread: Thread; role: string; onBack: () => void; onRead: () => void }) {
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const read = useRef(onRead);
  useEffect(() => { read.current = onRead; }, [onRead]);
  const url = `/api/chat/${encodeURIComponent(thread.key)}`;

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch(url, { cache: "no-store", signal });
      if (!r.ok) throw new Error(r.status === 401 ? "Your session expired. Please sign in again." : "Could not load messages. Please retry.");
      const data: Message[] = await r.json();
      if (!signal?.aborted) { setMsgs(data); read.current(); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Connection lost. Please retry."); }
  }, [url]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      await load(controller.signal);
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [load]);

  useEffect(() => {
    const el = viewport.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || body.length > 4000) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: body }) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(response.status === 401 ? "Your session expired. Please sign in again." : result.error || "Message was not sent. Please retry.");
      }
      setText("");
      nearBottom.current = true;
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Message was not sent. Check your connection and retry."); }
    finally { setSending(false); }
  }

  const orderHref = role === "admin" || role === "editor" ? `/admin/orders/view/${thread.orderId}` : role === "customer" ? `/portal/orders/${thread.orderId}` : `/orders/${thread.orderId}`;

  return (
    <>
      <header className="conversation-heading flex shrink-0 items-center gap-2 border-b border-line px-3 py-3 sm:gap-3 sm:px-4">
        <button onClick={onBack} aria-label="Back to conversations" className="rounded-md p-2 text-muted hover:bg-sunken md:hidden">
          <ArrowLeft size={18} />
        </button>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs font-medium text-brand">
          {thread.kind === "support" ? <LifeBuoy size={18} /> : initials(thread.title)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{thread.title}</div>
          <div className="truncate font-mono text-[11px] text-muted">{thread.subtitle}</div>
        </div>
        <Link href={orderHref} className="btn btn-secondary !py-1.5 !text-xs">View booking</Link>
      </header>

      <div ref={viewport} onScroll={() => { const el = viewport.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} role="log" aria-label="Conversation messages" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-sunken/40 px-3 py-3 sm:px-4 sm:py-5">
        {msgs === null && <p className="text-center text-sm text-muted">Loading…</p>}
        {msgs?.length === 0 && <div className="inbox-empty"><MessageSquare size={26} aria-hidden /><h2>Start a conversation</h2><p>No messages yet. Say hello.</p><span>Use this conversation for booking #{thread.orderId}.</span></div>}
        {msgs?.map((m, index) => {
          const d = dayLabel(m.at);
          const head = index === 0 || d !== dayLabel(msgs[index - 1].at);
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
                <div className={`min-w-0 max-w-[90%] sm:max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm border border-line bg-raised"}`}>
                  {!m.mine && <div className="mb-0.5 text-xs font-semibold text-brand">{m.author}</div>}
                  {m.file && m.fileType === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset(m.file)} alt="Attachment" className="mb-1 max-h-56 rounded-lg" />
                  )}
                  {m.file && m.fileType !== "image" && (
                    <a href={asset(m.file)} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-1.5 text-xs underline"><Paperclip size={12} /> Open attachment</a>
                  )}
                  {m.text && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.text}</p>}
                  <div className={`mt-1 text-right font-mono text-[10px] ${m.mine ? "text-on-brand/70" : "text-muted"}`}>{time(m.at)}</div>
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {error && <div role="alert" className="flex items-center justify-between gap-2 border-t border-danger bg-danger-soft px-3 py-2 text-xs text-danger"><span>{error}</span><button type="button" onClick={() => { setError(null); void load(); }} className="inline-flex shrink-0 items-center gap-1 rounded p-2 font-semibold"><RefreshCw size={14} /> Retry</button></div>}
      <form onSubmit={send} className="conversation-composer flex shrink-0 items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
          }}
          disabled={sending}
          maxLength={4000}
          rows={1}
          placeholder="Write a message…"
          aria-label="Message"
          className="input max-h-28 min-h-[44px] resize-y"
        />
        <button className="btn btn-primary !px-3.5" disabled={!text.trim() || sending} aria-label="Send">
          <SendHorizontal size={18} />
        </button>
      </form>
    </>
  );
}
