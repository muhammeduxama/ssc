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
import { BookingLayout } from "@/components/booking/BookingLayout";

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
    <BookingLayout step={3} quote title="Tell us about your repair" description="A few details help us gather suitable quotes for your car. You can review the quotes before choosing how to proceed." back={{href:"/choose-category",label:"Back to services"}}>
      <div className="booking-columns">
        {s && !me ? <NotCustomer name={s.name} back={`/services/${id}/repairs`} /> : <RepairQuoteForm
          serviceId={Number(service.id)}
          serviceName={service.name}
          guest={!me}
          postcode={b.postcode.postcode}
          reg={b.booking.reg ?? "UNKNOWN"}
          city={b.postcode.cities.name || me?.city || ""}
          county={b.postcode.counties.name}
          street={me?.street ?? ""}
          houseNo={me?.house_no ?? ""}
        />}
        <aside className="booking-sidebar space-y-3">
          <div className="card space-y-4 p-5">
            <CarSummary reg={b.booking.reg} car={b.car} />
            <div className="rounded-lg bg-brand-soft p-4 text-sm">
              <div className="font-display text-lg font-semibold text-brand">A quote tailored to your repair</div>
              <p className="mt-1">Your request will be reviewed so suitable mechanics and garages can provide repair quotes.</p>
            </div>
          </div>
          <Link href="/choose-category" className="btn btn-secondary w-full">Back to services</Link>
        </aside>
      </div>
    </BookingLayout>
  );
}
