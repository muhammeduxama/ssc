import type { myJobs } from "@/lib/mechanic/jobs";
import { WorkList } from "./WorkList";
export function JobList({ rows, empty, completed = false }: { rows: Awaited<ReturnType<typeof myJobs>>; empty: string; completed?: boolean }) {
  return <WorkList mode={completed ? "previous" : "current"} empty={empty} items={rows.map(j => ({
    id: j.id, orderId: j.orderId, href: `/mechanic/jobs/${j.id}`, car: j.car, reg: j.reg,
    work: j.work.join(", "), customer: j.customer, location: [j.city, j.postcode].filter(Boolean).join(" · "),
    amount: j.price, amountLabel: "Booking value", status: completed ? "completed" : "assigned",
    timestamp: j.startAt, schedule: j.date ? [j.date, j.time].filter(Boolean).join(" · ") : "Visit time to be arranged",
    note: j.followOn ? `Follow-on quote: ${j.followOn.status}` : undefined,
  }))}/>;
}
