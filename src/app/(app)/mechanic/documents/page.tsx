import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { requireRole } from "@/lib/guard";
import { getMechanicProfile } from "@/lib/mechanic/profile";

export const metadata = { title: "Documents" };
export default async function Documents() {
  const s = await requireRole("mechanic");
  const p = await getMechanicProfile(Number(s.id));
  if (!p) return null;
  const missing = p.documents.filter((d) => d.mandatory && !p.uploads.some((u) => u.documentId === d.id));
  return (
    <>
      <PageHeader eyebrow="Profile" title="Documents"><Link href="/mechanic/profile" className="btn btn-primary">Upload documents</Link></PageHeader>
      {missing.length > 0 && <p className="mb-4 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm">Still needed before you can accept jobs: <b>{missing.map((d) => d.name).join(", ")}</b></p>}
      {p.uploads.length === 0 ? <Empty title="No documents uploaded" body="Upload your motor trade insurance, public liability insurance and qualifications." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {p.uploads.map((u) => (
            <a key={u.id} href={asset(u.file)} target="_blank" rel="noreferrer" className="card overflow-hidden transition hover:shadow-card">
              <div className="aspect-[4/3] bg-sunken">{/\.(png|jpe?g|gif|webp)$/i.test(u.file) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(u.file)} alt={u.name} className="h-full w-full object-cover" />
              )}</div>
              <div className="flex items-center justify-between gap-2 p-3"><span className="text-sm font-medium">{u.name}</span><span className={`pill border-transparent ${u.status === "approved" ? "bg-ok-soft text-ok" : u.status === "rejected" ? "bg-danger-soft text-danger" : "bg-sunken text-muted"}`}>{u.status}</span></div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
