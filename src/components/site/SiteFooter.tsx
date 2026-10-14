import Link from "next/link";
import { Logo } from "@/components/Logo";

const INFO: [string, string][] = [
  ["/about", "About"],
  ["/mobile-mechanics", "Mobile mechanics"],
  ["/join-network", "Become a mechanic"],
  ["/legal_docs/customer-terms", "Terms and conditions"],
  ["/legal_docs/privacy", "Privacy & cookies policy"],
];
const SUPPORT: [string, string][] = [
  ["/faq", "FAQ"],
  ["/how_it_works", "How it works"],
  ["/contact-us", "Contact us"],
  ["/blog", "Blog"],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-night text-night-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo className="h-20" />
          <p className="mt-4 max-w-xs text-sm leading-7 text-night-muted">Car care, made simple. Find local mechanics and garages for the everyday jobs and the unexpected repairs.</p>
        </div>
        <FooterCol title="Information" links={INFO} />
        <FooterCol title="Customer support" links={SUPPORT} />
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-night-muted">Have questions?</h2>
          <p className="mt-3 text-sm">Email us</p>
          <a href="mailto:info@smartservicingcentre.co.uk" className="mt-1 block break-all text-sm text-brand hover:underline">info@smartservicingcentre.co.uk</a>
        </div>
      </div>
      <div className="border-t border-night-line">
        <div className="mx-auto max-w-6xl px-4 py-5 font-mono text-xs text-night-muted sm:px-6">© {new Date().getFullYear()} Smart Servicing Centre. All rights reserved.</div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-night-muted">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-brand">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
