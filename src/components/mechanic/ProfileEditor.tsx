"use client";
import { Check, FileText, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  saveCategories,
  saveMechanicSeo,
  savePreference,
  saveProfilePicture,
  saveQualifications,
  saveSkills,
  setDocumentStatus,
  uploadMechanicDocuments,
  type Result,
} from "@/app/actions/mechanic-profile";
import { useToast } from "@/components/Toast";
import { asset } from "@/lib/asset";
import type { MechanicProfile } from "@/lib/mechanic/profile";

type Opts = { qualifications: string[]; accreditations: string[]; prefs: string[] };

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return {
    pending,
    run: (fn: () => Promise<Result>) =>
      start(async () => {
        const r = await fn();
        toast(r.message, r.ok);
        if (r.ok) router.refresh();
      }),
  };
}

export function ProfileEditor({ p, opts, staff }: { p: MechanicProfile; opts: Opts; staff: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [skills, runSkills, savingSkills] = useActionState(saveSkills.bind(null, p.id), null);
  useEffect(() => {
    if (!skills) return;
    toast(skills.message, skills.ok);
    if (skills.ok) router.refresh();
  }, [skills, toast, router]);
  const err = (k: string) => skills?.errors?.[k];
  const { pending, run } = useRun();

  const [quals, setQuals] = useState(p.qualifications.length ? p.qualifications : [{ type: "", name: "" }]);
  const [accs, setAccs] = useState(p.accreditations.length ? p.accreditations : [""]);
  const [pref, setPref] = useState(p.perBooking || opts.prefs[0]);
  const [cats, setCats] = useState<number[]>(p.categoryIds);
  const [seo, setSeo] = useState(p.seo);
  const mobile = p.serviceType.includes("Mobile Mechanic Service");
  const garage = p.serviceType.includes("Collection and Delivery");

  const field = (name: string, label: string, def: string | number, type = "text", wide = false) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} defaultValue={def} className={`input ${err(name) ? "!border-danger" : ""}`} />
      {err(name) && <p className="mt-1 text-xs text-danger">{err(name)}</p>}
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <form action={runSkills}>
          <Section title="Edit profile" desc="Contact details, coverage area and the services you offer.">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("fname", "First name", p.fname)}
              {field("lname", "Last name", p.lname)}
              {field("phone", "Phone", p.phone)}
              {field("company", "Company name", p.company)}
              {field("email", "Email", p.email, "email", true)}
              {field("street", "Street", p.street, "text", true)}
              {field("post_code", "Postal code", p.postcode)}
              {field("city", "City", p.city)}
              {field("travel_radius", "Travel radius (miles)", p.radius, "number")}
              {field("work_history_years", "Years as a garage / mobile mechanic", p.experience, "number")}
              <div className="sm:col-span-2">
                <label htmlFor="work_history_description" className="label">About you</label>
                <textarea id="work_history_description" name="work_history_description" rows={4} defaultValue={p.about} className={`input ${err("work_history_description") ? "!border-danger" : ""}`} />
                {err("work_history_description") && <p className="mt-1 text-xs text-danger">{err("work_history_description")}</p>}
              </div>
              <fieldset className="sm:col-span-2">
                <legend className="label">What kind of service do you offer?</legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="collection_and_delivery" value="Collection and Delivery" defaultChecked={garage} className="h-4 w-4" /> Collection and delivery (garage)</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mobile_mechanic_service" value="Mobile Mechanic Service" defaultChecked={mobile} className="h-4 w-4" /> Mobile mechanic service</label>
                </div>
                {err("service_type") && <p className="mt-1 text-xs text-danger">{err("service_type")}</p>}
              </fieldset>
            </div>
            <div className="mt-5 flex justify-end">
              <button disabled={savingSkills} className="btn btn-primary">{savingSkills ? "Saving…" : "Save profile"}</button>
            </div>
          </Section>
        </form>

        <Section title="Qualifications & accreditations" desc="Qualifications show that you're a trained, professional automotive technician.">
          <div className="space-y-3">
            {quals.map((q, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select aria-label="Qualification" value={q.type} onChange={(e) => setQuals(quals.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} className="input">
                  <option value="">Select one</option>
                  {opts.qualifications.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input aria-label="Please specify" placeholder="Please specify" value={q.name} onChange={(e) => setQuals(quals.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="input" />
                <button type="button" onClick={() => setQuals(quals.filter((_, j) => j !== i))} aria-label="Remove qualification" className="btn btn-secondary !px-3"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setQuals([...quals, { type: "", name: "" }])} className="btn btn-ghost !px-2 !py-1 !text-xs"><Plus size={14} /> Add qualification</button>
          </div>
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <div className="label">Accreditations</div>
            {accs.map((a, i) => (
              <div key={i} className="flex gap-2">
                <select aria-label="Accreditation" value={a} onChange={(e) => setAccs(accs.map((x, j) => (j === i ? e.target.value : x)))} className="input">
                  <option value="">Select one</option>
                  {opts.accreditations.map((o) => <option key={o}>{o}</option>)}
                </select>
                <button type="button" onClick={() => setAccs(accs.filter((_, j) => j !== i))} aria-label="Remove accreditation" className="btn btn-secondary !px-3"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setAccs([...accs, ""])} className="btn btn-ghost !px-2 !py-1 !text-xs"><Plus size={14} /> Add accreditation</button>
          </div>
          <div className="mt-5 flex justify-end">
            <button disabled={pending} onClick={() => run(() => saveQualifications(p.id, quals.filter((q) => q.type), accs.filter(Boolean)))} className="btn btn-primary">Save qualifications</button>
          </div>
        </Section>

        <Section title="Upload documents" desc="A clear photo or scan of each document. Mandatory documents are marked *.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(() => uploadMechanicDocuments(p.id, fd));
              e.currentTarget.reset();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {p.documents.map((d) => (
              <div key={d.id}>
                <label htmlFor={`doc-${d.id}`} className="label">{d.name}{d.mandatory && <span className="text-danger"> *</span>}</label>
                <input id={`doc-${d.id}`} type="file" name={String(d.id)} accept={d.image ? "image/*" : "application/pdf,image/*"} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
              </div>
            ))}
            <div className="flex justify-end sm:col-span-2">
              <button disabled={pending} className="btn btn-primary">Upload documents</button>
            </div>
          </form>
        </Section>

        <Section title="Documents on file">
          {p.uploads.length === 0 ? <p className="text-sm text-muted">No documents uploaded yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.uploads.map((u) => (
                <div key={u.id} className="overflow-hidden rounded-lg border border-line">
                  <a href={asset(u.file)} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-sunken">
                    {/\.(png|jpe?g|gif|webp)$/i.test(u.file) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset(u.file)} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-muted"><FileText size={32} /></span>
                    )}
                  </a>
                  <div className="space-y-2 p-3">
                    <div className="text-sm font-medium">{u.name}</div>
                    <span className={`pill border-transparent ${u.status === "approved" ? "bg-ok-soft text-ok" : u.status === "rejected" ? "bg-danger-soft text-danger" : "bg-sunken text-muted"}`}>{u.status}</span>
                    {staff && (
                      <div className="flex gap-2 pt-1">
                        <button disabled={pending} onClick={() => run(() => setDocumentStatus(p.id, u.id, "approved"))} className="btn btn-secondary !px-2.5 !py-1 !text-xs !text-ok"><Check size={14} /> Approve</button>
                        <button disabled={pending} onClick={() => run(() => setDocumentStatus(p.id, u.id, "rejected"))} className="btn btn-secondary !px-2.5 !py-1 !text-xs !text-danger"><Trash2 size={14} /> Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {staff && (
          <Section title="SEO for the public profile page" desc="Shown on the mechanic’s page at /mechanic/show/<company>_<id>.">
            <div className="grid gap-3">
              <input aria-label="Page title" placeholder="Page title" value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="input" />
              <input aria-label="SEO keywords" placeholder="SEO keywords" value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className="input" />
              <textarea aria-label="SEO description" placeholder="SEO description" rows={3} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} className="input" />
              <textarea aria-label="Schema code" placeholder="Schema code (JSON-LD)" rows={4} value={seo.schema} onChange={(e) => setSeo({ ...seo, schema: e.target.value })} className="input font-mono text-xs" />
            </div>
            <div className="mt-4 flex justify-end">
              <button disabled={pending} onClick={() => run(() => saveMechanicSeo(p.id, seo))} className="btn btn-primary">Save SEO</button>
            </div>
          </Section>
        )}
      </div>

      <aside className="space-y-4">
        <Section title="Profile picture" desc="A clear photo of your face builds trust. JPG or PNG, up to 400×400px.">
          <div className="flex items-center gap-4">
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset(p.photo)} alt="" className="h-20 w-20 rounded-full border border-line object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft font-display text-2xl text-brand">{p.fname[0]}</span>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(() => saveProfilePicture(p.id, fd));
              }}
              className="flex-1 space-y-2"
            >
              <input type="file" name="profile_picture" accept="image/png,image/jpeg" aria-label="Profile picture" className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-soft file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-brand" />
              <button disabled={pending} className="btn btn-secondary !py-1.5 !text-xs">Upload</button>
            </form>
          </div>
        </Section>

        <Section title="Jobs">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-ok-soft p-3"><div className="font-display text-3xl text-ok">{p.stats.completed}</div><div className="text-xs font-semibold text-ok">Completed</div></div>
            <div className="rounded-lg bg-brand-soft p-3"><div className="font-display text-3xl text-brand">{p.stats.progress}</div><div className="text-xs font-semibold text-brand">In progress</div></div>
          </div>
        </Section>

        <Section title="Preferences" desc="How would you like to be notified about available bookings?">
          <select aria-label="Booking notification preference" value={pref} onChange={(e) => setPref(e.target.value)} className="input">
            {opts.prefs.map((o) => <option key={o}>{o}</option>)}
          </select>
          <button disabled={pending} onClick={() => run(() => savePreference(p.id, pref))} className="btn btn-secondary mt-3 w-full">Save preference</button>
        </Section>

        <Section title="Types of work covered">
          <div className="space-y-2">
            {p.categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cats.includes(c.id)} onChange={(e) => setCats(e.target.checked ? [...cats, c.id] : cats.filter((x) => x !== c.id))} className="h-4 w-4" />
                {c.title}
              </label>
            ))}
          </div>
          <button disabled={pending} onClick={() => run(() => saveCategories(p.id, cats))} className="btn btn-secondary mt-3 w-full">Save work types</button>
        </Section>
      </aside>
    </div>
  );
}
