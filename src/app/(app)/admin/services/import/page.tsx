import { UploadForm } from "@/components/tools/DataTools";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Import services" };
export default async function ImportServices() {
  await requireStaff();
  return (
    <>
      <PageHeader eyebrow="Services" title="Import services from CSV" />
      <UploadForm kind="services" accept=".csv,text/csv" label="Services CSV" help="Same layout as the Laravel inspection.csv: col 1 name, 2 parent, 3 description, 6 status (active), 7 main category id, 12 essential (1), 13 popular (yes)." />
    </>
  );
}
