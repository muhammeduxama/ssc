import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceForm } from "@/components/crud/ResourceForm";
import { PageHeader } from "@/components/ui";
import { clientFields } from "@/lib/crud/engine";
import { getResource } from "@/lib/crud/registry";
import { requireStaff } from "@/lib/guard";
import { saveAction } from "../actions";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function NewPage({ params, searchParams }: Props) {
  const r = getResource((await params).resource);
  if (!r || r.canCreate === false) notFound();
  await requireStaff(r.adminOnly);
  const sp = await searchParams;
  const fields = await clientFields(r);
  // Prefill from query (?service_id=3) so parent-scoped pages open with the parent picked.
  const values: Record<string, string | number | boolean | null> = {};
  for (const f of r.fields) if (sp[f.name]) values[f.name] = sp[f.name]!;
  const scope = new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)])).toString();
  const back = `/admin/r/${r.slug}${scope ? `?${scope}` : ""}`;
  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> {r.title}
      </Link>
      <PageHeader eyebrow={r.group} title={`Add ${r.singular}`} />
      <ResourceForm fields={fields} values={values} isEdit={false} action={saveAction.bind(null, r.slug, null, back)} submitLabel={`Create ${r.singular}`} />
    </>
  );
}
