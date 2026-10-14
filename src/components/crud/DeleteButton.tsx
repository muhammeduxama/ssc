"use client";
import { Trash2 } from "lucide-react";

export function DeleteButton({ action, label = "Delete", what }: { action: () => Promise<void>; label?: string; what: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${what}? This can’t be undone.`)) e.preventDefault();
      }}
    >
      <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft" aria-label={`${label} ${what}`}>
        <Trash2 size={14} /> {label}
      </button>
    </form>
  );
}
