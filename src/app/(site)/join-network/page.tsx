import { BadgePoundSterling, CalendarCheck, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinNetworkForm } from "@/components/site/AuthForms";
import { PageHero, SectionTitle } from "@/components/site/blocks";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Join our network of mechanics" };

/** RegisterController@joinGarage */
export default async function JoinNetwork() {
  if (await getSession()) redirect("/dashboard");
  const perks = [
    { icon: CalendarCheck, t: "Jobs near you", d: "Booking requests from customers in your area, sent straight to your phone." },
    { icon: BadgePoundSterling, t: "Get paid automatically", d: "Customers' cards are charged when you complete the job, paid out through Stripe." },
    { icon: Smartphone, t: "Run jobs from the app", d: "Accept work, add parts and labour, record faults and charge — all in one place." },
  ];
  return (
    <>
      <PageHero eyebrow="Garages & mobile mechanics" title="Join the Smart Servicing Centre network">Grow your business with pre-paid local jobs. Sign up, upload your documents and start receiving bookings once you&apos;re approved.</PageHero>
      <section className="site-container grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionTitle eyebrow="Why join" title="More local work, less admin." />
          <ul className="mt-8 space-y-4">
            {perks.map((p) => (
              <li key={p.t} className="process-card flex gap-4">
                <span className="icon-tile"><p.icon size={20} /></span>
                <div><h3 className="font-display text-lg font-semibold">{p.t}</h3><p className="mt-1 text-sm leading-6 text-muted">{p.d}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="quote-panel"><h2 className="font-display text-2xl font-semibold">Register your business</h2><p className="mb-6 mt-2 text-sm text-muted">It takes a few minutes. We&apos;ll email you a link to upload your documents.</p><JoinNetworkForm /></div>
      </section>
    </>
  );
}
