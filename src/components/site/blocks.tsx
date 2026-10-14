import { ArrowRight, Star, Wrench } from "lucide-react";
import Link from "next/link";

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-[1.15] tracking-[-.035em] sm:text-4xl">{title}</h2>
    </div>
  );
}

export function ChipGrid({ eyebrow, title, items, more, tone }: { eyebrow: string; title: string; items: { href: string; label: string }[]; more?: string; tone?: "sunken" }) {
  if (!items.length) return null;
  return (
    <section className={tone === "sunken" ? "bg-sunken" : ""}>
      <div className="site-container py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow={eyebrow} title={title} />
          {more && <Link href={more} className="text-link">Explore all <ArrowRight size={16} /></Link>}
        </div>
        <ul className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="browse-card group">
                <span>{i.label}</span> <ArrowRight size={17} className="shrink-0 text-brand transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-accent" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} fill={i <= value ? "currentColor" : "none"} />)}
    </span>
  );
}

export function ReviewCards({ reviews }: { reviews: { id: number; name: string; rating: number; text: string }[] }) {
  return (
    <ul className="mt-8 grid gap-4 md:grid-cols-3">
      {reviews.map((r) => (
        <li key={r.id} className="card flex flex-col p-7">
          <Stars value={r.rating} />
          <p className="mt-5 line-clamp-6 flex-1 text-base leading-7 text-muted">{r.text.split(/\s+/).slice(0, 35).join(" ")}{r.text.split(/\s+/).length > 35 ? "…" : ""}</p>
          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            <span className="font-semibold">{r.name}</span>
            <Link href={`/watch/review/${r.id}`} className="text-sm text-brand underline">Read</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="site-container py-14 sm:py-20">
        {eyebrow && <span className="eyebrow !text-brand">{eyebrow}</span>}
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.1] tracking-[-.04em] sm:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-night-muted">{children}</div>}
      </div>
    </section>
  );
}

/** Compact hero band for task pages (booking steps, estimates, reviews): same look as PageHero, less height. */
export function PageHead({ eyebrow, title, top, children }: { eyebrow?: React.ReactNode; title: string; top?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="site-container py-10 sm:py-12">
        {top && <div className="mb-7">{top}</div>}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-[1.15] tracking-[-.035em] sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
      </div>
    </section>
  );
}

/** Raw JSON-LD/schema snippet saved by admins (schema_code columns). */
export function SchemaCode({ code }: { code: string | null | undefined }) {
  if (!code?.trim()) return null;
  const json = code.replace(/<\/?script[^>]*>/gi, "").trim();
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }} />;
}

/** The "Book … By Mobile Mechanics & Garages" banner with the quote form, used across the public pages. */
export async function QuoteHero({ what = "Car", secondary = false }: { what?: string | null; secondary?: boolean }) {
  const Heading = secondary ? "h2" : "h1";
  const { QuoteForm } = await import("./QuoteForm");
  return (
    <section id="quote" className="page-hero scroll-mt-24">
      <div className="site-container grid items-center gap-10 py-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-16">
        <div>
          <span className="eyebrow">Local expertise. Simple booking.</span>
          <Heading className="mt-5 max-w-xl font-display text-4xl font-semibold leading-[1.1] tracking-[-.04em] sm:text-5xl">{what || "Car"} care, made simple.</Heading>
          <p className="mt-5 max-w-md text-lg leading-8 text-muted">Find a mobile mechanic or local garage. Start with your vehicle and we’ll help you find the right service.</p>
        </div>
        <div className="quote-panel">
          <div className="mb-6 flex items-center gap-3"><span className="icon-tile"><Wrench size={20} /></span><h2 className="font-display text-xl font-semibold">Get a quote for your car</h2></div>
          <QuoteForm compact />
        </div>
      </div>
    </section>
  );
}

export function Html({ html, className = "" }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;
  return <div className={`prose-content leading-7 ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
