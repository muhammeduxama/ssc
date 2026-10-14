"use client";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { ToastViewport } from "@/components/Toast";

/** Native modal semantics keep focus and interaction inside the active form. */
export function Modal({ open, onClose, title, description, children, wide, busy = false }: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: React.ReactNode; wide?: boolean; busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy} className={`form-dialog ${wide ? "form-dialog-wide" : ""}`}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <header className="form-dialog-header">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close dialog" className="form-dialog-close"><X size={20} /></button>
      </header>
      <div className="form-dialog-body">{children}</div>
      <ToastViewport />
    </dialog>
  );
}
