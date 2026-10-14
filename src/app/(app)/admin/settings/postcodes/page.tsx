import { Search } from "lucide-react";
import Link from "next/link";
import { PostcodeEditor } from "@/components/tools/SettingsForms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Postcodes" };
const PER = 350;

/** SettingController@postcodeSetting (350 per page) / @postcodeUpdate */
export default async function Postcodes({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { postcode: { contains: sp.q.replace(/\s+/g, "") } } : {};
  const [rows, count] = await Promise.all([
    db.postcodes.findMany({ where, orderBy: { id: "asc" }, take: PER, skip: (page - 1) * PER, include: { cities: { select: { name: true } }, counties: { select: { name: true } } } }),
    db.postcodes.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PER));
  const href = (p: number) => `/admin/settings/postcodes?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;
  return (
    <>
      <PageHeader eyebrow={`${count} postcodes`} title="Postcodes" />
      <form className="relative mb-4 w-full sm:w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} placeholder="Search postcode" className="input pl-9" />
      </form>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px]">
        <thead><tr><th className="th">Postcode</th><th className="th">City</th><th className="th">County</th><th className="th">Lat</th><th className="th">Long</th><th className="th text-right">Edit</th></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={String(p.id)}>
            <td className="td font-mono font-semibold">{p.postcode}</td><td className="td">{p.cities?.name}</td><td className="td">{p.counties?.name}</td><td className="td font-mono text-xs">{Number(p.lat).toFixed(5)}</td><td className="td font-mono text-xs">{Number(p.long).toFixed(5)}</td>
            <td className="td"><PostcodeEditor p={{ id: Number(p.id), postcode: p.postcode, lat: Number(p.lat), long: Number(p.long), city: p.cities?.name ?? "", county: p.counties?.name ?? "" }} /></td>
          </tr>
        ))}</tbody>
      </table></div>
        {pages > 1 && <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm"><span className="font-mono text-xs text-muted">Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Link href={href(page - 1)} className="btn btn-secondary !py-1.5">Previous</Link>}{page < pages && <Link href={href(page + 1)} className="btn btn-secondary !py-1.5">Next</Link>}</div></div>}
      </div>
    </>
  );
}
