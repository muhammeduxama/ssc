import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, FileText, Wrench } from "lucide-react";
import Link from "next/link";
import { JobList } from "@/components/mechanic/JobList";
import { Kpi, PageHeader } from "@/components/ui";
import { jobRequests, mechanicHome, myJobs, quoteRequests } from "@/lib/mechanic/jobs";

export async function MechanicDashboard({ id, name }: { id: string; name: string }) {
  const [h, current, requests, quotes] = await Promise.all([mechanicHome(id), myJobs(id, "assigned"), jobRequests(id), quoteRequests(id)]);
  return (
    <>
      <PageHeader eyebrow="Mechanic overview" title={`Hello, ${name.split(" ")[0]}`}>
        <Link href="/mechanic/requests" className="btn btn-primary"><BellRing size={16} /> Job requests ({requests.length})</Link>
      </PageHeader>
      {!h.active && <p className="mb-4 flex items-center gap-2 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm"><AlertTriangle size={16} /> Your account is waiting for approval by Smart Servicing Centre.</p>}
      {!h.docsUploaded ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm"><AlertTriangle size={16} /> Upload your required documents before you can accept jobs. <Link href="/mechanic/profile" className="font-semibold underline">Upload now</Link></p>
      ) : !h.docsApproved ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-sunken px-4 py-3 text-sm"><FileText size={16} /> Your documents are waiting for approval.</p>
      ) : null}
      {!h.stripeConnected && <p className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-sunken px-4 py-3 text-sm"><AlertTriangle size={16} /> Connect Stripe to get paid for jobs. <Link href="/mechanic/payments" className="font-semibold underline">Connect</Link></p>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="MOT / service requests" value={h.requests} icon={BellRing} tone="accent" hint="Waiting for you to accept" />
        <Kpi label="Repair quote requests" value={quotes.length} icon={FileText} hint="Customers asking for a price" />
        <Kpi label="In progress" value={h.progress} icon={CalendarClock} hint="Assigned jobs" />
        <Kpi label="Completed" value={h.completed} icon={CheckCircle2} hint="Finished jobs" />
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Current jobs</h2><Link href="/mechanic/jobs" className="text-sm font-semibold text-brand hover:underline">See all →</Link></div>
        <JobList rows={current.slice(0, 6)} empty="No jobs booked right now" />
      </section>
      {requests.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">New job requests</h2><Link href="/mechanic/requests" className="text-sm font-semibold text-brand hover:underline">See all →</Link></div>
          <ul className="card divide-y divide-line">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id}><Link href={`/mechanic/requests/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-sunken"><Wrench size={18} className="text-brand" /><span className="flex-1"><b>{r.car}</b> · {r.work.join(", ")}</span><span className="font-mono text-xs text-muted">{r.postcode} · {r.miles} mi</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
