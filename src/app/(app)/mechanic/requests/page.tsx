import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { WorkList } from "@/components/mechanic/WorkList";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { jobRequests } from "@/lib/mechanic/jobs";
export const metadata = { title: "Job requests" };
export default async function Requests() {
  const s = await requireRole("mechanic");
  const rows = await jobRequests(s.id);
  return <>
    <PageHeader eyebrow="Opportunities" title="Job requests" description="Find your next job. Compare the work, location and earnings before choosing a visit time."><Link className="btn btn-secondary" href="/mechanic/jobs"><CalendarClock size={16}/> Current jobs</Link></PageHeader>
    <WorkList mode="requests" empty="No new job requests" items={rows.map(r => ({ id: r.id, orderId: r.orderId, href: `/mechanic/requests/${r.id}`, car: r.car, reg: r.reg, work: r.work.join(", ") || r.service, location: [r.city, r.postcode].filter(Boolean).join(" · "), miles: r.miles, amount: r.net, amountLabel: "You earn", status: "pending", date: r.created, schedule: r.slots ? `${r.slots} preferred visit times` : "Visit time to be arranged" }))}/>
  </>;
}
