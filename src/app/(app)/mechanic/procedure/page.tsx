import { readFile } from "node:fs/promises";
import path from "node:path";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Procedure" };

/** ProfileController@procedure — the Standard Operating Procedures text from the Laravel view. */
export default async function Procedure() {
  await requireRole("mechanic");
  const source = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "src/content/mechanic-procedure.html"), "utf8");
  const sections: { id: string; label: string }[] = [];
  const html = source.replace(/<h3>(.*?)<\/h3>/g, (_, label: string) => {
    const id = `guide-${sections.length + 1}`;
    sections.push({ id, label });
    return `<h3 id="${id}">${label}</h3>`;
  });
  return <>
    <PageHeader eyebrow="Mechanic handbook" title="Working with Smart Servicing" description="A practical reference for bookings, additional work, parts, and customer care." />
    <div className="mech-guide"><aside aria-label="Handbook sections"><strong>In this guide</strong>{sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.label.replace(" Procedure", "")}</a>)}</aside><article className="card prose-content p-8" dangerouslySetInnerHTML={{ __html: html }}/></div>
  </>;
}
