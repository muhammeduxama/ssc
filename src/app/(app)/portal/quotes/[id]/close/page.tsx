import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { closeQuoteForm } from "@/app/actions/portal";
import { ActionForm } from "@/components/portal/ActionForm";
import { CloseQuoteFields } from "@/components/portal/CloseQuoteFields";
import { PageHeader } from "@/components/ui";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Change or close quote" };

/** PortalController@modifyQuote — "I want to change / close my quote". */
export default async function CloseQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await currentCustomer())!;
  const o = /^\d+$/.test(id) ? await db.orders.findFirst({ where: { id: BigInt(id), user_id: me.id, order_for: "repairs" }, include: { orderassigns: { take: 1 } } }) : null;
  if (!o || o.orderassigns.length) redirect("/portal/quotes");
  return (
    <>
      <PageHeader eyebrow={`Request #${o.id}`} title="Message SSC regarding your quote" />
      <div className="card max-w-2xl p-6">
        <p className="mb-4 text-sm text-muted">Tell us why you want to change or close this quote. Submitting closes the quote and lets the mechanics know.</p>
        <ActionForm action={closeQuoteForm.bind(null, Number(o.id))} submit="Send" confirmText="Close this quote?">
          <CloseQuoteFields />
        </ActionForm>
      </div>
    </>
  );
}
