"use client";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteButton({ action, label = "Delete", what }: { action: () => Promise<void>; label?: string; what: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${what}? This can’t be undone.`)) e.preventDefault();
      }}
    >
      <SubmitDelete label={label} what={what} />
    </form>
  );
}

function SubmitDelete({ label, what }: { label: string; what: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-50" aria-label={`${label} ${what}`}>
    {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {pending ? "Deleting…" : label}
  </button>;
}
