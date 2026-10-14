"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markNotification } from "@/app/actions/admin-tools";
import { useAction } from "@/components/useAction";

type N = { id: number; title: string; description: string; link: string; at: string | null };

export function NotificationBell({ items }: { items: N[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { run } = useAction();
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={`Notifications (${items.length} unread)`} aria-expanded={open} className="relative rounded-md p-2 text-muted hover:bg-sunken hover:text-ink">
        <Bell size={19} />
        {items.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1 text-center font-mono text-[10px] font-semibold leading-5 text-on-accent">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-raised shadow-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {items.length > 0 && <button onClick={() => run(() => markNotification("all"))} className="text-xs font-semibold text-brand hover:underline">Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">You’re all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.link || "#"} onClick={() => { setOpen(false); run(() => markNotification(n.id)); }} className="block px-4 py-3 hover:bg-sunken">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.description && <div className="line-clamp-2 text-xs text-muted">{n.description}</div>}
                    {n.at && <div className="mt-0.5 font-mono text-[10px] text-muted">{new Date(n.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
