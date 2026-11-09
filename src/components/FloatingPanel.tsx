"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Escape clipping/stacking ancestors; remain inside the top layer when opened in a native dialog. */
export function FloatingPanel({ anchor, open, onClose, children, className = "", width = 320, align = "end", side = "bottom", autoFocus = true, label, id }: {
  anchor: RefObject<HTMLElement | null>; open: boolean; onClose: () => void; children: ReactNode;
  className?: string; width?: number | "anchor"; align?: "start" | "end"; side?: "bottom" | "right";
  autoFocus?: boolean; label?: string; id?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (!open) { focused.current = false; return; }
    const element = panel.current; const trigger = anchor.current;
    if (!element || !trigger) return;
    const position = () => {
      if (!trigger.isConnected) { onClose(); return; }
      const viewport = window.visualViewport;
      const x = viewport?.offsetLeft ?? 0; const y = viewport?.offsetTop ?? 0;
      const vw = viewport?.width ?? window.innerWidth; const vh = viewport?.height ?? window.innerHeight;
      const r = trigger.getBoundingClientRect(); const pad = 12; const gap = 8;
      if (r.bottom <= y || r.top >= y + vh || r.right <= x || r.left >= x + vw) { onClose(); return; }
      const w = Math.max(0, Math.min(width === "anchor" ? r.width : width, vw - pad * 2));
      element.style.width = `${w}px`;
      const below = y + vh - pad - r.bottom - gap; const above = r.top - y - pad - gap;
      const up = side === "bottom" && element.scrollHeight > below && above > below;
      element.style.maxHeight = `${Math.max(0, side === "right" ? vh - pad * 2 : up ? above : below)}px`;
      const h = element.getBoundingClientRect().height;
      const left = side === "right" ? (r.right + gap + w <= x + vw - pad ? r.right + gap : r.left - gap - w) : align === "end" ? r.right - w : r.left;
      const top = side === "right" ? r.top : up ? r.top - gap - h : r.bottom + gap;
      element.style.left = `${Math.max(x + pad, Math.min(left, x + vw - pad - w))}px`;
      element.style.top = `${Math.max(y + pad, Math.min(top, y + vh - pad - h))}px`;
      element.style.visibility = "visible";
    };
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!element.contains(target) && !trigger.contains(target)) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); trigger.focus(); }
    };
    const scroll = (event: Event) => { if (!element.contains(event.target as Node)) position(); };
    position();
    if (autoFocus && !focused.current) {
      element.querySelector<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]')?.focus({ preventScroll: true });
      focused.current = true;
    }
    const observer = new ResizeObserver(position); observer.observe(element); observer.observe(trigger);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", scroll, true); window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position); window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect(); document.removeEventListener("pointerdown", outside, true); document.removeEventListener("focusin", outside); document.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position); window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [anchor, open, onClose, width, align, side, autoFocus]);
  if (!open || typeof document === "undefined" || !anchor.current) return null;
  const container = anchor.current.closest("dialog[open]") ?? document.body;
  return createPortal(<div ref={panel} id={id} role={label ? "region" : undefined} aria-label={label} className={`floating-panel ${className}`} style={{ visibility: "hidden" }}>{children}</div>, container);
}

export function DropdownMenu({ label = "Actions", items }: { label?: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null); const id = useId();
  return <><button type="button" ref={anchor} className="btn btn-secondary !py-1.5" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>{label}<ChevronDown size={14}/></button>
    <FloatingPanel anchor={anchor} open={open} onClose={() => setOpen(false)} id={id} label={`${label} options`} className="floating-menu" width={280}>
      <ul>{items.map(item => <li key={item.href}><Link href={item.href} onClick={() => setOpen(false)}>{item.label}</Link></li>)}</ul>
    </FloatingPanel></>;
}
