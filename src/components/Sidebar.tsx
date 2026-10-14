"use client";
import { ChevronDown, Activity, BellRing, BookOpen, Building2, CalendarPlus, CarFront, Circle, Clock, ClipboardList, CreditCard, FileCheck, FilePlus, FileText, HelpCircle, Image, Inbox, KeyRound, Layers, LayoutDashboard, Mail, Map, MapPin, MessageSquare, Palette, PenLine, PoundSterling, Receipt, Send, Settings, Star, Tags, Upload, UserCog, UserPlus, UserRound, Users, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { NavGroup, NavItem } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = { Activity, BellRing, BookOpen, Building2, CalendarPlus, CarFront, Circle, Clock, ClipboardList, CreditCard, FileCheck, FilePlus, FileText, HelpCircle, Image, Inbox, KeyRound, Layers, LayoutDashboard, Mail, Map, MapPin, MessageSquare, Palette, PenLine, PoundSterling, Receipt, Send, Settings, Star, Tags, Upload, UserCog, UserPlus, UserRound, Users, Wrench };
const icon = (n: string) => ICONS[n] ?? Circle;

type Props = { nav: NavGroup[]; unread: number; onNavigate?: () => void; mini?: boolean };

export function Sidebar({ nav, unread, onNavigate, mini = false }: Props) {
  const path = usePathname();
  const sp = useSearchParams();
  const here = `${path}${sp.toString() ? `?${sp}` : ""}`;
  const isOn = (href: string) => (href.includes("?") ? here === href : path === href || (href !== "/dashboard" && path.startsWith(href + "/")));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(nav.map((g) => [g.group, !g.collapsible || g.items.some((i) => isOn(i.href))])),
  );
  const badgeOf = (i: NavItem) => (i.badge === "unread" ? unread : 0);

  if (mini) return <MiniNav nav={nav} isOn={isOn} badgeOf={badgeOf} />;

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 [scrollbar-width:thin]" aria-label="Main">
      {nav.map((g) => {
        const expanded = open[g.group] ?? true;
        return (
          <div key={g.group}>
            <button
              type="button"
              disabled={!g.collapsible}
              onClick={() => setOpen({ ...open, [g.group]: !expanded })}
              aria-expanded={expanded}
              className="mb-1 flex w-full items-center gap-2 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-night-muted enabled:hover:text-night-ink"
            >
              <span className="h-0.5 w-3.5 bg-accent" />
              <span className="flex-1 text-left">{g.group}</span>
              {g.collapsible && <ChevronDown size={14} className={`transition ${expanded ? "" : "-rotate-90"}`} />}
            </button>
            {expanded && (
              <ul className="space-y-0.5">
                {g.items.map((i) => {
                  const on = isOn(i.href);
                  const I = icon(i.icon);
                  const badge = badgeOf(i);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={onNavigate}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          on ? "bg-night-active text-night-ink" : "text-night-muted hover:bg-night-line hover:text-night-ink"
                        }`}
                      >
                        <I size={i.icon === "Circle" ? 8 : 17} className={on ? "text-accent" : ""} />
                        <span className="flex-1 truncate">{i.label}</span>
                        {badge > 0 && <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-medium text-on-accent">{badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Icon rail: plain groups show one icon per item; collapsible groups show a single group icon
 * whose items open in a flyout on hover/click (fixed-positioned so the scrolling rail can't clip it).
 */
function MiniNav({ nav, isOn, badgeOf }: { nav: NavGroup[]; isOn: (h: string) => boolean; badgeOf: (i: NavItem) => number }) {
  const [fly, setFly] = useState<{ group: string; top?: number; bottom?: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keep = () => timer.current && clearTimeout(timer.current);
  const close = () => {
    keep();
    timer.current = setTimeout(() => setFly(null), 150);
  };
  const show = (group: string, el: HTMLElement) => {
    keep();
    const r = el.getBoundingClientRect();
    // Lower icons open upwards so the menu stays on screen.
    const up = r.top > window.innerHeight / 2;
    setFly({ group, left: r.right + 8, ...(up ? { bottom: window.innerHeight - r.bottom } : { top: r.top }) });
  };
  const cell = (on: boolean) =>
    `relative grid h-10 w-10 place-items-center rounded-lg transition ${on ? "bg-night-active text-accent" : "text-night-muted hover:bg-night-line hover:text-night-ink"}`;
  const current = fly && nav.find((g) => g.group === fly.group);

  return (
    <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4 [scrollbar-width:none]" aria-label="Main" onScroll={() => setFly(null)}>
      {nav.map((g, gi) => (
        <div key={g.group} className={`flex flex-col items-center gap-1 ${gi ? "mt-1 border-t border-night-line pt-2" : ""}`}>
          {g.collapsible ? (
            (() => {
              const I = icon(g.icon ?? g.items[0]?.icon ?? "Circle");
              const on = g.items.some((i) => isOn(i.href));
              return (
                <button
                  type="button"
                  aria-label={g.group}
                  aria-expanded={fly?.group === g.group}
                  className={cell(on)}
                  onMouseEnter={(e) => show(g.group, e.currentTarget)}
                  onMouseLeave={close}
                  onClick={(e) => (fly?.group === g.group ? setFly(null) : show(g.group, e.currentTarget))}
                >
                  <I size={19} />
                </button>
              );
            })()
          ) : (
            g.items.map((i) => {
              const I = icon(i.icon);
              const badge = badgeOf(i);
              const on = isOn(i.href);
              return (
                <Link key={i.href} href={i.href} title={i.label} aria-label={i.label} aria-current={on ? "page" : undefined} className={cell(on)}>
                  <I size={19} />
                  {badge > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[10px] text-on-accent">{badge}</span>}
                </Link>
              );
            })
          )}
        </div>
      ))}

      {current && fly && (
        <div
          className="fixed z-50 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-line bg-raised p-2 shadow-card"
          style={{ top: fly.top, bottom: fly.bottom, left: fly.left }}
          onMouseEnter={keep}
          onMouseLeave={close}
        >
          <div className="px-2 pb-1.5 pt-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{current.group}</div>
          {current.items.map((i) => {
            const I = icon(i.icon);
            const on = isOn(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setFly(null)}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium ${on ? "bg-brand-soft text-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}
              >
                <I size={i.icon === "Circle" ? 7 : 15} />
                <span className="truncate">{i.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
