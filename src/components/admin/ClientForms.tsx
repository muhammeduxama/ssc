"use client";
import { PasswordDialog } from "./PasswordDialog";
import { KeyRound, LogIn, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { loginAsUser } from "@/app/actions/mechanic-profile";
import { setClientPassword, setClientStatus, type Result } from "@/app/actions/clients";
import { useToast } from "@/components/Toast";

export function ClientStatus({ id, active }: { id: number; active: boolean }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button role="switch" aria-checked={on} disabled={pending} onClick={() => start(async () => { const r = await setClientStatus(id, !on); if (r.ok) setOn(!on); toast(r.message, r.ok); })} className={`inline-flex items-center gap-2 rounded-full px-1 py-1 pr-3 text-xs font-semibold ${on ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
      <span className={`h-5 w-5 rounded-full ${on ? "bg-ok" : "bg-danger"}`} />
      {on ? "Active" : "Blocked"}
    </button>
  );
}

export function ClientActions({ id }: { id: number }) {
  const [pw, setPw] = useState(false);
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link href={`/admin/clients/${id}`} aria-label="Edit client" title="Edit" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><Pencil size={16} /></Link>
      <button onClick={() => setPw(true)} aria-label="Change password" title="Change password" className="rounded-md p-1.5 text-muted hover:bg-sunken"><KeyRound size={16} /></button>
      <form action={loginAsUser.bind(null, id)}><button aria-label="Log in as this client" title="Log in as client" className="rounded-md p-1.5 text-muted hover:bg-sunken"><LogIn size={16} /></button></form>
      {pw && <PasswordDialog onClose={() => setPw(false)} save={(password, confirmation) => setClientPassword(id, password, confirmation)} />}
    </div>
  );
}

export function ClientForm({ action, values, withPassword, submit }: { action: (s: Result | null, f: FormData) => Promise<Result>; values?: { fname: string; lname: string; phone: string; email: string }; withPassword: boolean; submit: string }) {
  const [state, run, pending] = useActionState(action, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok);
    if (state.ok) router.push("/admin/clients");
  }, [state, toast, router]);
  const f = (name: string, label: string, def = "", type = "text") => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} defaultValue={def} autoComplete={type === "password" ? "new-password" : undefined} className={`input ${state?.errors?.[name] ? "!border-danger" : ""}`} />
      {state?.errors?.[name] && <p className="mt-1 text-xs text-danger">{state.errors[name]}</p>}
    </div>
  );
  return (
    <form action={run} className="card grid max-w-2xl gap-4 p-6 sm:grid-cols-2">
      {f("fname", "First name", values?.fname)}
      {f("lname", "Last name", values?.lname)}
      {f("phone", "Phone", values?.phone)}
      {f("email", "Email", values?.email, "email")}
      {withPassword && f("password", "Password", "", "password")}
      <div className="flex justify-end sm:col-span-2"><button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : submit}</button></div>
    </form>
  );
}
