"use client";
import { useRef, useState, useTransition } from "react";
import { addContactMessage } from "@/app/actions/site";

export function ContactForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          setMsg(null);
          try {
            const r = await addContactMessage(f);
            setMsg(r);
            if (r.ok) ref.current?.reset();
          } catch { setMsg({ ok: false, message: "We couldn’t send your message. Please try again." }); }
        });
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" autoComplete="name" placeholder="Your full name" required className="input" /></div>
      <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" name="email" autoComplete="email" placeholder="you@example.com" type="email" required className="input" /></div>
      <div><label className="label" htmlFor="c-phone">Phone</label><input id="c-phone" name="phone" autoComplete="tel" placeholder="Your contact number" type="tel" required className="input" /></div>
      <div><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" name="subject" placeholder="What can we help with?" required className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="c-message">Message</label><textarea id="c-message" name="message" placeholder="Tell us a little about your question or booking…" required rows={5} className="input" /></div>
      {msg && <p role="status" className={`sm:col-span-2 rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-ok bg-ok-soft" : "border-danger bg-danger-soft"}`}>{msg.message}</p>}
      <div className="flex justify-end border-t border-line pt-5 sm:col-span-2"><button disabled={pending} className="btn btn-primary">{pending ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
