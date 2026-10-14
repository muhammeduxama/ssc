import { MapPin } from "lucide-react";
import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { dateTime, gbp } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { jobRequests } from "@/lib/mechanic/jobs";

export const metadata = { title: "Job requests" };

export default async function Requests() {
  const s = await requireRole("mechanic");
  const rows = await jobRequests(s.id);
  return (
    <>
      <PageHeader eyebrow={`${rows.length} waiting`} title="Job requests" />
      {rows.length === 0 ? <Empty title="No new job requests" body="We’ll email you as soon as a customer near you books a service." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/mechanic/requests/${r.id}`} className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-muted">Booking #{r.orderId}</div>
                  <div className="font-display text-lg font-semibold">{r.car}</div>
                </div>
                <span className="rounded border border-ink/20 bg-[#f7ce35] px-1.5 py-0.5 font-mono text-xs font-semibold text-black">{r.reg}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{r.work.join(", ") || r.service}</p>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-1 text-xs text-muted"><MapPin size={14} /> {r.city} · {r.postcode} · {r.miles} mi</div>
                <div className="text-right"><div className="font-display text-2xl font-medium text-brand">{gbp(r.net)}</div><div className="font-mono text-[10px] uppercase tracking-wider text-muted">you earn</div></div>
              </div>
              <div className="mt-3 border-t border-line pt-2 font-mono text-[11px] text-muted">{r.slots} slots offered · {dateTime(r.created)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
