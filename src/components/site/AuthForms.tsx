"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerCustomer, registerMechanic, resendVerification, resetPasswordWithToken, sendResetLink } from "@/app/actions/auth";

type R = { ok: boolean; message: string; link?: string };

function useSubmit(fn: (f: FormData) => Promise<R>) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<R | null>(null);
  const router = useRouter();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await fn(f);
      setMsg(r);
      if (r.ok && r.link) router.push(r.link);
    });
  };
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-ok bg-ok-soft" : "border-danger bg-danger-soft"}`}>{msg.message}</p>;
  return { pending, onSubmit, note };
}

const F = ({ id, label, ...p }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div><label className="label" htmlFor={id}>{label}</label><input id={id} className="input" {...p} /></div>
);

export function RegisterForm() {
  const { pending, onSubmit, note } = useSubmit(registerCustomer);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <F id="r-first" name="first_name" label="First name *" required autoComplete="given-name" />
      <F id="r-last" name="last_name" label="Last name *" required autoComplete="family-name" />
      <F id="r-email" name="email" type="email" label="Email *" required autoComplete="email" />
      <F id="r-phone" name="phone" type="tel" label="Phone (11 digits) *" required inputMode="numeric" pattern="\d{11}" autoComplete="tel" />
      <div className="sm:col-span-2"><F id="r-pw" name="password" type="password" label="Password (8+ characters) *" required minLength={8} autoComplete="new-password" /></div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="check" required className="mt-1 accent-[var(--brand)]" /> I accept the <Link href="/legal_docs/customer-terms" target="_blank" className="text-brand underline">terms &amp; conditions</Link> and <Link href="/legal_docs/privacy" target="_blank" className="text-brand underline">privacy policy</Link>.</label>
      <div className="sm:col-span-2">{note}</div>
      <button disabled={pending} className="btn btn-primary sm:col-span-2">{pending ? <Loader2 size={16} className="animate-spin" /> : "Create account"}</button>
    </form>
  );
}

export function JoinNetworkForm() {
  const { pending, onSubmit, note } = useSubmit(registerMechanic);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <F id="j-company" name="company" label="Company / trading name *" required />
      <F id="j-pc" name="post_code" label="Postcode *" required autoComplete="postal-code" />
      <F id="j-first" name="first_name" label="First name *" required autoComplete="given-name" />
      <F id="j-last" name="last_name" label="Last name *" required autoComplete="family-name" />
      <F id="j-email" name="email" type="email" label="Email *" required autoComplete="email" />
      <F id="j-phone" name="phone" type="tel" label="Phone (11 digits) *" required inputMode="numeric" pattern="\d{11}" autoComplete="tel" />
      <F id="j-vat" name="vat_number" label="VAT number (optional)" />
      <F id="j-pw" name="password" type="password" label="Password (8+ characters) *" required minLength={8} autoComplete="new-password" />
      <div className="sm:col-span-2"><label className="label" htmlFor="j-note">About your business (optional)</label><textarea id="j-note" name="note" rows={3} className="input" /></div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="check" required className="mt-1 accent-[var(--brand)]" /> I have read and accept the <Link href="/legal_docs/mechanic-terms" target="_blank" className="text-brand underline">mechanic terms &amp; conditions</Link>.</label>
      <div className="sm:col-span-2">{note}</div>
      <button disabled={pending} className="btn btn-primary sm:col-span-2">{pending ? <Loader2 size={16} className="animate-spin" /> : "Join the network"}</button>
    </form>
  );
}

export function ForgotForm() {
  const { pending, onSubmit, note } = useSubmit(sendResetLink);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <F id="f-email" name="email" type="email" label="Email address" required autoComplete="email" />
      {note}
      <button disabled={pending} className="btn btn-primary w-full">{pending ? <Loader2 size={16} className="animate-spin" /> : "Send password reset link"}</button>
    </form>
  );
}

export function ResetForm({ token, email }: { token: string; email: string }) {
  const { pending, onSubmit, note } = useSubmit((f) => resetPasswordWithToken(token, f));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <F id="rs-email" name="email" type="email" label="Email address" required defaultValue={email} autoComplete="email" />
      <F id="rs-pw" name="password" type="password" label="New password" required minLength={8} autoComplete="new-password" />
      <F id="rs-pw2" name="password_confirmation" type="password" label="Confirm password" required minLength={8} autoComplete="new-password" />
      {note}
      <button disabled={pending} className="btn btn-primary w-full">{pending ? <Loader2 size={16} className="animate-spin" /> : "Reset password"}</button>
    </form>
  );
}

export function ResendVerification() {
  const { pending, onSubmit, note } = useSubmit(() => resendVerification());
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {note}
      <button disabled={pending} className="btn btn-primary">{pending ? <Loader2 size={16} className="animate-spin" /> : "Resend verification email"}</button>
    </form>
  );
}
