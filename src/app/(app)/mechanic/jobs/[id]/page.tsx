import { DetailPage, DetailHeader, DetailMetrics } from "@/components/DetailPage";
import { Car, MapPin, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { JobWorkspace } from "@/components/mechanic/JobWorkspace";
import { StatusBadge } from "@/components/ui";
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
    <DetailPage>
      <DetailHeader back={{ href: j.status === "assigned" ? "/mechanic/jobs" : "/mechanic/jobs/previous", label: j.status === "assigned" ? "Current jobs" : "Previous jobs" }} eyebrow={`Booking #${j.order.id} · ${j.order.service}`} title={j.carTitle}>
        <StatusBadge status={j.status} />
      </DetailHeader>
      <DetailMetrics items={[
        { label: "Vehicle", value: String(j.car.reg || "Registration not supplied"), icon: Car },
        { label: "Location", value: j.customer.postcode, hint: j.customer.city, icon: MapPin },
        { label: "Visit", value: j.date ? `${j.date} ${j.time || ""}` : "Not scheduled", icon: CalendarClock },
      ]}/>
      <JobWorkspace j={j} supportThread={`${j.order.id}:s:${s.id}`} customerThread={`${j.order.id}:p:${j.customer.id}`} />
    </DetailPage>
  );
}
