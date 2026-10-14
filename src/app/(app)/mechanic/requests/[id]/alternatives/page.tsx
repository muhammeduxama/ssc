import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposeAlternatives } from "@/components/mechanic/Alternatives";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { jobRequest } from "@/lib/mechanic/jobs";

export const metadata = { title: "Offer other times" };

/** Mechanic\HomeController@alternativeSlots (/offer/customer/{order}/alternative) */
export default async function Alternatives({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("mechanic");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await jobRequest(s.id, Number(id));
  if (!r) notFound();
  return (
    <>
      <Link href={`/mechanic/requests/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Back to the request</Link>
      <PageHeader eyebrow={`Booking #${r.order.id}`} title="Offer the customer other times" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">None of the customer’s slots work? Propose alternatives — they’ll get an email to choose one and the job will be booked with you.</p>
      <ProposeAlternatives id={r.id} />
    </>
  );
}
