import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Recent activity" };

/** HomeController@recents: latest resolution cases, chat messages and support messages. */
export default async function Recents() {
  await requireStaff();
  const [cases, messages, support] = await Promise.all([
    db.ordermessages.findMany({ orderBy: { id: "desc" }, take: 10 }),
    db.resolutions.findMany({ orderBy: { id: "desc" }, take: 10, include: { users_resolutions_sender_idTousers: { select: { fname: true, lname: true, company: true } } } }),
    db.adminresolutions.findMany({ orderBy: { id: "desc" }, take: 10, include: { users: { select: { fname: true, lname: true, company: true } } } }),
  ]);
  const Card = ({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) => (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-5 py-3 font-display text-base font-semibold">{title}</h2>
      {empty ? <p className="px-5 py-4 text-sm text-muted">Nothing yet.</p> : <ul className="divide-y divide-line">{children}</ul>}
    </section>
  );
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Recent activity" />
      {cases.length + messages.length + support.length === 0 ? <Empty title="No recent activity" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card title="Resolution cases" empty={!cases.length}>
            {cases.map((c) => (
              <li key={String(c.id)} className="px-5 py-3 text-sm">
                <div className="flex justify-between gap-2"><Link href={`/admin/orders/view/${c.order_id}`} className="font-semibold text-brand hover:underline">Order #{String(c.order_id)}</Link><span className="font-mono text-xs text-muted">{dateTime(c.created_at)}</span></div>
                <div className="font-medium">{c.subject}</div>
                {(c.option_one || c.option_two) && <div className="text-xs text-muted">{[c.option_one, c.option_two].filter(Boolean).join(" · ")}</div>}
                <p className="mt-1 line-clamp-2 text-muted">{c.message}</p>
              </li>
            ))}
          </Card>
          <Card title="Customer ↔ mechanic messages" empty={!messages.length}>
            {messages.map((m) => { const u = m.users_resolutions_sender_idTousers; return (
              <li key={String(m.id)} className="px-5 py-3 text-sm">
                <div className="flex justify-between gap-2"><Link href={`/admin/orders/view/${m.order_id}?tab=chat`} className="font-semibold text-brand hover:underline">Order #{String(m.order_id)}</Link><span className="font-mono text-xs text-muted">{dateTime(m.created_at)}</span></div>
                <div className="text-xs text-muted">{m.admin ? "Smart Servicing Centre" : u.company || `${u.fname} ${u.lname}`}</div>
                <p className="line-clamp-2">{m.message || (m.file ? "Attachment" : "")}</p>
              </li>
            ); })}
          </Card>
          <Card title="Support messages" empty={!support.length}>
            {support.map((m) => (
              <li key={String(m.id)} className="px-5 py-3 text-sm">
                <div className="flex justify-between gap-2"><Link href={`/messages?thread=${m.order_id}:s:${m.user_id}`} className="font-semibold text-brand hover:underline">Order #{String(m.order_id)}</Link><span className="font-mono text-xs text-muted">{dateTime(m.created_at)}</span></div>
                <div className="text-xs text-muted">{m.sender === "admin" ? "You" : m.users.company || `${m.users.fname} ${m.users.lname}`}</div>
                <p className="line-clamp-2">{m.message || (m.file ? "Attachment" : "")}</p>
              </li>
            ))}
          </Card>
        </div>
      )}
    </>
  );
}
