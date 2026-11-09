import { VehicleMark } from "@/components/VehicleMark";
import { CalendarClock, MapPin, PoundSterling, ReceiptText } from "lucide-react";
import { DetailPage, DetailHeader, DetailMetrics } from "@/components/DetailPage";
import { notFound } from "next/navigation";
import { RequestActions } from "@/components/mechanic/RequestActions";
import { Registration } from "@/components/mechanic/WorkList";
import { Field } from "@/components/ui";
import { asset } from "@/lib/asset";
import { gbp } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { jobRequest } from "@/lib/mechanic/jobs";

export const metadata = { title: "Job request" };

/** The React RequestPage: details, earnings, accept at a slot or decline with a reason. */
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("mechanic");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await jobRequest(s.id, Number(id));
  if (!r) notFound();
  const mine = r.takenBy === Number(s.id);
  const closed = r.order.status === "rejected" ? "Sorry, this booking has been cancelled by the customer" : r.takenBy && !mine ? "Sorry, this booking is taken by another mechanic" : null;
  const blocked = !r.docsUploaded ? "Please upload your required documents before you accept any job." : !r.docsApproved ? "Documents are waiting for approval! Please wait for your documents to be approved." : undefined;

  return (
    <DetailPage>
      <DetailHeader back={{ href: "/mechanic/requests", label: "Job requests" }} eyebrow={`Booking #${r.order.id} · ${r.order.service}`} title={r.carTitle} />
      <DetailMetrics items={[
        { label: "Your earnings", value: gbp(r.price - r.commission), hint: "After the platform fee", icon: PoundSterling },
        { label: "Customer total", value: gbp(r.price), hint: `Platform fee ${gbp(r.commission)}`, icon: ReceiptText },
        { label: "Location", value: r.customer.postcode, hint: `${r.customer.city} · ${r.miles} mi`, icon: MapPin },
        { label: "Preferred times", value: String(r.schedule.reduce((total, day) => total + day.times.length, 0)), hint: "Choose a slot to accept", icon: CalendarClock },
      ]}/>
      {closed ? (
        <div className="card p-8 text-center"><h2 className="font-display text-xl font-semibold">{closed}</h2></div>
      ) : (
        <div className="mech-request-columns">
          <div className="space-y-4">
            {(r.order.notes || r.order.sscNotes) && (
              <section className="card border-warn bg-warn-soft/40 p-5 text-sm">
                {r.order.notes && <p><b>Customer says:</b> {r.order.notes}</p>}
                {r.order.sscNotes && <p className="mt-1"><b>Smart Servicing Centre says:</b> {r.order.sscNotes}</p>}
              </section>
            )}
            <section className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Vehicle &amp; location</h2>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <VehicleMark make={r.car.make} src={asset(r.car.logo)}/>
                {[r.car.model, r.car.engine, r.car.year, r.car.fuel].filter(Boolean).map((x) => <span key={String(x)} className="pill border-line">{x}</span>)}
                <Registration value={String(r.car.reg ?? "")}/>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label="Customer">{r.customer.name}</Field>
                <Field label="Area">{r.customer.city} · {r.customer.postcode}</Field>
                <Field label="Distance">{r.miles} miles</Field>
                <Field label="Customer is happy with">{["Mobile mechanic", r.order.collection && "Free collection and delivery", r.order.driveable && "Vehicle is drivable", r.order.dropOff && "Can drop the car at a garage"].filter(Boolean).join(" · ")}</Field>
                <Field label="Payment method">Card payment via platform (Stripe)</Field>
              </dl>
            </section>
            <section className="card p-6">
              <h2 className="mb-3 font-display text-lg font-semibold">Work required</h2>
              {r.sscQuote ? (
                <ul className="space-y-1 text-sm">{r.sscQuote.map((q, i) => <li key={i} className="flex justify-between"><span>{q.name} <span className="text-xs text-muted">({q.type})</span></span><span className="font-mono">{gbp(q.price)}</span></li>)}</ul>
              ) : (
                <ul className="space-y-3">{r.work.map((w, i) => <li key={i}><div className="font-medium">{w.name}</div>{w.parts.length > 0 && <div className="text-sm text-muted">Parts included: {w.parts.join(", ")}</div>}</li>)}</ul>
              )}
              <p className="mt-4 rounded-lg bg-sunken p-3 text-xs text-muted">The prices represent a parts budget (VAT inc.) expected to cover your cost. Any follow-on work is charged at the local labour rate of {gbp(r.labourRate)} per hour.</p>
            </section>
          </div>
          <aside className="space-y-4 mech-request-sidebar">
            {r.status === "pending" ? <RequestActions id={r.id} schedule={r.schedule} blocked={blocked} /> : <div className="card p-6 text-sm text-muted">This request is <b className="capitalize text-ink">{r.status}</b>.</div>}
          </aside>
        </div>
      )}
    </DetailPage>
  );
}
