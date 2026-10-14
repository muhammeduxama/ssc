import { CalendarClock, MapPin } from "lucide-react";
import Link from "next/link";
import { Empty } from "@/components/ui";
import { gbp } from "@/lib/format";
import type { myJobs } from "@/lib/mechanic/jobs";

export function JobList({ rows, empty }: { rows: Awaited<ReturnType<typeof myJobs>>; empty: string }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((j) => (
        <Link key={j.id} href={`/mechanic/jobs/${j.id}`} className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-muted">Booking #{j.orderId}</div>
              <div className="font-display text-lg font-semibold">{j.car}</div>
              <div className="text-sm text-muted">{j.customer}</div>
            </div>
            <span className="rounded border border-ink/20 bg-[#f7ce35] px-1.5 py-0.5 font-mono text-xs font-semibold text-black">{j.reg}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm">{j.work.join(", ")}</p>
          <div className="mt-4 flex items-end justify-between gap-2 text-xs text-muted">
            <div className="space-y-1">
              <div className="flex items-center gap-1"><CalendarClock size={14} /> {j.time ? `${j.time} · ${j.date}` : "Visit not scheduled"}</div>
              <div className="flex items-center gap-1"><MapPin size={14} /> {j.city} · {j.postcode}</div>
            </div>
            <div className="font-display text-xl font-medium text-brand">{gbp(j.price)}</div>
          </div>
          {j.followOn && <div className="mt-3 border-t border-line pt-2 font-mono text-[11px] text-muted">Follow-on quote: {j.followOn.status} · {gbp(j.followOn.price)}</div>}
        </Link>
      ))}
    </div>
  );
}
