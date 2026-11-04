"use client";
import Link from "next/link";
import { useState } from "react";

export function GuestFields() {
  const [existing,setExisting]=useState(false);
  return <fieldset className="booking-form-section"><legend>Your contact details</legend><p className="booking-field-description">We&apos;ll use these details to keep you updated about your booking.</p>
    <div className="booking-account-switch" aria-label="Account type"><button type="button" aria-pressed={!existing} onClick={()=>setExisting(false)}>I&apos;m a new customer</button><button type="button" aria-pressed={existing} onClick={()=>setExisting(true)}>I have an account</button></div>
    <div className="grid gap-4 sm:grid-cols-2">
      {!existing&&<><div><label className="label" htmlFor="g-first">First name *</label><input id="g-first" name="first_name" required autoComplete="given-name" className="input"/></div><div><label className="label" htmlFor="g-last">Last name *</label><input id="g-last" name="last_name" required autoComplete="family-name" className="input"/></div></>}
      <div><label className="label" htmlFor="g-email">Email address *</label><input id="g-email" name="email" type="email" required autoComplete="email" className="input"/></div>
      <div><label className="label" htmlFor="g-password">{existing?"Your password":"Create a password"} *</label><input id="g-password" name="password" type="password" required minLength={existing?undefined:8} autoComplete={existing?"current-password":"new-password"} className="input"/>{!existing&&<p className="booking-field-help">Use at least 8 characters for your new account.</p>}</div>
      {!existing&&<div className="sm:col-span-2"><label className="label" htmlFor="g-phone">Phone number *</label><input id="g-phone" name="phone" type="tel" required autoComplete="tel" className="input"/><p className="booking-field-help">Your mechanic may call to discuss your booking or arrival time.</p></div>}
    </div>{existing?<Link href="/password/reset" className="booking-text-link">Forgot your password?</Link>:<p className="booking-field-help">We&apos;ll create your account so you can manage bookings and messages.</p>}
  </fieldset>;
}

export function TermsBox() {
  return <label className="booking-terms"><input type="checkbox" name="terms" required/><span>I agree to the <Link href="/legal_docs/customer-terms" target="_blank" rel="noopener noreferrer">terms &amp; conditions</Link> and <Link href="/legal_docs/privacy" target="_blank" rel="noopener noreferrer">privacy policy</Link>. *</span></label>;
}
