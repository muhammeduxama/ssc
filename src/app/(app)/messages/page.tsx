import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Chat } from "@/components/Chat";
import { MessageSquare } from "lucide-react";
import { listThreads, resolveThread } from "@/lib/chat";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { thread } = await searchParams;
  const threads = await listThreads(s);
  if (thread && !threads.some((t) => t.key === thread)) {
    const selected = await resolveThread(s, thread);
    if (selected) threads.unshift(selected);
  }
  return (
    <section className="messages-page" aria-label="Messages">
      <header className="messages-heading"><div className="flex items-center gap-3"><span className="section-icon"><MessageSquare size={20} /></span><div><h1>Messages</h1><p>Your bookings and conversations, together.</p></div></div><span className="messages-count">{threads.length} conversation{threads.length === 1 ? "" : "s"}</span></header>
      <Chat key={thread ?? "inbox"} initialThreads={threads} initialKey={thread} role={s.role} />
    </section>
  );
}
