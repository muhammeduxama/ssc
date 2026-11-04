import { ActivityFeed, type ActivityItem } from "@/components/admin/ActivityFeed";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
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
  const items: ActivityItem[] = [
    ...cases.map((c) => ({ id: `case-${c.id}`, kind: "case" as const, title: c.subject || `Case for booking #${c.order_id}`, author: `Booking #${c.order_id} · ${[c.option_one, c.option_two].filter(Boolean).join(" · ") || "Customer request"}`, text: c.message ?? "", at: c.created_at?.toISOString() ?? null, href: `/admin/orders/view/${c.order_id}` })),
    ...messages.map((m) => ({ id: `message-${m.id}`, kind: "message" as const, title: `Booking #${m.order_id}`, author: m.admin ? "Smart Servicing Centre" : m.users_resolutions_sender_idTousers.company || `${m.users_resolutions_sender_idTousers.fname} ${m.users_resolutions_sender_idTousers.lname}`, text: m.message || (m.file ? "Attachment received" : ""), at: m.created_at?.toISOString() ?? null, href: `/admin/orders/view/${m.order_id}?tab=chat` })),
    ...support.map((m) => ({ id: `support-${m.id}`, kind: "support" as const, title: `Support for booking #${m.order_id}`, author: m.sender === "admin" ? "Smart Servicing Centre" : m.users.company || `${m.users.fname} ${m.users.lname}`, text: m.message || (m.file ? "Attachment received" : ""), at: m.created_at?.toISOString() ?? null, href: `/messages?thread=${m.order_id}:s:${m.user_id}` })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "") || b.id.localeCompare(a.id));
  return <>
    <PageHeader eyebrow="Workspace" title="Recent activity" description="The latest cases, booking conversations and support messages in one timeline." />
    <ActivityFeed items={items} />
  </>;
}
