import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceForm } from "@/components/crud/ResourceForm";
import { PageHeader } from "@/components/ui";
import { clientFields, getRecord } from "@/lib/crud/engine";
import { getResource } from "@/lib/crud/registry";
import { requireStaff } from "@/lib/guard";
import { saveAction } from "../actions";

type Props = { params: Promise<{ resource: string; id: string }>; searchParams: Promise<{ back?: string }> };

export default async function EditPage({ params, searchParams }: Props) {
  const { resource, id } = await params;
  const r = getResource(resource);
  if (!r || !/^\d+$/.test(id)) notFound();
  await requireStaff(r.adminOnly);
  const [values, fields] = await Promise.all([getRecord(r, id), clientFields(r)]);
  if (!values) notFound();
  const { back: b } = await searchParams;
  const back = b && b.startsWith("/admin/") ? b : `/admin/r/${r.slug}`;
  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> {r.title}
      </Link>
      <PageHeader eyebrow={`${r.group} · #${id}`} title={`Edit ${r.singular}`} />
      <ResourceForm fields={fields} values={values} isEdit action={saveAction.bind(null, r.slug, id, back)} submitLabel="Save changes" />
    </>
  );
}
