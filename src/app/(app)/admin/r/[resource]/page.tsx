import { DataTable, type DataColumn } from "@/components/DataTable";
import { CarBrandLogo } from "@/components/CarBrandLogo";
import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/crud/DeleteButton";
import { Empty, PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { listRecords } from "@/lib/crud/engine";
import { getResource } from "@/lib/crud/registry";
import { requireStaff } from "@/lib/guard";
import { deleteAction } from "./actions";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getResource((await params).resource)?.title ?? "Admin" };
}

export default async function ListPage({ params, searchParams }: Props) {
  const r = getResource((await params).resource);
  if (!r) notFound();
  await requireStaff(r.adminOnly);
  const sp = await searchParams;
  const parent = r.parent ? sp[r.parent.field] : undefined;
  // Any field query param narrows the list (e.g. ?maincategory_id=3 from a parent's row link).
  const filters: Record<string, string> = {};
  for (const f of r.fields) if (sp[f.name] && f.name !== r.parent?.field) filters[f.name] = sp[f.name]!;
  const { rows, count, page, pages } = await listRecords(r, { q: sp.q, page: Number(sp.page) || 1, parent, filters });
  const cols = r.fields.filter((f) => f.list);
  const scope = new URLSearchParams(Object.entries({ ...(parent && r.parent ? { [r.parent.field]: parent } : {}), ...filters }) as [string, string][]).toString();
  const self = `/admin/r/${r.slug}${scope ? `?${scope}` : ""}`;
  const pageHref = (p: number) => {
    const u = new URLSearchParams(scope);
    if (sp.q) u.set("q", sp.q);
    u.set("page", String(p));
    return `/admin/r/${r.slug}?${u}`;
  };

  return (
    <>
      <PageHeader eyebrow={`${r.group} · ${count} records`} title={r.title} description={r.description}>
        {r.canCreate !== false && (
          <Link href={`/admin/r/${r.slug}/new${scope ? `?${scope}` : ""}`} className="btn btn-primary">
            <Plus size={16} /> Add {r.singular}
          </Link>
        )}
      </PageHeader>
      {sp.error === "in-use" && (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">That record is still used elsewhere, so it can’t be deleted.</p>
      )}
      {(parent || Object.keys(filters).length > 0) && (
        <p className="mb-4 text-sm text-muted">
          Filtered view. <Link href={`/admin/r/${r.slug}`} className="font-semibold text-brand hover:underline">Show all</Link>
        </p>
      )}
      {r.search && (
        <form action={`/admin/r/${r.slug}`} className="relative mb-4 w-full sm:w-80">
          {[...new URLSearchParams(scope)].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder={`Search ${r.title.toLowerCase()}`} className="input pl-9" />
        </form>
      )}

      {rows.length === 0 ? (
        <Empty title={`No ${r.title.toLowerCase()} yet`} />
      ) : (
        <div className="resource-list">
          <DataTable caption={r.title} columns={[
            {key:"id",label:"ID"}, ...cols.map((c,i) => ({key:c.name,label:c.label,primary:r.slug==="makes" ? c.name==="name" : i===0})),
          ] satisfies DataColumn[]} rows={rows.map((row) => ({id:String(row.id),cells:{
            id:<span className="record-subtitle">#{String(row.id)}</span>,
            ...Object.fromEntries(cols.map((c) => {
              const v=row[c.name];
              if (r.slug === "makes" && c.name === "icon") {
                return [c.name, <CarBrandLogo key={String(row.id)} make={String(row.name ?? "")} fallbackSrc={v ? asset(String(v)) : undefined} className="car-brand-logo-compact"/>];
              }
              const cell=c.type==="image" ? (v ? <img /* eslint-disable-line @next/next/no-img-element */ src={asset(String(v))} alt={c.label} className="h-12 w-12 rounded-lg border border-line object-cover"/> : "No image") : c.type==="boolean" ? <span className={`pill border-transparent ${v ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{v?"Yes":"No"}</span> : c.type==="select" ? c.options?.find((o)=>o.value===String(v??""))?.label??String(v??"—") : <span className="line-clamp-3 [overflow-wrap:anywhere]">{v===null||v===""?"—":String(v)}</span>;
              return [c.name,cell];
            })),
          },actions:<>{r.rowLinks?.map((l)=><Link key={l.label} href={l.href.replace("{id}",String(row.id))} className="record-action">{l.label}</Link>)}<Link href={`/admin/r/${r.slug}/${row.id}?back=${encodeURIComponent(self)}`} className="record-action">Edit</Link>{r.canDelete!==false&&<DeleteButton what={r.singular} action={deleteAction.bind(null,r.slug,String(row.id),self)}/>}</>}))}/>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
              <span className="font-mono text-xs text-muted">Page {page} of {pages}</span>
              <div className="flex gap-2">
                {page > 1 && <Link className="btn btn-secondary !py-1.5" href={pageHref(page - 1)}>Previous</Link>}
                {page < pages && <Link className="btn btn-secondary !py-1.5" href={pageHref(page + 1)}>Next</Link>}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
