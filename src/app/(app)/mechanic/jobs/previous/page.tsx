import Link from "next/link";
import { JobList } from "@/components/mechanic/JobList";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { myJobs } from "@/lib/mechanic/jobs";

export const metadata = { title: "Previous jobs" };
export default async function PreviousJobs() {
  const s = await requireRole("mechanic");
  const rows = await myJobs(s.id, "completed");
  return (
    <>
      <PageHeader eyebrow={`${rows.length} completed`} title="Previous jobs"><Link href="/mechanic/jobs" className="btn btn-secondary">Current jobs</Link></PageHeader>
      <p className="-mt-4 mb-6 text-sm text-muted">Open a job to send the customer a follow-on quote.</p>
      <JobList rows={rows} empty="No completed jobs yet" />
    </>
  );
}
