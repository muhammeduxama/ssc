import { PenLine } from "lucide-react";
import Link from "next/link";
import { SentList } from "@/components/tools/MailTools";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Sent email" };

/** MailController@general (15 per page) */
export default async function Sent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, count] = await Promise.all([
    db.emails.findMany({ orderBy: { id: "desc" }, take: 15, skip: (page - 1) * 15, include: { _count: { select: { emailfiles: true } } } }),
    db.emails.count(),
  ]);
  const pages = Math.max(1, Math.ceil(count / 15));
  return (
    <>
      <PageHeader eyebrow={`Mailbox · ${count}`} title="Sent">
        <div className="flex gap-2">
          <Link href="/admin/mail/join-network" className="btn btn-secondary">Join network invite</Link>
          <Link href="/admin/mail/compose" className="btn btn-primary"><PenLine size={16} /> Compose</Link>
        </div>
      </PageHeader>
      {rows.length === 0 ? <Empty title="No emails sent yet" /> : <SentList rows={rows.map((r) => ({ id: Number(r.id), subject: r.subject ?? "", to: r.to, at: r.created_at?.toISOString() ?? null, files: r._count.emailfiles }))} />}
      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          {page > 1 && <Link href={`/admin/mail?page=${page - 1}`} className="btn btn-secondary !py-1.5">Newer</Link>}
          {page < pages && <Link href={`/admin/mail?page=${page + 1}`} className="btn btn-secondary !py-1.5">Older</Link>}
        </div>
      )}
    </>
  );
}
