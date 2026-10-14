import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobWorkspace } from "@/components/mechanic/JobWorkspace";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { jobWorkspace } from "@/lib/mechanic/jobs";

export const metadata = { title: "Job" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("mechanic");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const j = await jobWorkspace(s.id, Number(id));
  if (!j) notFound();
  return (
    <>
      <Link href={j.status === "assigned" ? "/mechanic/jobs" : "/mechanic/jobs/previous"} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> {j.status === "assigned" ? "Current jobs" : "Previous jobs"}</Link>
      <PageHeader eyebrow={`Booking #${j.order.id} · ${j.order.service}`} title={j.carTitle}>
        <StatusBadge status={j.status} />
      </PageHeader>
      <JobWorkspace j={j} supportThread={`${j.order.id}:s:${s.id}`} customerThread={`${j.order.id}:p:${j.customer.id}`} />
    </>
  );
}
