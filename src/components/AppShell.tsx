"use client";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import type { Role } from "@/lib/session";
import { initials } from "@/lib/format";
import { Suspense } from "react";
import { SIDEBAR_COOKIE, navFor } from "@/lib/nav";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { ToastProvider } from "./Toast";
import { Logo } from "@/components/Logo";

export function AppShell({
  user,
  unread,
  miniInitial = false,
  notifications,
  children,
}: {
  user: { name: string; email: string; role: Role };
  unread: number;
  miniInitial?: boolean;
  notifications?: { id: number; title: string; description: string; link: string; at: string | null }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(miniInitial);
  const toggleMini = () => {
    const next = !mini;
    setMini(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "mini" : "full"}; path=/; max-age=31536000; samesite=lax`;
  };

  const brand = (
    <Link href="/dashboard" aria-label="Smart Servicing Centre dashboard" className="flex h-16 items-center gap-2.5 border-b border-night-line px-4">
      <Logo className="h-11 shrink-0" />
      <span className="font-display text-[15px] font-semibold leading-[1.1] tracking-tight text-night-ink">Smart Servicing<span className="block text-brand">Centre</span></span>
    </Link>
  );

  return (
    <ToastProvider>
    <div className={`workspace-shell min-h-screen bg-sunken lg:grid ${mini ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[260px_1fr]"}`}>
      {/* desktop sidebar (full or icon rail) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-night-line bg-night lg:flex">
        {mini ? (
          <Link href="/dashboard" aria-label="Smart Servicing Centre dashboard" className="grid h-16 place-items-center border-b border-night-line font-display text-xl font-semibold text-night-ink">
            <Logo className="h-9" />
          </Link>
        ) : (
          brand
        )}
        <Suspense><Sidebar nav={navFor(user.role)} unread={unread} mini={mini} /></Suspense>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-night">
            <div className="flex items-center justify-between">
              {brand}
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="mr-3 rounded-md p-2 text-night-muted hover:text-night-ink">
                <X size={20} />
              </button>
            </div>
            <Suspense><Sidebar nav={navFor(user.role)} unread={unread} onNavigate={() => setOpen(false)} /></Suspense>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-raised/90 px-4 backdrop-blur sm:px-8">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-md p-2 text-muted hover:text-ink lg:hidden">
            <Menu size={20} />
          </button>
          <button
            aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
            title={mini ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleMini}
            className="hidden rounded-md p-2 text-muted hover:bg-sunken hover:text-ink lg:block"
          >
            {mini ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="ml-auto flex items-center gap-4">
            {notifications && <NotificationBell items={notifications} />}
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-mono text-xs font-medium text-brand" aria-hidden>
                {initials(user.name)}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted">{user.role}</div>
              </div>
              <form action={logout}>
                <button className="rounded-md p-2 text-muted hover:bg-sunken hover:text-ink" aria-label="Sign out" title="Sign out">
                  <LogOut size={18} />
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
