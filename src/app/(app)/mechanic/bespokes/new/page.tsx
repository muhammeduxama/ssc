import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewBespoke } from "@/components/mechanic/BespokeForms";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "New estimate" };
export default async function NewBespokePage() {
  await requireRole("mechanic");
  return (
    <>
      <Link href="/mechanic/bespokes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Bespoke quotes</Link>
      <PageHeader eyebrow="Bespoke quote" title="New estimate" />
      <NewBespoke />
    </>
  );
}
