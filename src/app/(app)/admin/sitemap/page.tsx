import { UploadForm } from "@/components/tools/DataTools";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Sitemap" };
export default async function Sitemap() {
  await requireStaff();
  return (
    <>
      <PageHeader eyebrow="Data" title="Sitemap" />
      <UploadForm kind="sitemap" accept=".xml,application/xml,text/xml" label="Sitemap file" help="The file is saved to the website root with its own name (e.g. sitemap.xml)." />
    </>
  );
}
