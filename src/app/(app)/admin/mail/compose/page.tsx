import Link from "next/link";
import { ComposeForm } from "@/components/tools/MailTools";
import { PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Compose email" };

/** MailController@compose (optionally from a saved template) */
export default async function Compose({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requireStaff();
  const t = (await searchParams).template;
  const [templates, tpl] = await Promise.all([
    db.emailtemplates.findMany({ orderBy: { id: "desc" }, select: { id: true, image: true } }),
    t && /^\d+$/.test(t) ? db.emailtemplates.findUnique({ where: { id: BigInt(t) } }) : null,
  ]);
  const html = tpl ? `<p><img src="${asset(tpl.image)}" alt="" style="max-width:100%"></p>${tpl.template}` : "";
  return (
    <>
      <PageHeader eyebrow="Mailbox" title="Compose" />
      {templates.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Start from a template:</span>
          {templates.map((x) => <Link key={String(x.id)} href={`/admin/mail/compose?template=${x.id}`} className={`pill ${String(x.id) === t ? "border-brand text-brand" : "border-line"}`}>Template #{String(x.id)}</Link>)}
        </div>
      )}
      <ComposeForm key={t ?? "blank"} initialHtml={html} />
    </>
  );
}
