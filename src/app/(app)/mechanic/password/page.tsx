import { PasswordForm } from "@/components/PasswordForm";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Change password" };
export default async function MechanicPassword() {
  await requireRole("mechanic");
  return (<><PageHeader eyebrow="Profile" title="Change password" description="Update the password you use to sign in to your workspace." /><PasswordForm /></>);
}
