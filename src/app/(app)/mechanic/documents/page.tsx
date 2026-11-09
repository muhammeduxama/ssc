import { ArrowUpRight, CheckCircle2, FileCheck2, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { asset } from "@/lib/asset";
import { requireRole } from "@/lib/guard";
import { getMechanicProfile } from "@/lib/mechanic/profile";
export const metadata = { title: "Documents" };
export default async function Documents() {
  const s = await requireRole("mechanic");
  const p = await getMechanicProfile(Number(s.id));
  if (!p) return null;
  const missing = p.documents.filter(d => d.mandatory && !p.uploads.some(u => u.documentId === d.id));
  const approved = p.uploads.filter(u => u.status === "approved").length;
  return <>
    <PageHeader eyebrow="Professional credentials" title="Documents" description="Keep your insurance and qualifications organised. Approved documents help you get ready for work."><Link href="/mechanic/profile#profile-upload-documents" className="btn btn-primary"><Upload size={16}/> Upload documents</Link></PageHeader>
    <div className="mech-list-summary"><div><span className="mech-summary-icon"><FileText size={18}/></span><span><small>Documents uploaded</small><strong>{p.uploads.length}</strong></span></div><div><span className="mech-summary-icon"><CheckCircle2 size={18}/></span><span><small>Approved</small><strong>{approved}</strong></span></div><div><span className="mech-summary-icon"><FileCheck2 size={18}/></span><span><small>Required uploads missing</small><strong>{missing.length}</strong></span></div></div>
    {missing.length > 0 && <div className="mech-notice"><FileCheck2 size={20}/><div><strong>Complete your required documents</strong><p>Still needed: {missing.map(d => d.name).join(", ")}. Upload these before accepting work.</p></div><Link href="/mechanic/profile#profile-upload-documents">Upload <ArrowUpRight size={14}/></Link></div>}
    <div className="mech-document-grid">
      {p.uploads.map(u => <article key={u.id} className="mech-document"><FileText/><div><h2>{u.name}</h2><p>Uploaded document · {/\.pdf$/i.test(u.file) ? "PDF" : "Image / file"}</p><span className={`pill border-transparent ${u.status === "approved" ? "bg-ok-soft text-ok" : u.status === "rejected" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>{u.status}</span></div><a href={asset(u.file)} target="_blank" rel="noreferrer" aria-label={`View ${u.name}`}>View <ArrowUpRight size={14}/></a></article>)}
      {missing.map(d => <article key={`missing-${d.id}`} className="mech-document"><Upload/><div><h2>{d.name}</h2><p>Required to accept work</p><span className="pill border-transparent bg-sunken text-muted">Not uploaded</span></div><Link href="/mechanic/profile#profile-upload-documents">Upload <ArrowUpRight size={14}/></Link></article>)}
    </div>
    {!p.uploads.length && !missing.length && <div className="mech-empty"><FileText size={28}/><h2>No documents uploaded yet</h2><p>Use Upload documents to add your credentials.</p></div>}
  </>;
}
