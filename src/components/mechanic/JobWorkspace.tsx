"use client";
import { Bug, Camera, CheckCircle2, LifeBuoy, MapPin, MessageSquare, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addFault,
  addFollowOnLine,
  addLabour,
  addPart,
  addPhoto,
  chargeCustomer,
  deleteFault,
  deleteFollowOnLine,
  deleteLabour,
  deletePart,
  deletePhoto,
  editLabour,
  editPart,
  sendFollowOnQuote,
  setMileage,
  updateVisit,
  updateVisitFromSlot,
  type Result,
} from "@/app/actions/mechanic-jobs";
import { useToast } from "@/components/Toast";
import { asset } from "@/lib/asset";
import { gbp } from "@/lib/format";
import type { JobWorkspace as Job } from "@/lib/mechanic/jobs";
import { TIME_SLOTS } from "@/lib/time";
import { Modal } from "./Modal";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: (r: Result) => void) =>
      start(async () => {
        const r = await fn();
        toast(r.message, r.ok);
        if (r.ok) router.refresh();
        after?.(r);
      }),
  };
}

function Block({ title, action, children, tone }: { title: string; action?: React.ReactNode; children: React.ReactNode; tone?: "note" }) {
  return (
    <section className={`card overflow-hidden ${tone === "note" ? "border-warn" : ""}`}>
      <header className={`flex items-center justify-between gap-3 border-b border-line px-5 py-3 ${tone === "note" ? "bg-warn-soft/60" : ""}`}>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const Row = ({ name, price, onEdit, onDelete, readOnly }: { name: string; price: number; onEdit?: () => void; onDelete?: () => void; readOnly?: boolean }) => (
  <li className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
    <span className="flex-1 text-sm font-medium">{name}</span>
    <span className="font-mono text-sm">{gbp(price)}</span>
    {!readOnly && (
      <>
        {onEdit && <button onClick={onEdit} aria-label={`Edit ${name}`} className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink"><Pencil size={15} /></button>}
        {onDelete && <button onClick={onDelete} aria-label={`Delete ${name}`} className="rounded-md p-1.5 text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>}
      </>
    )}
  </li>
);

export function JobWorkspace({ j, supportThread, customerThread }: { j: Job; supportThread: string; customerThread: string }) {
  const live = j.status === "assigned";
  const { pending, run } = useRun();
  const [modal, setModal] = useState<null | "labour" | "part" | "photo" | "fault" | "visit" | "mileage" | "edit" | "charge">(null);
  const [edit, setEdit] = useState<{ kind: "labour" | "service" | "part" | "servicepart"; id: number; name: string; price: string } | null>(null);
  const [lab, setLab] = useState({ description: "", hours: "0", minutes: "0" });
  const [prt, setPrt] = useState({ description: "", price: "" });
  const [fault, setFault] = useState({ description: "", urgency: "", code: "", fixed: false });
  const [visit, setVisit] = useState({ mode: j.schedule.length ? "slot" : "free", date: j.schedule[0]?.date ?? "", slot: "", free: "", time: TIME_SLOTS[0] });
  const [miles, setMiles] = useState(j.mileage >= 1 ? String(j.mileage) : "");
  const [step, setStep] = useState<"further" | "cando" | "reason" | "quote" | "confirm">("further");
  const [reason, setReason] = useState("");
  const [fo, setFo] = useState({ name: "", hours: "0", minutes: "0", part: "", partPrice: "" });

  const labMinutes = Number(lab.hours) * 60 + Number(lab.minutes);
  const labPrice = labMinutes * j.labourHourLimit;
  const foLabourPrice = Number(fo.hours) * j.labourRate + (Number(fo.minutes) / 60) * j.labourRate;
  const totalLabour = j.services.reduce((t, s) => t + s.labour, 0) + j.labours.reduce((t, l) => t + l.price, 0);
  const totalParts = j.services.reduce((t, s) => t + s.parts.reduce((x, p) => x + p.price, 0), 0) + j.parts.reduce((t, p) => t + p.price, 0);
  const times = j.schedule.find((s) => s.date === visit.date)?.times ?? [];

  const startCharge = () => {
    if (j.mileage < 1) {
      setModal("mileage");
      return;
    }
    setStep("further");
    setModal("charge");
  };
  const charge = (withReason?: string) => run(() => chargeCustomer(j.id, withReason), (r) => r.ok && setModal(null));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href={`/messages?thread=${encodeURIComponent(supportThread)}`} className="btn btn-secondary"><LifeBuoy size={16} /> Smart Servicing</Link>
          <Link href={`/messages?thread=${encodeURIComponent(customerThread)}`} className="btn btn-secondary"><MessageSquare size={16} /> Customer</Link>
        </div>

        {(j.order.notes || j.order.sscNotes) && (
          <Block title="Please note" tone="note">
            {j.order.notes && <p className="text-sm"><b>Customer says:</b> {j.order.notes}</p>}
            {j.order.sscNotes && <p className="mt-1 text-sm"><b>Smart Servicing Centre says:</b> {j.order.sscNotes}</p>}
          </Block>
        )}

        <Block title="Customer information & location">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-sm">
              <div className="text-base font-semibold">{j.customer.name}</div>
              <div className="mt-1 text-muted">{[j.customer.houseNo, j.customer.street].filter(Boolean).join(", ")}</div>
              <div className="text-muted">{j.customer.city}</div>
              <div className="font-mono">{j.customer.postcode}</div>
            </div>
            <div className="flex flex-col gap-2">
              <a href={`tel:${j.customer.phone}`} className="btn btn-secondary"><Phone size={16} /> {j.customer.phone}</a>
              <a href={`https://www.google.co.uk/maps/place/${encodeURIComponent(j.customer.postcode)}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><MapPin size={16} /> View on map</a>
            </div>
          </div>
        </Block>

        <Block title="Vehicle information" action={live && <button onClick={() => setModal("mileage")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Pencil size={14} /> Mileage</button>}>
          <div className="flex flex-wrap items-center gap-2">
            {j.car.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset(j.car.logo)} alt="" className="h-9 w-11 object-contain" />
            )}
            {[j.car.model, j.car.engine, j.car.year, j.car.fuel].filter(Boolean).map((x) => <span key={String(x)} className="pill border-line">{x}</span>)}
            <span className="ml-auto rounded-md border-2 border-black bg-[#f7ce35] px-3 py-1 font-mono font-bold tracking-widest text-black">{String(j.car.reg ?? "").toUpperCase()}</span>
          </div>
          <p className="mt-3 text-sm">Mileage at start of booking: <b>{j.mileage >= 1 ? j.mileage.toLocaleString("en-GB") : "Not yet entered"}</b></p>
        </Block>

        <Block title="Appointment time" action={live && <button onClick={() => setModal("visit")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Pencil size={14} /> Edit visit</button>}>
          <div className="font-display text-2xl font-semibold">{j.time || "Time not selected"}</div>
          <div className="text-sm text-muted">On {j.date || "date not selected"}</div>
          <p className="mt-2 text-xs text-muted">Remember to call the customer before and let them know your exact arrival time.</p>
        </Block>

        <Block title="Work required" action={live && <button onClick={() => setModal("labour")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Plus size={14} /> Add labour</button>}>
          {j.services.length + j.labours.length === 0 ? <p className="text-sm text-muted">No labour yet.</p> : (
            <ul>
              {j.services.map((s) => (
                <Row key={`s${s.id}`} readOnly={!live} name={s.name} price={s.labour} onEdit={() => { setEdit({ kind: "service", id: s.id, name: s.name, price: String(s.labour) }); setModal("edit"); }} onDelete={() => confirm("Are you sure you want to delete this service? Its parts stay on the job.") && run(() => deleteLabour(j.id, "service", s.id))} />
              ))}
              {j.labours.map((l) => (
                <Row key={`l${l.id}`} readOnly={!live} name={l.description} price={l.price} onEdit={() => { setEdit({ kind: "labour", id: l.id, name: l.description, price: String(l.price) }); setModal("edit"); }} onDelete={() => confirm("Are you sure you want to delete this labour?") && run(() => deleteLabour(j.id, "labour", l.id))} />
              ))}
            </ul>
          )}
        </Block>

        <Block title="Parts included" action={live && <button onClick={() => setModal("part")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Plus size={14} /> Add part</button>}>
          {j.services.every((s) => !s.parts.length) && j.parts.length === 0 ? <p className="text-sm text-muted">No parts.</p> : (
            <ul>
              {j.services.flatMap((s) => s.parts).map((p) => (
                <Row key={`sp${p.id}`} readOnly={!live} name={p.name} price={p.price} onEdit={() => { setEdit({ kind: "servicepart", id: p.id, name: p.name, price: String(p.price) }); setModal("edit"); }} onDelete={() => confirm(`Remove ${p.name}?`) && run(() => deletePart(j.id, "servicepart", p.id))} />
              ))}
              {j.parts.map((p) => (
                <Row key={`p${p.id}`} readOnly={!live} name={p.description} price={p.price} onEdit={() => { setEdit({ kind: "part", id: p.id, name: p.description, price: String(p.price) }); setModal("edit"); }} onDelete={() => confirm(`Remove ${p.description}?`) && run(() => deletePart(j.id, "part", p.id))} />
              ))}
            </ul>
          )}
        </Block>

        <Block title="Photos" action={live && <button onClick={() => setModal("photo")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Camera size={14} /> Add photo</button>}>
          {j.photos.length === 0 ? <p className="text-sm text-muted">No photo listed.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {j.photos.map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(p.image)} alt={p.description || "Job photo"} className="aspect-square w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
                    <span className="line-clamp-2">{p.description}</span>
                    {live && <button onClick={() => confirm("Delete this photo?") && run(() => deletePhoto(j.id, p.id))} aria-label="Delete photo" className="text-danger"><Trash2 size={14} /></button>}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Block>

        <Block title="Detected faults" action={live && <button onClick={() => setModal("fault")} className="btn btn-ghost !px-2 !py-1 !text-xs"><Bug size={14} /> Add fault</button>}>
          {j.faults.length === 0 ? <p className="text-sm text-muted">No faults identified.</p> : (
            <ul className="divide-y divide-line">
              {j.faults.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{f.description}</div>
                    {f.code && <div className="font-mono text-xs text-muted">Trouble code: {f.code}</div>}
                  </div>
                  <span className={`pill border-transparent ${f.urgency === "Critical" || f.urgency === "High" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>{f.urgency}</span>
                  {f.fixed && <span className="pill border-transparent bg-ok-soft text-ok">Fixed</span>}
                  {live && <button onClick={() => run(() => deleteFault(j.id, f.id))} aria-label="Delete fault" className="text-danger"><Trash2 size={15} /></button>}
                </li>
              ))}
            </ul>
          )}
        </Block>

        {!live && (
          <Block title="Follow-on quote" action={j.followOn && <span className="pill border-line">{j.followOn.status}</span>}>
            <p className="mb-3 text-sm text-muted">Found more work? Quote it here and we’ll email the customer a “Book me in” link. Labour is charged at the local rate of {gbp(j.labourRate)}/hour.</p>
            {j.followOn && (
              <ul className="mb-4">
                {j.followOn.labours.map((l) => <Row key={`fl${l.id}`} readOnly={j.followOn!.status === "Quotation Sent"} name={`${l.name} (labour)`} price={l.price} onDelete={() => run(() => deleteFollowOnLine(j.id, "labour", l.id))} />)}
                {j.followOn.parts.map((p) => <Row key={`fp${p.id}`} readOnly={j.followOn!.status === "Quotation Sent"} name={`${p.name} (part)`} price={p.price} onDelete={() => run(() => deleteFollowOnLine(j.id, "part", p.id))} />)}
                <li className="flex justify-between border-t border-line pt-2.5 text-sm font-semibold"><span>Total</span><span className="font-mono">{gbp(j.followOn.price)}</span></li>
              </ul>
            )}
            {j.followOn?.status !== "Quotation Sent" && (
              <div className="space-y-3">
                <FollowOnForm fo={fo} setFo={setFo} price={foLabourPrice} pending={pending} onLabour={() => run(() => addFollowOnLine(j.id, "labour", fo.name, foLabourPrice, Number(fo.hours)), (r) => r.ok && setFo({ ...fo, name: "", hours: "0", minutes: "0" }))} onPart={() => run(() => addFollowOnLine(j.id, "part", fo.part, Number(fo.partPrice)), (r) => r.ok && setFo({ ...fo, part: "", partPrice: "" }))} />
                <button disabled={pending || !j.followOn?.labours.length} onClick={() => confirm("Send this follow-on quote to the customer?") && run(() => sendFollowOnQuote(j.id))} className="btn btn-primary w-full">Send follow-on quote</button>
              </div>
            )}
          </Block>
        )}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="card p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Total labour</span><span className="font-mono">{gbp(totalLabour)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Total parts</span><span className="font-mono">{gbp(totalParts)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total price</span><span className="font-mono">{gbp(j.price)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Job fee</span><span className="font-mono">−{gbp(j.commission)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Stripe charges</span><span className="font-mono">−{gbp(j.stripeFee)}</span></div>
          </div>
          <div className="mt-4 rounded-lg bg-brand-soft p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-brand">Net income</div>
            <div className="font-display text-3xl font-medium text-brand">{gbp(j.price - j.commission - j.stripeFee)}</div>
            <div className="text-xs text-muted">After platform and Stripe fee.</div>
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-muted">
            <li>You will be charging the customer a total of <b className="text-ink">{gbp(j.price)}</b> including Smart Servicing Centre commission.</li>
            <li>Any follow-on work is charged at the local labour rate of <b className="text-ink">{gbp(j.labourRate)}</b>/hour.</li>
            <li>Payment: card via platform (Stripe){j.paymentAuthorised ? " — card authorised" : " — customer hasn’t added a card yet"}.</li>
          </ul>
          {live ? (
            <>
              {!j.stripeConnected && <p className="mt-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs">Connect your Stripe account in <Link href="/mechanic/payments" className="font-semibold underline">Payments</Link> before charging.</p>}
              <button onClick={startCharge} className="btn btn-primary mt-4 w-full py-3">Generate invoice &amp; charge</button>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm font-semibold text-ok"><CheckCircle2 size={16} /> Completed{j.excuse ? " · further work declined" : ""}</div>
          )}
        </section>
      </aside>

      {/* ------------------------------------------------ modals */}
      <Modal busy={pending} open={modal === "labour"} onClose={() => setModal(null)} title="Add labour">
        <p className="mb-3 text-sm text-muted">Use this to add any additional labour, with the consent of the customer.</p>
        <label className="label" htmlFor="ld">Work description</label>
        <input id="ld" value={lab.description} onChange={(e) => setLab({ ...lab, description: e.target.value })} className="input" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="lh">Hours</label><select id="lh" value={lab.hours} onChange={(e) => setLab({ ...lab, hours: e.target.value })} className="input">{Array.from({ length: 13 }, (_, i) => <option key={i}>{i}</option>)}</select></div>
          <div><label className="label" htmlFor="lm">Minutes</label><select id="lm" value={lab.minutes} onChange={(e) => setLab({ ...lab, minutes: e.target.value })} className="input">{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <p className="mt-3 text-sm">Labour price: <b className="font-mono">{gbp(labPrice)}</b></p>
        <button disabled={pending} onClick={() => run(() => addLabour(j.id, lab.description, labMinutes), (r) => r.ok && (setModal(null), setLab({ description: "", hours: "0", minutes: "0" })))} className="btn btn-primary mt-4 w-full">Add labour</button>
      </Modal>

      <Modal busy={pending} open={modal === "part"} onClose={() => setModal(null)} title="Add part">
        <p className="mb-3 text-sm text-muted">Add any additional part used, with the consent of the customer.</p>
        <label className="label" htmlFor="pn">Part name</label>
        <input id="pn" value={prt.description} onChange={(e) => setPrt({ ...prt, description: e.target.value })} placeholder="As it should appear on the customer's invoice" className="input" />
        <label className="label mt-3" htmlFor="pp">Price in £</label>
        <input id="pp" inputMode="decimal" value={prt.price} onChange={(e) => setPrt({ ...prt, price: e.target.value })} className="input" />
        <button disabled={pending} onClick={() => run(() => addPart(j.id, prt.description, Number(prt.price)), (r) => r.ok && (setModal(null), setPrt({ description: "", price: "" })))} className="btn btn-primary mt-4 w-full">Add part</button>
      </Modal>

      <Modal busy={pending} open={modal === "edit" && !!edit} onClose={() => setModal(null)} title={edit?.kind === "part" || edit?.kind === "servicepart" ? "Edit part" : "Edit labour"}>
        {edit && (
          <>
            <label className="label" htmlFor="en">Description</label>
            <input id="en" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input" />
            <label className="label mt-3" htmlFor="ep">Price in £</label>
            <input id="ep" inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} className="input" />
            <button
              disabled={pending}
              onClick={() =>
                run(
                  () => (edit.kind === "part" || edit.kind === "servicepart" ? editPart(j.id, edit.kind, edit.id, edit.name, Number(edit.price)) : editLabour(j.id, edit.kind, edit.id, edit.name, Number(edit.price))),
                  (r) => r.ok && setModal(null),
                )
              }
              className="btn btn-primary mt-4 w-full"
            >
              Save
            </button>
          </>
        )}
      </Modal>

      <Modal busy={pending} open={modal === "photo"} onClose={() => setModal(null)} title="Add photo">
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addPhoto(j.id, fd), (r) => r.ok && setModal(null)); }} className="space-y-3">
          <p className="text-sm text-muted">Add a photo of the removed parts.</p>
          <input type="file" name="image" accept="image/*" capture="environment" required aria-label="Photo" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
          <input name="description" placeholder="Description" aria-label="Description" className="input" />
          <button disabled={pending} className="btn btn-primary w-full">Add photo</button>
        </form>
      </Modal>

      <Modal busy={pending} open={modal === "fault"} onClose={() => setModal(null)} title="Add fault">
        <p className="mb-3 text-sm text-muted">Add any fault found in the diagnostic inspection.</p>
        <label className="label" htmlFor="fd">Fault description</label>
        <textarea id="fd" rows={3} value={fault.description} onChange={(e) => setFault({ ...fault, description: e.target.value })} className="input" />
        <label className="label mt-3" htmlFor="fu">Urgency</label>
        <select id="fu" value={fault.urgency} onChange={(e) => setFault({ ...fault, urgency: e.target.value })} className="input"><option value="">Please select</option>{["Critical", "High", "Medium", "Low"].map((u) => <option key={u}>{u}</option>)}</select>
        <label className="label mt-3" htmlFor="fc">Trouble code (optional)</label>
        <input id="fc" value={fault.code} onChange={(e) => setFault({ ...fault, code: e.target.value })} className="input font-mono" />
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={fault.fixed} onChange={(e) => setFault({ ...fault, fixed: e.target.checked })} className="h-4 w-4" /> It has been fixed</label>
        <button disabled={pending} onClick={() => run(() => addFault(j.id, fault), (r) => r.ok && (setModal(null), setFault({ description: "", urgency: "", code: "", fixed: false })))} className="btn btn-primary mt-4 w-full">Add fault</button>
      </Modal>

      <Modal busy={pending} open={modal === "mileage"} onClose={() => setModal(null)} title="Mileage is mandatory">
        <label className="label" htmlFor="mi">Mileage at start of booking</label>
        <input id="mi" inputMode="numeric" value={miles} onChange={(e) => setMiles(e.target.value)} className="input" />
        <button disabled={pending} onClick={() => run(() => setMileage(j.id, Number(miles)), (r) => r.ok && setModal(null))} className="btn btn-primary mt-4 w-full">Save mileage</button>
      </Modal>

      <Modal busy={pending} open={modal === "visit"} onClose={() => setModal(null)} title="Schedule the visit">
        <p className="mb-3 text-sm text-muted">Change the time and date of the booking, with the consent of the customer.</p>
        {j.schedule.length > 0 && (
          <div className="mb-3 flex gap-1 rounded-lg bg-sunken p-1 text-sm">
            <button onClick={() => setVisit({ ...visit, mode: "slot" })} className={`flex-1 rounded-md py-1.5 font-medium ${visit.mode === "slot" ? "bg-raised shadow-sm" : "text-muted"}`}>Customer’s slots</button>
            <button onClick={() => setVisit({ ...visit, mode: "free" })} className={`flex-1 rounded-md py-1.5 font-medium ${visit.mode === "free" ? "bg-raised shadow-sm" : "text-muted"}`}>Another time</button>
          </div>
        )}
        {visit.mode === "slot" ? (
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Date" value={visit.date} onChange={(e) => setVisit({ ...visit, date: e.target.value, slot: "" })} className="input">{j.schedule.map((s) => <option key={s.date}>{s.date}</option>)}</select>
            <select aria-label="Time" value={visit.slot} onChange={(e) => setVisit({ ...visit, slot: e.target.value })} className="input"><option value="">Select time</option>{times.map((t) => <option key={t.id} value={t.id}>{t.time}</option>)}</select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input type="date" aria-label="Date" value={visit.free} onChange={(e) => setVisit({ ...visit, free: e.target.value })} className="input" />
            <select aria-label="Time" value={visit.time} onChange={(e) => setVisit({ ...visit, time: e.target.value })} className="input">{TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Choosing one of the customer’s slots emails them the new time.</p>
        <button
          disabled={pending || (visit.mode === "slot" ? !visit.slot : !visit.free)}
          onClick={() => run(() => (visit.mode === "slot" ? updateVisitFromSlot(j.id, Number(visit.slot)) : updateVisit(j.id, visit.free, visit.time)), (r) => r.ok && setModal(null))}
          className="btn btn-primary mt-4 w-full"
        >
          Update visit
        </button>
      </Modal>

      <Modal busy={pending} open={modal === "charge"} onClose={() => setModal(null)} title={step === "quote" ? "Place a follow-on quote" : "Finish & charge"} wide={step === "quote"}>
        {step === "further" && (
          <>
            <p className="font-semibold">Does this car require any further work?</p>
            <p className="mt-1 text-sm text-muted">All further work <b>must</b> be carried out through the Smart Servicing Centre system.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("confirm")} className="btn btn-secondary">No</button>
              <button onClick={() => setStep("cando")} className="btn btn-primary">Yes</button>
            </div>
          </>
        )}
        {step === "cando" && (
          <>
            <p className="font-semibold">Can you do this?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("reason")} className="btn btn-secondary">No</button>
              <button onClick={() => setStep("quote")} className="btn btn-primary">Yes</button>
            </div>
          </>
        )}
        {step === "reason" && (
          <>
            <label className="label" htmlFor="rs">Why can’t you carry out this repair?</label>
            <textarea id="rs" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Minimum 5 characters" className="input" />
            <button disabled={pending || reason.trim().length < 5} onClick={() => setStep("confirm")} className="btn btn-primary mt-4 w-full">Finish &amp; charge</button>
          </>
        )}
        {step === "quote" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">We’ll send this to the customer with their invoice. Labour at {gbp(j.labourRate)}/hour.</p>
            {j.followOn && (
              <ul>
                {j.followOn.labours.map((l) => <Row key={`ql${l.id}`} name={`${l.name} (labour)`} price={l.price} onDelete={() => run(() => deleteFollowOnLine(j.id, "labour", l.id))} />)}
                {j.followOn.parts.map((p) => <Row key={`qp${p.id}`} name={`${p.name} (part)`} price={p.price} onDelete={() => run(() => deleteFollowOnLine(j.id, "part", p.id))} />)}
              </ul>
            )}
            <FollowOnForm fo={fo} setFo={setFo} price={foLabourPrice} pending={pending} onLabour={() => run(() => addFollowOnLine(j.id, "labour", fo.name, foLabourPrice, Number(fo.hours)), (r) => r.ok && setFo({ ...fo, name: "", hours: "0", minutes: "0" }))} onPart={() => run(() => addFollowOnLine(j.id, "part", fo.part, Number(fo.partPrice)), (r) => r.ok && setFo({ ...fo, part: "", partPrice: "" }))} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setStep("confirm")} className="btn btn-secondary">I will send the quote later</button>
              <button disabled={pending || !j.followOn?.labours.length} onClick={() => run(() => sendFollowOnQuote(j.id), (r) => r.ok && setStep("confirm"))} className="btn btn-primary">Send quote &amp; charge</button>
            </div>
          </div>
        )}
        {step === "confirm" && (
          <>
            <p className="font-semibold">Are you sure?</p>
            <p className="mt-1 text-sm text-muted">Once a booking is finalised you will not be able to add, edit or remove labour or parts. By continuing you are indicating that there is no extra work you are aware of. Anyone found taking work outside the network will be immediately suspended.</p>
            <p className="mt-3 text-sm">The customer will be charged <b className="font-mono">{gbp(j.price)}</b>.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setModal(null)} className="btn btn-secondary">Return to invoice</button>
              <button disabled={pending} onClick={() => charge(reason || undefined)} className="btn btn-primary">{pending ? "Charging…" : "I understand — charge"}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function FollowOnForm({ fo, setFo, price, pending, onLabour, onPart }: { fo: { name: string; hours: string; minutes: string; part: string; partPrice: string }; setFo: (v: typeof fo) => void; price: number; pending: boolean; onLabour: () => void; onPart: () => void }) {
  return (
    <div className="grid gap-3 rounded-lg bg-sunken/60 p-3 sm:grid-cols-2">
      <div className="space-y-2">
        <input aria-label="Service name" placeholder="Work description (min 5 characters)" value={fo.name} onChange={(e) => setFo({ ...fo, name: e.target.value })} className="input" />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Hours" value={fo.hours} onChange={(e) => setFo({ ...fo, hours: e.target.value })} className="input">{Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i} h</option>)}</select>
          <select aria-label="Minutes" value={fo.minutes} onChange={(e) => setFo({ ...fo, minutes: e.target.value })} className="input">{[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
        </div>
        <button disabled={pending || fo.name.trim().length < 5 || price < 1} onClick={onLabour} className="btn btn-secondary w-full">Add labour · {gbp(price)}</button>
      </div>
      <div className="space-y-2">
        <input aria-label="Part name" placeholder="Part name" value={fo.part} onChange={(e) => setFo({ ...fo, part: e.target.value })} className="input" />
        <input aria-label="Part price" inputMode="decimal" placeholder="Price £" value={fo.partPrice} onChange={(e) => setFo({ ...fo, partPrice: e.target.value })} className="input" />
        <button disabled={pending || !fo.part.trim() || Number(fo.partPrice) < 1} onClick={onPart} className="btn btn-secondary w-full">Add part</button>
      </div>
    </div>
  );
}
