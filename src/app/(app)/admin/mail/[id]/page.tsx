import { ArrowLeft, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

/** MailController@show / @downloadFile */
export default async function ShowMail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const e = await db.emails.findUnique({ where: { id: BigInt(id) }, include: { emailfiles: true } });
  if (!e) notFound();
  return (
    <>
      <Link href="/admin/mail" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Sent</Link>
      <PageHeader eyebrow={dateTime(e.created_at)} title={e.subject || "(no subject)"} />
      <div className="card p-6">
        <p className="mb-4 text-sm text-muted">To: <b className="text-ink">{e.to}</b></p>
        <div className="prose-content border-t border-line pt-4" dangerouslySetInnerHTML={{ __html: e.message ?? "" }} />
        {e.emailfiles.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="label">Attachments</div>
            <ul className="flex flex-wrap gap-2">{e.emailfiles.map((f) => <li key={String(f.id)}><a href={asset(f.src)} download={`SSC.${f.type}`} className="btn btn-secondary !py-1.5 !text-xs"><Paperclip size={14} /> SSC.{f.type}</a></li>)}</ul>
          </div>
        )}
      </div>
    </>
  );
}
