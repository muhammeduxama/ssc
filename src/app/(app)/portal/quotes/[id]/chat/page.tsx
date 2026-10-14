import { Paperclip } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sendQuoteChat } from "@/app/actions/portal";
import { ActionForm } from "@/components/portal/ActionForm";
import { PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Messages with SSC" };

/** PortalController@showMessage / @quoteChat — the customer side of the SSC quote chat (quotechats). */
export default async function QuoteChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await currentCustomer())!;
  const o = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), user_id: me.id }, include: { quotechats: { orderBy: { id: "asc" } } } }) : null;
  if (!o) redirect("/portal/quotes");
  return (
    <>
      <PageHeader eyebrow={`Quote #${o.id}`} title="Messages with Smart Servicing Centre" />
      <div className="card flex max-w-3xl flex-col">
        <ol className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          {o.quotechats.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
          {o.quotechats.map((m) => {
            const mine = m.sender === "customer";
            return (
              <li key={String(m.id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-brand text-on-brand" : "bg-sunken"}`}>
                  {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                  {m.file && <a href={asset(m.file)} target="_blank" className="mt-1 flex items-center gap-1 underline"><Paperclip size={12} /> Attachment</a>}
                  <div className={`mt-1 text-[10px] ${mine ? "opacity-75" : "text-muted"}`}>{mine ? "You" : "SSC"} · {dateTime(m.created_at)}</div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-line p-4">
          <ActionForm action={sendQuoteChat.bind(null, Number(o.id))} submit="Send" reset className="space-y-3">
            <label className="sr-only" htmlFor="qc-msg">Message</label>
            <textarea id="qc-msg" name="message" rows={3} placeholder="Write a message…" className="input" />
            <input type="file" name="file" aria-label="Attach a file" className="block text-sm" />
          </ActionForm>
        </div>
      </div>
    </>
  );
}
