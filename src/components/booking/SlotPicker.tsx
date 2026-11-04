"use client";
import { Check, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTimeSlot, TIME_SLOTS } from "@/lib/time";

export type Slot = { date: string; time: string };
// Stored values stay compatible with existing booking records and server validation.
const TIMES = TIME_SLOTS;
const DISPLAY = TIMES.map(formatTimeSlot);
const START = [8,10,12,14,16,18];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const label = (d:Date)=>`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const PER_PAGE=7;

export function SlotPicker({value,onChange,maxDays=60}:{value:Slot[];onChange:(s:Slot[])=>void;maxDays?:number}) {
  const [page,setPage]=useState(0);
  const [dayIndex,setDayIndex]=useState(0);
  const now=new Date();
  const days=useMemo(()=>{
    const base=new Date();base.setHours(0,0,0,0);
    return Array.from({length:Math.min(PER_PAGE,Math.max(0,maxDays-page*PER_PAGE))},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+page*PER_PAGE+i);return d;});
  },[page,maxDays]);
  if(!days.length) return <p className="text-sm text-muted">No appointment dates are available.</p>;
  const active=days[Math.min(dayIndex,days.length-1)];
  const id=label(active);
  const has=(s:Slot)=>value.some(v=>v.date===s.date&&v.time===s.time);
  const past=(d:Date,i:number)=>{const t=new Date(d);t.setHours(START[i],0,0,0);return t.getTime()<=now.getTime();};
  const toggle=(s:Slot)=>onChange(has(s)?value.filter(v=>!(v.date===s.date&&v.time===s.time)):[...value,s]);
  const open=TIMES.filter((_,i)=>!past(active,i)).map(time=>({date:id,time}));
  const all=open.length>0&&open.every(has);
  return <div className="booking-calendar">
    <div className="booking-calendar-nav"><button type="button" disabled={page===0} onClick={()=>{setPage(p=>p-1);setDayIndex(0);}} aria-label="Previous week"><ChevronLeft size={18}/></button><strong>{days[0].getDate()} {MONTHS[days[0].getMonth()]} – {days[days.length-1].getDate()} {MONTHS[days[days.length-1].getMonth()]} {days[days.length-1].getFullYear()}</strong><button type="button" disabled={(page+1)*PER_PAGE>=maxDays} onClick={()=>{setPage(p=>p+1);setDayIndex(0);}} aria-label="Next week"><ChevronRight size={18}/></button></div>
    <div className="booking-date-strip" aria-label="Choose an available date">{days.map((d,i)=><button key={label(d)} type="button" aria-pressed={label(d)===id} onClick={()=>setDayIndex(i)} className={label(d)===id?"is-active":""}><span>{DAYS[d.getDay()].slice(0,3)}</span><strong>{d.getDate()}</strong><span>{MONTHS[d.getMonth()]}</span>{value.some(v=>v.date===label(d))&&<Check size={12} className="booking-date-check" aria-label="Has selected times"/>}</button>)}</div>
    <div className="booking-time-heading"><h3><Clock3 size={16}/>{DAYS[active.getDay()]} arrival windows</h3>{open.length>0&&<button type="button" onClick={()=>onChange(all?value.filter(v=>v.date!==id):[...value.filter(v=>v.date!==id),...open])}>{all?"Clear this day":"Select all times"}</button>}</div>
    <div className="booking-time-grid">{TIMES.map((time,i)=><button key={time} type="button" disabled={past(active,i)} aria-pressed={has({date:id,time})} onClick={()=>toggle({date:id,time})} className={has({date:id,time})?"is-selected":""}>{DISPLAY[i]}{has({date:id,time})&&<Check size={14}/>}</button>)}</div>
    <p className="booking-slot-count" aria-live="polite">{value.length?`${value.length} arrival window${value.length===1?"":"s"} selected across ${new Set(value.map(v=>v.date)).size} day${new Set(value.map(v=>v.date)).size===1?"":"s"}`:"Choose one or more times that work for you."}</p>
    {value.length>0&&<ul className="booking-selected-slots">{value.map(v=><li key={`${v.date}-${v.time}`}><span>{v.date.replace(/ \d{4}$/,"")} · {DISPLAY[TIMES.indexOf(v.time)]??v.time}</span><button type="button" onClick={()=>toggle(v)} aria-label={`Remove ${v.date} ${v.time}`}><X size={13}/></button></li>)}</ul>}
  </div>;
}
