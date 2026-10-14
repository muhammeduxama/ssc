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
      <PageHeader eyebrow={`${r.group} · ${count} records`} title={r.title}>
        {r.canCreate !== false && (
          <Link href={`/admin/r/${r.slug}/new${scope ? `?${scope}` : ""}`} className="btn btn-primary">
            <Plus size={16} /> Add {r.singular}
          </Link>
        )}
      </PageHeader>
      {r.description && <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">{r.description}</p>}
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="th w-16">ID</th>
                  {cols.map((c) => <th key={c.name} className="th">{c.label}</th>)}
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="transition hover:bg-brand-soft/40">
                    <td className="td font-mono text-xs text-muted">{row.id}</td>
                    {cols.map((c) => {
                      const v = row[c.name];
                      return (
                        <td key={c.name} className="td max-w-xs">
                          {c.type === "image" ? (
                            v ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset(String(v))} alt="" className="h-10 w-10 rounded-md border border-line object-cover" />
                            ) : (
                              <span className="text-muted">—</span>
                            )
                          ) : c.type === "boolean" ? (
                            <span className={`pill border-transparent ${v ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{v ? "Yes" : "No"}</span>
                          ) : c.type === "select" ? (
                            <span>{c.options?.find((o) => o.value === String(v ?? ""))?.label ?? String(v ?? "—")}</span>
                          ) : (
                            <span className="line-clamp-2">{v === null || v === "" ? "—" : String(v)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="td">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        {r.rowLinks?.map((l) => (
                          <Link key={l.label} href={l.href.replace("{id}", String(row.id))} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-sunken hover:text-ink">
                            {l.label}
                          </Link>
                        ))}
                        <Link href={`/admin/r/${r.slug}/${row.id}?back=${encodeURIComponent(self)}`} className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">
                          Edit
                        </Link>
                        {r.canDelete !== false && <DeleteButton what={r.singular} action={deleteAction.bind(null, r.slug, String(row.id), self)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
