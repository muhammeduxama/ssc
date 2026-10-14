"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export type Slot = { date: string; time: string };
const TIMES = ["8-10 AM", "10-12 AM", "12-02 PM", "02-04 PM", "04-06 PM", "06-08 PM"];
const START = [8, 10, 12, 14, 16, 18];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Same string the Laravel calendar stored: "Friday 9 Apr 2021". */
const label = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const PER_PAGE = 7;

/** custom_calender.js: pick every date/time window you're available, past windows disabled. */
export function SlotPicker({ value, onChange, maxDays = 60 }: { value: Slot[]; onChange: (s: Slot[]) => void; maxDays?: number }) {
  const [page, setPage] = useState(0);
  const now = new Date();
  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: PER_PAGE }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + page * PER_PAGE + i);
      return d;
    });
  }, [page]);
  const has = (s: Slot) => value.some((v) => v.date === s.date && v.time === s.time);
  const toggle = (s: Slot) => onChange(has(s) ? value.filter((v) => !(v.date === s.date && v.time === s.time)) : [...value, s]);
  const past = (d: Date, i: number) => {
    const t = new Date(d);
    t.setHours(START[i], 0, 0, 0);
    return t.getTime() <= now.getTime();
  };
  const toggleDay = (d: Date) => {
    const id = label(d);
    const open = TIMES.filter((_, i) => !past(d, i)).map((time) => ({ date: id, time }));
    const all = open.every(has);
    onChange(all ? value.filter((v) => v.date !== id) : [...value.filter((v) => v.date !== id), ...open]);
  };
  const selectedDays = new Set(value.map((v) => v.date)).size;
  const first = days[0];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-secondary !px-3 !py-1.5"><ChevronLeft size={16} /> Prev</button>
        <span className="font-display font-semibold">{first.getDate()} {MONTHS[first.getMonth()]} {first.getFullYear()}</span>
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PER_PAGE >= maxDays} className="btn btn-secondary !px-3 !py-1.5">Next <ChevronRight size={16} /></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const id = label(d);
          const allPast = TIMES.every((_, i) => past(d, i));
          return (
            <div key={id} className={`rounded-xl border border-line p-2 ${allPast ? "opacity-50" : ""}`}>
              <button type="button" disabled={allPast} onClick={() => toggleDay(d)} className="w-full rounded-md py-1 text-center hover:bg-sunken disabled:cursor-not-allowed" title="Select the whole day">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{DAYS[d.getDay()].slice(0, 3)}</div>
                <div className="font-display font-semibold">{d.getDate()} {MONTHS[d.getMonth()]}</div>
              </button>
              <div className="mt-1 grid gap-1">
                {TIMES.map((time, i) => {
                  const on = has({ date: id, time });
                  return (
                    <button key={time} type="button" disabled={past(d, i)} aria-pressed={on} onClick={() => toggle({ date: id, time })} className={`rounded-md border px-1 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-brand bg-brand text-on-brand" : "border-line hover:border-brand"}`}>
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-medium" aria-live="polite">You have selected {selectedDays} day{selectedDays === 1 ? "" : "s"}{value.length ? ` · ${value.length} time slot${value.length === 1 ? "" : "s"}` : ""}</p>
    </div>
  );
}
