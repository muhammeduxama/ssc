import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/mechanic/ProfileEditor";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { ACCREDITATIONS, NOTIFY_PREFS, QUALIFICATIONS, getMechanicProfile } from "@/lib/mechanic/profile";

export const metadata = { title: "My profile" };

export default async function MyProfile() {
  const s = await requireRole("mechanic");
  const p = await getMechanicProfile(Number(s.id));
  if (!p) notFound();
  return (
    <>
      <PageHeader eyebrow="Your business" title="My profile" description="Keep your business details, qualifications and coverage up to date." />
      <nav className="mech-profile-nav" aria-label="Profile sections"><a href="#profile-edit-profile">Business details</a><a href="#profile-qualifications-accreditations">Qualifications</a><a href="#profile-upload-documents">Upload documents</a><a href="#profile-preferences">Notifications</a><a href="#profile-types-of-work-covered">Work categories</a></nav>
      <ProfileEditor p={p} staff={false} opts={{ qualifications: QUALIFICATIONS, accreditations: ACCREDITATIONS, prefs: NOTIFY_PREFS }} />
    </>
  );
}
