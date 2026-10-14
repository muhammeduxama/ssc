import Link from "next/link";

/** "Basic information" block shown to guests on the booking / quote forms (login or register inline). */
export function GuestFields() {
  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="px-1 font-display text-lg font-semibold">Basic information</legend>
      <p className="text-sm text-muted">Please enter your email address. If you already have an account, just enter your password to sign in.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="g-email">Email *</label><input id="g-email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="g-password">Password *</label><input id="g-password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        <div><label className="label" htmlFor="g-first">First name</label><input id="g-first" name="first_name" autoComplete="given-name" className="input" /></div>
        <div><label className="label" htmlFor="g-last">Last name</label><input id="g-last" name="last_name" autoComplete="family-name" className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="g-phone">Phone</label><input id="g-phone" name="phone" type="tel" autoComplete="tel" className="input" /><p className="mt-1 text-xs text-muted">Mechanic may need to contact you via telephone to discuss your request.</p></div>
      </div>
      <p className="text-xs text-muted">New here? Fill in your name and choose a password (8+ characters) and we&apos;ll create your account. We&apos;ll not pass your details onto any 3rd parties without your permission. <Link href="/password/reset" className="text-brand underline">Forgot password?</Link></p>
    </fieldset>
  );
}

export function TermsBox() {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[var(--brand)]" />
      <span>By ticking this box you are indicating you have read and accept our <Link href="/legal_docs/customer-terms" target="_blank" className="text-brand underline">terms &amp; conditions</Link> and <Link href="/legal_docs/privacy" target="_blank" className="text-brand underline">privacy policy</Link>. *</span>
    </label>
  );
}
