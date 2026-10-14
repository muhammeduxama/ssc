import { readFile } from "node:fs/promises";
import path from "node:path";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Procedure" };

/** ProfileController@procedure — the Standard Operating Procedures text from the Laravel view. */
export default async function Procedure() {
  await requireRole("mechanic");
  const html = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "src/content/mechanic-procedure.html"), "utf8");
  return (
    <>
      <PageHeader eyebrow="Profile" title="Procedure" />
      <article className="card prose-content max-w-4xl p-8" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
