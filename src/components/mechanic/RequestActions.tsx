"use client";
import { CalendarCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptJob, rejectJob } from "@/app/actions/mechanic-jobs";
import { useToast } from "@/components/Toast";
import { Modal } from "./Modal";

export function RequestActions({ id, schedule, blocked }: { id: number; schedule: { date: string; times: { id: number; time: string }[] }[]; blocked?: string }) {
  const [date, setDate] = useState(schedule[0]?.date ?? "");
  const [slot, setSlot] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const times = schedule.find((s) => s.date === date)?.times ?? [];

  return (
    <section className="card p-6">
      <h2 className="font-display text-lg font-semibold">Schedule the visit</h2>
      <p className="mt-1 text-sm text-muted">When will you / should the customer arrive? Pick one of the customer’s preferred slots.</p>
      {blocked && <p className="mt-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm">{blocked}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="d" className="label">Date</label>
          <select id="d" value={date} onChange={(e) => { setDate(e.target.value); setSlot(""); }} className="input">
            {schedule.map((s) => <option key={s.date}>{s.date}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t" className="label">Time</label>
          <select id="t" value={slot} onChange={(e) => setSlot(e.target.value)} className="input">
            <option value="">Select time</option>
            {times.map((t) => <option key={t.id} value={t.id}>{t.time}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <a href={`/mechanic/requests/${id}/alternatives`} className="btn btn-secondary">Offer other times</a>
        <button onClick={() => setRejecting(true)} className="btn btn-secondary !text-danger"><XCircle size={16} /> I can’t do this job</button>
        <button
          disabled={pending || !slot}
          onClick={() => {
            if (!confirm("Are you sure you want to accept this job?")) return;
            start(async () => {
              const r = await acceptJob(id, Number(slot));
              toast(r.message, r.ok);
              if (r.link) router.push(r.link);
            });
          }}
          className="btn btn-primary"
        >
          <CalendarCheck size={16} /> Accept job
        </button>
      </div>
      <Modal busy={pending} open={rejecting} onClose={() => setRejecting(false)} title="Why can’t you carry out this job?">
        <textarea autoFocus rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Minimum 5 characters" className="input" aria-label="Reason" />
        <button
          disabled={pending || reason.trim().length < 5}
          onClick={() => start(async () => { const r = await rejectJob(id, reason); toast(r.message, r.ok); if (r.ok) router.push("/mechanic/requests"); })}
          className="btn btn-primary mt-3 w-full"
        >
          Submit reason
        </button>
      </Modal>
    </section>
  );
}
