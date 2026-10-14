import Link from "next/link";
import { LabourSettings } from "@/components/tools/SettingsForms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { gbp } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Labour & pricing" };

/** SettingController@setting */
export default async function LabourPage() {
  await requireStaff();
  const [s, cities] = await Promise.all([
    db.settings.findFirst({ orderBy: { id: "desc" } }),
    db.cities.findMany({ orderBy: { name: "asc" }, include: { counties: { select: { name: true } } } }),
  ]);
  const v = {
    mot: Number(s?.mot ?? 0), mot_discount: Number(s?.mot_discount ?? 0), mot_discount_percent: Number(s?.mot_discount_percent ?? 0),
    garage_comission: Number(s?.garage_comission ?? 0), max_comission: Number(s?.max_commission ?? 0),
    labour_hour_limit: Number(s?.labour_hour_limit ?? 1), labour_rate: Number(s?.labour_rate ?? 60),
  };
  return (
    <>
      <PageHeader eyebrow="Website settings" title="Labour & pricing" />
      <LabourSettings s={v} />
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">City labour rates</h2>
        <div className="card overflow-hidden"><div className="max-h-[600px] overflow-auto"><table className="w-full min-w-[640px]">
          <thead className="sticky top-0"><tr><th className="th">City</th><th className="th">County</th><th className="th">Labour rate</th><th className="th text-right"></th></tr></thead>
          <tbody>{cities.map((c) => (
            <tr key={String(c.id)}><td className="td font-medium">{c.name}</td><td className="td">{c.counties?.name}</td><td className="td font-mono">{gbp(c.labour_rate)}</td><td className="td text-right"><Link href={`/admin/r/cities/${c.id}?back=/admin/settings/labour`} className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">Edit</Link></td></tr>
          ))}</tbody>
        </table></div></div>
      </section>
    </>
  );
}
