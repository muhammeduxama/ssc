import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MechanicRowActions, StatusToggle } from "@/components/admin/MechanicRowActions";
import { ProfileEditor } from "@/components/mechanic/ProfileEditor";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";
import { ACCREDITATIONS, NOTIFY_PREFS, QUALIFICATIONS, getMechanicProfile, serviceTypeLabel } from "@/lib/mechanic/profile";

export default async function AdminMechanic({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const p = await getMechanicProfile(Number(id));
  if (!p) notFound();
  const slug = `${(p.company || p.fname).replace(/\s+/g, "-")}_${p.id}`;
  return (
    <>
      <Link href="/admin/mechanics" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> All mechanics</Link>
      <PageHeader eyebrow={`Mechanic #${p.id} · ${serviceTypeLabel(p.serviceType || null)}`} title={p.company || `${p.fname} ${p.lname}`}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusToggle id={p.id} active={p.active} />
          <Link href={`/mechanic/show/${slug}`} target="_blank" className="btn btn-secondary"><ExternalLink size={16} /> Public profile</Link>
          <MechanicRowActions id={p.id} />
        </div>
      </PageHeader>
      <ProfileEditor p={p} staff opts={{ qualifications: QUALIFICATIONS, accreditations: ACCREDITATIONS, prefs: NOTIFY_PREFS }} />
    </>
  );
}
