import { JoinNetworkForm } from "@/components/tools/MailTools";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Join network invite" };
export default async function JoinNetwork() {
  await requireStaff();
  return (
    <>
      <PageHeader eyebrow="Mailbox" title="Join network invite" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Send the recruitment email to garages and mobile mechanics, inviting them to register.</p>
      <JoinNetworkForm />
    </>
  );
}
