import { PasswordForm } from "@/components/PasswordForm";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Change password" };
export default async function MechanicPassword() {
  await requireRole("mechanic");
  return (<><PageHeader eyebrow="Profile" title="Change password" description="Update the password you use to sign in to your workspace." /><div className="mech-security-layout"><PasswordForm /><aside className="mech-security-note"><h2>Protect your workspace</h2><p>Choose a unique password with at least eight characters. Changing it signs out your other devices.</p><p>Your jobs, messages and customer information stay protected behind your account.</p></aside></div></>);
}
