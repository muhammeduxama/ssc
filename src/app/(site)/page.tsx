import { ArrowRight, BadgeCheck, CalendarCheck, Check, ClipboardList, MapPin, ShieldCheck, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/site/QuoteForm";
import { ChipGrid, ReviewCards, SectionTitle } from "@/components/site/blocks";
import { ServiceIllustration } from "@/components/site/ServiceIllustration";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Car repairs, made simple" };

export default async function Home() {
  const [services, cities, makes, reviews] = await Promise.all([
    db.servicepages.findMany({ take: 8, orderBy: { id: "asc" }, select: { name: true, slug: true } }),
    db.cities.findMany({ take: 8, orderBy: { id: "asc" }, select: { name: true, slug: true } }),
    db.makes.findMany({ take: 8, orderBy: { id: "asc" }, select: { name: true, slug: true } }),
    db.reviews.findMany({ orderBy: { created_at: "desc" }, take: 3, include: { orders: { include: { users: { select: { fname: true, lname: true } } } } } }),
  ]);
  const steps = [
    { icon: ClipboardList, title: "Tell us what you need", text: "Enter your registration and postcode. Choose a service, repair, or diagnostic inspection." },
    { icon: CalendarCheck, title: "Find a time that suits you", text: "Choose your preferred appointment and location, then confirm your booking." },
    { icon: Wrench, title: "Leave it to your mechanic", text: "Get the work done and manage your booking, messages, and invoice in one place." },
  ];
  return (
    <>
      <section className="home-hero">
        <div className="site-container grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <span className="eyebrow">Your car. In good hands.</span>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-semibold leading-[1.06] tracking-[-.055em] sm:text-6xl lg:text-7xl">Car care.<br /><span className="text-brand">Less hassle.</span></h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-muted">From everyday servicing to unexpected repairs. Find a local mechanic and get back to what matters.</p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
              <span className="flex items-center gap-2"><Check size={17} className="text-brand" /> Upfront quotes</span>
              <span className="flex items-center gap-2"><Check size={17} className="text-brand" /> Mobile mechanics &amp; garages</span>
            </div>
            <div className="mt-5 hidden max-w-md lg:block"><ServiceIllustration /></div>
          </div>
          <div id="quote" className="quote-panel scroll-mt-28">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><span className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Let’s get started</span><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">What does your car need?</h2></div>
              <span className="icon-tile"><Wrench size={22} /></span>
            </div>
            <p className="mb-7 text-sm leading-6 text-muted">Tell us your registration and where you need the work. We’ll help you find the right service.</p>
            <QuoteForm compact />
            <div className="mt-7 flex items-center gap-3 border-t border-line pt-5 text-xs leading-5 text-muted"><ShieldCheck size={20} className="shrink-0 text-brand" />Your quote is the first step. Choose your service before making a booking.</div>
          </div>
        </div>
      </section>
      <section className="border-y border-line bg-raised">
        <div className="site-container grid gap-6 py-6 sm:grid-cols-3">
          {[{icon: BadgeCheck, title: "Local expertise", text: "Mechanics and garages near you"}, {icon: MapPin, title: "Care that fits your day", text: "At home, at work, or at a garage"}, {icon: ShieldCheck, title: "Everything in one place", text: "Bookings, messages, and invoices"}].map(({icon: Icon, title, text}) => <div key={title} className="flex items-center gap-4"><span className="icon-tile"><Icon size={22} /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-muted">{text}</p></div></div>)}
        </div>
      </section>
      <ChipGrid eyebrow="A little maintenance. A lot of peace of mind." title="What can we help with?" items={services.map((s) => ({ href: `/service/${s.slug}`, label: s.name }))} more="/service/all" />
      <section className="bg-night py-16 sm:py-24">
        <div className="site-container">
          <div className="flex flex-wrap items-end justify-between gap-5"><SectionTitle eyebrow="Simple from the start" title="Three steps. One less thing to worry about." /><Link href="/how_it_works" className="text-link">How it works <ArrowRight size={17} /></Link></div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">{steps.map(({icon: Icon, title, text}, i) => <li key={title} className="process-card"><div className="flex items-center justify-between"><span className="icon-tile"><Icon size={24} /></span><span className="font-display text-4xl font-medium text-line-strong/50">0{i + 1}</span></div><h3 className="mt-8 font-display text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{text}</p></li>)}</ol>
        </div>
      </section>
      <section className="site-container grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-line bg-night p-6 sm:p-10"><ServiceIllustration /><div className="flex items-center justify-center gap-2 text-sm font-medium text-brand"><MapPin size={18} />Local mechanics. A more convenient day.</div></div>
        <div><SectionTitle eyebrow="Made for real life" title="Good car care shouldn’t interrupt your whole day." /><p className="mt-5 text-base leading-8 text-muted">Book a mobile mechanic for work at your home or office, or find a local garage for jobs that need a workshop. Get a clear quote and keep track of the details from your account.</p><ul className="mt-6 space-y-3">{["Services matched to your vehicle", "Your preferred appointment and location", "A direct conversation with your mechanic"].map((text) => <li key={text} className="flex items-center gap-3 text-sm"><Check size={18} className="text-brand" />{text}</li>)}</ul><Link href="/mobile-mechanics" className="text-link mt-8">Explore mobile mechanics <ArrowRight size={17} /></Link></div>
      </section>
      {!!reviews.length && <section className="border-y border-line bg-sunken py-16 sm:py-24"><div className="site-container"><SectionTitle eyebrow="From our customers" title="Real experiences. In their words." /><ReviewCards reviews={reviews.map((r) => ({ id: Number(r.id), name: `${r.orders.users.fname} ${r.orders.users.lname}`, rating: r.overall || Math.round((r.quality + r.punctuality + r.communication) / 3), text: r.review ?? "" }))} /></div></section>}
      <ChipGrid eyebrow="Closer than you think" title="Find car care near you" items={cities.map((c) => ({ href: `/city/${c.slug}`, label: c.name }))} more="/city/all" />
      <ChipGrid eyebrow="Your make. Your model." title="Find services for your car" items={makes.map((m) => ({ href: `/makes/${m.slug ?? ""}`, label: m.name }))} more="/make/all" tone="sunken" />
      <section className="site-container py-16"><div className="cta-panel"><div><span className="eyebrow">One less thing on your list</span><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Let’s get your car sorted.</h2><p className="mt-3 text-muted">Start with your registration. We’ll take it from there.</p></div><Link href="#quote" className="btn btn-primary">Get a quote <ArrowRight size={18} /></Link></div></section>
    </>
  );
}
