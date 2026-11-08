import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { CarBrandLogo } from "@/components/CarBrandLogo";
import { StatusBadge } from "@/components/ui";
import { gbp, shortDate, type Car } from "@/lib/format";

export function QuoteCard({ reference, href, status, car, date, amount, summary, menu, children, details }: {
  reference: string; href: string; status: string; car: Car & { title: string }; date: Date | null; amount?: number;
  summary: string; menu?: React.ReactNode; children: React.ReactNode; details?: React.ReactNode;
}) {
  const reg = car.reg && !/^(unknown|no registration|not supplied)$/i.test(car.reg) ? car.reg : null;
  return <article className="card customer-quote">
    <header className="customer-quote-header"><div><Link href={href}>{reference}</Link><StatusBadge status={status}/></div>{menu}</header>
    <div className="customer-quote-body">
      <div className="customer-quote-overview"><CarBrandLogo make={car.make} className="car-brand-logo-compact"/><div className="min-w-0 flex-1"><Link href={href} className="customer-quote-vehicle">{car.title}</Link><p className="customer-quote-specs">{[car.year, car.engine && `${car.engine}L`, car.fuel].filter(Boolean).join(" · ")}</p>{reg && <span className="registration-plate">{reg}</span>}</div>{amount !== undefined && <div className="customer-quote-price"><span>Quote total</span><strong>{gbp(amount)}</strong></div>}</div>
      <p className="customer-quote-summary" title={summary}>{summary}</p>
      <p className="customer-quote-date"><CalendarDays size={13} aria-hidden/>{date ? <>Requested <time dateTime={date.toISOString()}>{shortDate(date)}</time></> : "Date not recorded"}</p>
    </div>
    <footer className="customer-quote-actions">{children}</footer>
    {details && <details className="customer-quote-breakdown"><summary>Price breakdown</summary><div>{details}</div></details>}
  </article>;
}
