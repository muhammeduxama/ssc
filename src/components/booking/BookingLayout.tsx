import { ArrowLeft, CalendarClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Steps } from "./Steps";

export function BookingLayout({ step, title, description, back, children, complete = false, quote = false }: {
  complete?: boolean; quote?: boolean; step: 1 | 2 | 3 | 4; title: string; description: string; back?: { href: string; label: string }; children: React.ReactNode;
}) {
  return <div className="booking-flow"><div className="booking-container">
    <Steps at={step} complete={complete} quote={quote}/>
    <header className="booking-page-heading">{back && <Link href={back.href} className="booking-back"><ArrowLeft size={15} />{back.label}</Link>}<p className="booking-eyebrow">Your car care, made simple</p><h1>{title}</h1><p>{description}</p></header>
    {children}
    <div className="booking-reassurance"><span><ShieldCheck size={17} /> Your details stay secure</span><span><CalendarClock size={17} /> Choose times that suit you</span></div>
  </div></div>;
}
