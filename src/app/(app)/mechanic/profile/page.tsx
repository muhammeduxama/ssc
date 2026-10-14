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
      <PageHeader eyebrow="Profile" title="My profile" />
      <ProfileEditor p={p} staff={false} opts={{ qualifications: QUALIFICATIONS, accreditations: ACCREDITATIONS, prefs: NOTIFY_PREFS }} />
    </>
  );
}
