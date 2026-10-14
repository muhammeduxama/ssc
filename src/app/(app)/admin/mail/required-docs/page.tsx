import { DocMailForm } from "@/components/tools/SettingsForms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Required documents email" };
/** DocMailController@requiredDocuments / @store */
export default async function RequiredDocsMail() {
  await requireStaff();
  const d = await db.docmails.findFirst({ orderBy: { id: "desc" } });
  return (
    <>
      <PageHeader eyebrow="Mailbox" title="Required documents email" />
      <DocMailForm subject={d?.subject ?? ""} description={d?.description ?? ""} />
    </>
  );
}
