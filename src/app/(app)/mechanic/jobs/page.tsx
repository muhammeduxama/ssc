import Link from "next/link";
import { JobList } from "@/components/mechanic/JobList";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { myJobs } from "@/lib/mechanic/jobs";

export const metadata = { title: "Current jobs" };
export default async function CurrentJobs() {
  const s = await requireRole("mechanic");
  const rows = await myJobs(s.id, "assigned");
  return (
    <>
      <PageHeader eyebrow={`${rows.length} booked`} title="Current jobs"><Link href="/mechanic/jobs/previous" className="btn btn-secondary">Previous jobs</Link></PageHeader>
      <JobList rows={rows} empty="No jobs booked right now" />
    </>
  );
}
