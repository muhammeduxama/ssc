"use client";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseAlternative, proposeAlternatives } from "@/app/actions/alternatives";
import { useToast } from "@/components/Toast";
import { TIME_SLOTS } from "@/lib/time";

export function ProposeAlternatives({ id }: { id: number }) {
  const [rows, setRows] = useState([{ date: "", time: TIME_SLOTS[0] }]);
  const [agreed, setAgreed] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="card max-w-2xl space-y-4 p-6">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input type="date" min={today} aria-label="Date" value={r.date} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className="input" />
          <select aria-label="Time" value={r.time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} className="input">{TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}</select>
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove" className="btn btn-secondary !px-3"><X size={16} /></button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { date: "", time: TIME_SLOTS[0] }])} className="btn btn-ghost !px-2 !py-1 !text-xs"><Plus size={14} /> Add another option</button>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" /> I will be available at every option I propose, and the customer can confirm any of them.</label>
      <button disabled={pending} onClick={() => start(async () => { const r = await proposeAlternatives(id, rows, agreed); toast(r.message, r.ok); if (r.ok && r.link) router.push(r.link); })} className="btn btn-primary w-full">Send alternatives to the customer</button>
    </div>
  );
}

export function ChooseAlternative({ token, id, options, company }: { token: string; id: number; options: { date: string; times: { time: string }[] }[]; company: string }) {
  const [pick, setPick] = useState<{ date: string; time: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (done) return <div className="card p-8 text-center"><h2 className="font-display text-xl font-semibold">{done}</h2></div>;
  return (
    <div className="card space-y-4 p-6">
      <p className="text-sm text-muted">{company} suggested these times. Choose the one that suits you.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.flatMap((d) => d.times.map((t) => (
          <button key={`${d.date}${t.time}`} onClick={() => setPick({ date: d.date, time: t.time })} aria-pressed={pick?.date === d.date && pick.time === t.time} className={`rounded-lg border px-4 py-3 text-left text-sm transition ${pick?.date === d.date && pick.time === t.time ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong"}`}>
            <div className="font-semibold">{d.date}</div><div className="text-muted">{t.time}</div>
          </button>
        )))}
      </div>
      <button disabled={pending || !pick} onClick={() => pick && start(async () => { const r = await chooseAlternative(token, id, pick.date, pick.time); toast(r.message, r.ok); if (r.ok) setDone(r.message); })} className="btn btn-primary w-full">Confirm this time</button>
    </div>
  );
}
