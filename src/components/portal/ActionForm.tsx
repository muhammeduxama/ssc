"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { useToast } from "@/components/Toast";

type R = { ok: boolean; message: string; link?: string };

/** A form posting to a (bound) server action: toast the result, follow `link`, otherwise refresh. */
export function ActionForm({ action, children, submit, className = "space-y-4", reset, confirmText }: { action: (f: FormData) => Promise<R>; children: React.ReactNode; submit: string; className?: string; reset?: boolean; confirmText?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !confirm(confirmText)) return;
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(f);
          toast(r.message, r.ok);
          if (r.ok && reset) ref.current?.reset();
          if (r.link) router.push(r.link);
          else if (r.ok) router.refresh();
        });
      }}
      className={className}
    >
      {children}
      <button disabled={pending} className="btn btn-primary">{pending ? <Loader2 size={16} className="animate-spin" /> : submit}</button>
    </form>
  );
}

export function ActionButton({ action, children, confirmText, className = "btn btn-secondary" }: { action: () => Promise<R>; children: React.ReactNode; confirmText?: string; className?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          toast(r.message, r.ok);
          if (r.link) router.push(r.link);
          else if (r.ok) router.refresh();
        });
      }}
      className={className}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}
