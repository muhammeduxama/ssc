import { BulkModelsForm, UploadForm } from "@/components/tools/DataTools";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Import vehicle data" };

export default async function ImportData() {
  await requireStaff();
  const makes = (await db.makes.findMany({ orderBy: { name: "asc" }, select: { name: true } })).map((m) => m.name);
  return (
    <>
      <PageHeader eyebrow="Data" title="Import vehicle data" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Upload car CSV</h2>
          <UploadForm kind="cars" accept=".csv,text/csv" label="Car CSV file" help="Columns: id, make, model, year, engine, fuel (first row is a header). Existing cars are skipped." />
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Models bulk upload</h2>
          <BulkModelsForm makes={makes} />
        </div>
      </div>
    </>
  );
}
