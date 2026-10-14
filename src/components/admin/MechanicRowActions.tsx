"use client";
import { PasswordDialog } from "./PasswordDialog";
import { Eye, KeyRound, LogIn, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminSetPassword, deleteMechanic, loginAsUser, sendRequiredDocsEmail, setMechanicStatus, type Result } from "@/app/actions/mechanic-profile";
import { useToast } from "@/components/Toast";

export function StatusToggle({ id, active, labels = ["Active", "Blocked"] }: { id: number; active: boolean; labels?: [string, string] }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setMechanicStatus(id, !on);
          if (r.ok) setOn(!on);
          toast(r.message, r.ok);
        })
      }
      className={`inline-flex items-center gap-2 rounded-full px-1 py-1 pr-3 text-xs font-semibold transition ${on ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}
    >
      <span className={`h-5 w-5 rounded-full shadow transition ${on ? "bg-ok" : "bg-danger"}`} />
      {on ? labels[0] : labels[1]}
    </button>
  );
}

export function MechanicRowActions({ id }: { id: number }) {
  const [pw, setPw] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<Result>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok);
      if (r.ok) router.refresh();
    });
  };
  const btn = "rounded-md p-1.5 hover:bg-sunken";
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link href={`/admin/mechanics/${id}`} title="View / edit profile" aria-label="View and edit profile" className={`${btn} text-brand`}><Eye size={16} /></Link>
      <button onClick={() => setPw(true)} title="Change password" aria-label="Change password" className={`${btn} text-muted`}><KeyRound size={16} /></button>
      <button disabled={pending} onClick={() => run(() => sendRequiredDocsEmail(id))} title="Send required documents email" aria-label="Send required documents email" className={`${btn} text-muted`}><Mail size={16} /></button>
      <form action={loginAsUser.bind(null, id)}>
        <button title="Log in as this mechanic" aria-label="Log in as this mechanic" className={`${btn} text-muted`}><LogIn size={16} /></button>
      </form>
      <button disabled={pending} onClick={() => run(() => deleteMechanic(id), "Delete this mechanic permanently?")} title="Delete" aria-label="Delete mechanic" className={`${btn} text-danger`}><Trash2 size={16} /></button>
      {pw && <PasswordDialog onClose={() => setPw(false)} save={(password, confirmation) => adminSetPassword(id, password, confirmation)} />}
    </div>
  );
}
