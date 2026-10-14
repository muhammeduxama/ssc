import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Chat } from "@/components/Chat";
import { PageHeader } from "@/components/ui";
import { listThreads } from "@/lib/chat";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { thread } = await searchParams;
  const threads = await listThreads(s);
  return (
    <>
      <PageHeader eyebrow="Inbox" title="Messages" />
      <Chat initialThreads={threads} initialKey={thread} />
    </>
  );
}
