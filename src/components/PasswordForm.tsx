"use client";
import { useActionState, useEffect, useRef } from "react";
import { changeOwnPassword } from "@/app/actions/account";
import { useToast } from "@/components/Toast";

export function PasswordForm() {
  const [state, run, pending] = useActionState(changeOwnPassword, null);
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok);
    if (state.ok) ref.current?.reset();
  }, [state, toast]);
  return (
    <form ref={ref} action={run} className="card max-w-md space-y-4 p-6">
      <div><label className="label" htmlFor="op">Old password</label><input id="op" name="old_password" type="password" autoComplete="current-password" className="input" required /></div>
      <div><label className="label" htmlFor="np">New password</label><input id="np" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} /></div>
      <div><label className="label" htmlFor="cp">Confirm new password</label><input id="cp" name="password_confirmation" type="password" autoComplete="new-password" className="input" required minLength={8} /></div>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button disabled={pending} className="btn btn-primary w-full">Change password</button>
    </form>
  );
}
