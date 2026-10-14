import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RepairQuoteForm } from "@/components/booking/RepairQuoteForm";
import { CarSummary } from "@/components/booking/Steps";
import { loadBooking } from "@/lib/booking/state";
import { NotCustomer } from "@/components/booking/NotCustomer";
import { currentCustomer } from "@/lib/customer";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Request a repair quote" };

/** OrderController@getRepairquote */
export default async function RepairQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await loadBooking();
  const service = /^\d+$/.test(id) ? await db.services.findUnique({ where: { id: BigInt(id) } }) : null;
  if (!b || !service) redirect("/");
  const [me, s] = await Promise.all([currentCustomer(), getSession()]);
  return (
    <>
    <PageHead eyebrow="Repair quote" title="We need a few more details to complete your quote request" />
    <section className="site-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {s && !me ? <NotCustomer name={s.name} back={`/services/${id}/repairs`} /> : <RepairQuoteForm
          serviceId={Number(service.id)}
          serviceName={service.name}
          guest={!me}
          postcode={b.postcode.postcode}
          reg={b.booking.reg ?? "UNKNOWN"}
          city={me?.city || b.postcode.cities.name}
          county={b.postcode.counties.name}
          street={me?.street ?? ""}
          houseNo={me?.house_no ?? ""}
        />}
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-4 p-5">
            <CarSummary reg={b.booking.reg} car={b.car} />
            <div className="rounded-lg bg-brand-soft p-4 text-sm">
              <div className="font-display text-lg font-semibold text-brand">Save 30% vs average prices</div>
              <p className="mt-1">We will gather quotes from the most trusted mobile mechanics and garages near you after you post your job request.</p>
            </div>
          </div>
          <Link href="/choose-category" className="btn btn-secondary w-full">Back to services</Link>
        </aside>
      </div>
    </section>
    </>
  );
}
