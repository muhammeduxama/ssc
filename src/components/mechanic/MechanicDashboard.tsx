import { ArrowRight, BellRing, CalendarClock, CheckCircle2, ClipboardList, FileCheck, FileText, MapPin, MessageSquare, PoundSterling, Wrench } from "lucide-react";
import Link from "next/link";
import { DashboardEmpty, DashboardPanel, DashboardRow, DashboardStat } from "@/components/Dashboard";
import { gbp } from "@/lib/format";
import { jobRequests, mechanicHome, myJobs, quoteRequests } from "@/lib/mechanic/jobs";

export async function MechanicDashboard({ id, name }: { id: string; name: string }) {
  const [h, current, requests, quotes] = await Promise.all([mechanicHome(id), myJobs(id, "assigned"), jobRequests(id), quoteRequests(id)]);
  const now = new Date().getTime();
  const upcoming = current.filter((j) => j.startAt && new Date(j.startAt).getTime() >= now).sort((a, b) => a.startAt!.localeCompare(b.startAt!))[0];
  const setup = [
    { title: "Account approval", complete: !!h.active, description: h.active ? "Your account is approved" : "Our team is reviewing your application", href: "/mechanic/profile" },
    { title: "Required documents", complete: h.docsApproved, description: h.docsApproved ? "Documents approved" : h.docsUploaded ? "Your documents are being reviewed" : "Upload the required documents", href: "/mechanic/documents" },
    { title: "Payment account", complete: h.stripeConnected, description: h.stripeConnected ? "Stripe is connected" : "Connect Stripe to receive payouts", href: "/mechanic/payments" },
  ];
  const complete = setup.filter((s) => s.complete).length;
  return <div className="mechanic-workspace dashboard-page">
    <header className="mech-hero"><div><p className="dashboard-kicker">MECHANIC WORKSPACE</p><h1>Ready for your next job, {name.split(" ")[0]}?</h1><p>Keep your work moving. Review opportunities, plan visits and stay connected.</p><span className="mech-account-state"><i/>{h.active ? "Account active" : "Account under review"} · {current.length} current {current.length === 1 ? "job" : "jobs"}</span></div><div className="mech-hero-actions"><Link href="/mechanic/requests" className="btn btn-primary"><BellRing size={16}/> Find work <ArrowRight size={15}/></Link><Link href="/mechanic/bespokes/new" className="btn btn-secondary"><FileText size={16}/> Create estimate</Link></div></header>
    <section aria-label="Work overview" className="dashboard-stats">
      <DashboardStat href="/mechanic/requests" label="Available jobs" value={requests.length} icon={BellRing} detail="Review booking requests" />
      <DashboardStat href="/mechanic/quote-requests" label="Quote requests" value={quotes.length} icon={FileText} detail="Customers need a price" />
      <DashboardStat href="/mechanic/jobs" label="Current jobs" value={current.length} icon={CalendarClock} detail="Manage accepted work" />
      <DashboardStat href="/mechanic/jobs/previous" label="Completed jobs" value={h.completed} icon={CheckCircle2} detail="View your work history" />
    </section>
    {complete < setup.length && <DashboardPanel title="Finish setting up your account" description={`${complete} of ${setup.length} steps complete. Get ready to accept work and receive payments.`}>
      <div className="dashboard-setup-grid">{setup.map((step) => <Link href={step.href} key={step.title} className="dashboard-setup-step"><span className={step.complete ? "text-ok" : "text-muted"}>{step.complete ? <CheckCircle2 size={21} /> : <FileCheck size={21} />}</span><span><strong>{step.title}</strong><span>{step.description}</span></span><ArrowRight size={15} className="shrink-0 text-muted" /></Link>)}</div>
    </DashboardPanel>}
    <div className="dashboard-columns">
      <section className="dashboard-appointment"><span className="dashboard-kicker"><CalendarClock size={16} /> Next scheduled job</span>
        {upcoming ? <><h2>{upcoming.car}</h2><p className="dashboard-appointment-date">{[upcoming.date, upcoming.time].filter(Boolean).join(" · ")}</p><dl><div><dt>Customer</dt><dd>{upcoming.customer}</dd></div><div><dt>Location</dt><dd>{upcoming.city} · {upcoming.postcode}</dd></div></dl><div className="dashboard-appointment-actions"><Link href={`/mechanic/jobs/${upcoming.id}`} className="btn btn-primary">Open job workspace <ArrowRight size={15} /></Link></div></> : <><h2>No upcoming visit scheduled</h2><p>{current.length ? "You have accepted jobs. Open your workspace to check or arrange the visit time." : "Explore local requests and find your next job."}</p><div className="dashboard-appointment-actions"><Link href={current.length ? "/mechanic/jobs" : "/mechanic/requests"} className="btn btn-primary">{current.length ? "Manage current jobs" : "Find your next job"}<ArrowRight size={15} /></Link></div></>}
      </section>
      <DashboardPanel title="Your workspace" description="The tools you need throughout the day.">
        <DashboardRow title="Messages" description="Stay in touch with customers and support" href="/messages" icon={MessageSquare} />
        <DashboardRow title="Estimates" description="Create and manage bespoke quotes" href="/mechanic/bespokes" icon={FileText} />
        <DashboardRow title="Payments" description="Manage your payment account" href="/mechanic/payments" icon={PoundSterling} />
      </DashboardPanel>
    </div>
    <div className="dashboard-columns">
      <DashboardPanel title="Current jobs" description="Accepted bookings that need your attention." href="/mechanic/jobs">
        {!current.length ? <DashboardEmpty icon={ClipboardList} title="No accepted jobs yet" description="Browse local requests to fill your schedule." href="/mechanic/requests" action="Browse requests" /> : <ul className="dashboard-job-list">{current.slice(0, 4).map((j) => <li key={j.id}><Link href={`/mechanic/jobs/${j.id}`}><span className="dashboard-row-icon"><Wrench size={18} /></span><span className="min-w-0 flex-1"><strong>{j.car}</strong><span>#{j.orderId} · {j.customer}</span><span>{[j.date, j.time].filter(Boolean).join(" · ") || "Visit time to be arranged"}</span></span><ArrowRight size={17} className="shrink-0 text-brand" /></Link></li>)}</ul>}
      </DashboardPanel>
      <DashboardPanel title="New opportunities" description="Review the work before accepting a request." href="/mechanic/requests">
        {!requests.length ? <DashboardEmpty icon={BellRing} title="You're up to date" description="New booking requests will appear here when available." href="/mechanic/quote-requests" action="Check quote requests" /> : <ul className="dashboard-job-list">{requests.slice(0, 4).map((r) => <li key={r.id}><Link href={`/mechanic/requests/${r.id}`}><span className="min-w-0 flex-1"><strong>{r.car}</strong><span>{r.work.join(", ") || "Service booking"}</span><span className="dashboard-job-location"><MapPin size={12} />{r.postcode} · {r.miles} mi</span></span><span className="shrink-0 text-right"><strong className="!text-brand">{gbp(r.net)}</strong><span>You earn</span></span></Link></li>)}</ul>}
      </DashboardPanel>
    </div>
  </div>;
}
