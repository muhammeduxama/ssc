import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingLayout } from "@/components/booking/BookingLayout";
import { CarSummary } from "@/components/booking/Steps";
import { loadBooking } from "@/lib/booking/state";
import { db } from "@/lib/db";
import { CategoryIcon } from "@/components/site/ThemeIcons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a category" };

/** OrderController@services */
export default async function ChooseCategory() {
  const b = await loadBooking();
  if (!b) redirect("/");
  const categs = await db.maincategories.findMany({ where: { status: true }, orderBy: { id: "asc" } });
  const descriptions = ["Tell us what needs repairing and explore the available services.", "Keep your car running smoothly with routine servicing and MOT options.", "Not sure what's wrong? Start with a diagnostic inspection."];
  return <BookingLayout step={2} title="What does your car need?" description="Choose the type of care you're looking for. You'll see the available services next." back={{href:"/",label:"Change vehicle or location"}}>
    <div className="booking-vehicle-banner"><CarSummary reg={b.booking.reg} car={b.car} postcode={b.postcode.postcode}/><Link href="/" className="booking-text-link">Change details</Link></div>
    <ul className="booking-category-grid">{categs.map((c,i)=><li key={String(c.id)}><Link href={`/choose-service/${c.id}`} className="booking-category-card"><span className="booking-category-icon"><CategoryIcon title={c.title}/></span><h2>{c.title}</h2><p>{descriptions[i] || "Explore the available services for your car."}</p><span className="booking-category-action">Explore services <ArrowRight size={16}/></span></Link></li>)}</ul>
  </BookingLayout>;
}
