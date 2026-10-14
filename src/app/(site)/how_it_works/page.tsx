import { Award, CreditCard, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { QuoteHero, PageHero, SectionTitle } from "@/components/site/blocks";

export const metadata: Metadata = { title: { absolute: "How Smart Servicing Centre Works" } };

const PROCESS = [
  ["1. Choose your repairs", "Enter your car registration & your post code. Choose a service / repair."],
  ["2. Pick a date, time & location", "A professional mechanic or approved garage will come to you, at the date, time and location of your choice."],
  ["3. Sit back and relax!", "No need to take a day off from work or time off from your busy schedule."],
];
const DETAIL = [
  ["Tell us about your car", "Simply enter your car registration and your postcode on the homepage so we can find the correct make / model of your car and your location. Then choose a service / repair. If you're not sure what's wrong with your car, don't worry! You can choose diagnostic inspection and enter your comments in the notes section and the mechanic / garage will recommend the right repair for your car."],
  ["Confirm your booking", "Let us know your preferred date, time, and location for the work to be carried out. To complete your booking, you'll need to enter your bank card details into our 256-bit SSL encrypted website to be used by our secure payments provider Stripe. We won't take a penny from you until the mechanic / garage has completed work. We will pre-authorise the booking amount on your card 24 hours before the booking so we can ensure the mechanic / garage gets paid."],
  ["On the day", "Your mechanic will collect any parts they need and arrive at your chosen location within your requested arrival window. They'll introduce themselves and either take your car to the garage or get on with the work that you have selected. Once all work has been agreed and finished (and your car returned if it was taken to a garage), your mechanic will explain the work they carried out. Once you're happy, your securely stored bank card will be charged through the Smart Servicing Centre app that all of the mechanics carry on their smart phone. The invoice from your mechanic / garage will be sent directly to your email. Once the job is completed and your car returned you'll receive an email asking you to rate your mechanic / garage."],
];
const WHY = [
  { icon: Award, t: "Quality", d: "Fully qualified mechanics and technicians using the latest technology. Each car service is carried out by qualified mechanics and technicians using the latest equipment." },
  { icon: CreditCard, t: "Secure payment", d: "We aim to exceed all of our customers expectations while providing you with a secure payment process. No additional work carried out without your approval." },
  { icon: Users, t: "Experienced team", d: "Fully-qualified mechanics, each with 10+ years’ experience." },
  { icon: ShieldCheck, t: "Warranty", d: "Parts and labour warranty, 12-months or 12,000-mile (whichever comes first)." },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="From quote to car care" title="A simpler way to get it sorted.">Choose your service, find an appointment, and keep in touch with your mechanic. Here’s what happens along the way.</PageHero>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="How it works" title="A smarter way of getting your car’s service, maintenance & repairs without leaving your house" />
        <blockquote className="mt-6 border-l-4 border-accent pl-4 text-lg italic">“We are working hard to provide our customers with a servicing experience through honesty and trust”</blockquote>
        <p className="mt-4 max-w-3xl text-muted">Our aim is to provide an end-to-end service to all our customers for their car servicing, maintenance &amp; repairs, making it a simple process which is not only hassle-free but also cost effective.</p>
      </section>
      <section className="bg-sunken py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Work process" title="Book a trusted garage or mobile mechanic in just a few clicks" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROCESS.map(([t, d]) => (
              <div key={t} className="process-card"><h3 className="font-display text-lg font-semibold">{t}</h3><p className="mt-2 text-muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="We handle it" title="Thought fixing your car was a time-consuming headache?" />
        <ol className="mt-8 space-y-6">
          {DETAIL.map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand font-display font-semibold text-on-brand">{i + 1}</span>
              <div><h3 className="font-display text-lg font-semibold">{t}</h3><p className="mt-1 max-w-3xl text-muted">{d}</p></div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-muted">If you have any questions or need a hand with your booking don&apos;t hesitate to email us on <a className="text-brand underline" href="mailto:info@smartservicingcentre.co.uk">info@smartservicingcentre.co.uk</a></p>
      </section>
      <section className="bg-sunken py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Why choose us?" title="Quality work, secure payment, real warranty" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.t} className="process-card">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand"><w.icon size={20} /></span>
                <h3 className="mt-4 font-display font-semibold uppercase">{w.t}</h3>
                <p className="mt-2 text-sm text-muted">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <QuoteHero secondary />
    </>
  );
}
