import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/blocks";

export const metadata: Metadata = { title: { absolute: "Contact Us | Smart Servicing centre" } };

export default function ContactUs() {
  const info = [
    { icon: MapPin, k: "Address", v: "1-11, St Georges Road, Reading, Berkshire, RG30 2RG, United Kingdom" },
    { icon: Phone, k: "Phone number", v: "+44-330-113-62-63", href: "tel:+443301136263" },
    { icon: Mail, k: "Email address", v: "info@smartservicingcentre.co.uk", href: "mailto:info@smartservicingcentre.co.uk" },
  ];
  return (
    <>
      <PageHero eyebrow="We’re here to help" title="Let’s talk car care.">A question about a booking, a repair, or getting started? Get in touch with our team.</PageHero>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Contact info</h2>
          <p className="text-muted">We are located in Berkshire, RG30 2RG, United Kingdom.</p>
          {info.map((i) => (
            <div key={i.k} className="card flex gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><i.icon size={18} /></span>
              <div className="min-w-0">
                <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{i.k}</div>
                {i.href ? <a href={i.href} className="break-words text-sm font-medium hover:text-brand">{i.v}</a> : <div className="font-medium">{i.v}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="card p-6 shadow-card sm:p-10">
          <h2 className="font-display text-2xl font-semibold">Leave a message</h2>
          <div className="mt-6"><ContactForm /></div>
        </div>
      </section>
    </>
  );
}
