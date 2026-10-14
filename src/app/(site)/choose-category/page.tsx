import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarSummary, Steps } from "@/components/booking/Steps";
import { loadBooking } from "@/lib/booking/state";
import { db } from "@/lib/db";
import { CategoryIcon } from "@/components/site/ThemeIcons";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a category" };

/** OrderController@services */
export default async function ChooseCategory() {
  const b = await loadBooking();
  if (!b) redirect("/");
  const categs = await db.maincategories.findMany({ where: { status: true }, orderBy: { id: "asc" } });
  return (
    <>
    <PageHead top={<Steps at={2} />} eyebrow="Answer a few simple questions to get a quote" title={`What are you looking for your ${b.car.make}?`}>Service at your home or office, upfront and transparent pricing, hassle free repair.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <div className="card p-5"><CarSummary reg={b.booking.reg} car={b.car} /></div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {categs.map((c) => (
          <li key={String(c.id)}>
            <Link href={`/choose-service/${c.id}`} className="card group flex h-full flex-col items-center p-8 text-center transition hover:-translate-y-0.5 hover:border-brand hover:shadow-card">
              <CategoryIcon title={c.title} />
              <span className="mt-4 font-display text-lg font-semibold uppercase">{c.title}</span>
              <ArrowRight size={18} className="mt-3 text-brand opacity-0 transition group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}
