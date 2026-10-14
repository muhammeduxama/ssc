import { Award, CalendarDays, CheckCircle2, MapPin, MessageSquare, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SchemaCode, Stars } from "@/components/site/blocks";
import { db } from "@/lib/db";
import { completedJobs } from "@/lib/site";
import { MechanicAvatar } from "@/components/site/ThemeIcons";

export const dynamic = "force-dynamic";
const idFrom = (slug: string) => {
  const id = decodeURIComponent(slug).split("_")[1];
  return id && /^\d+$/.test(id) ? BigInt(id) : null;
};
const load = async (slug: string) => {
  const id = idFrom(slug);
  if (!id) return null;
  const u = await db.users.findUnique({ where: { id }, include: { mechanicpages: { take: 1 }, userqualifications: true, reviews: { orderBy: { id: "desc" }, include: { orders: { include: { users: { select: { fname: true, lname: true } } } } } } } });
  return u && Number(u.role_id) === 1 ? u : null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const u = await load((await params).slug);
  const seo = u?.mechanicpages[0];
  return { title: { absolute: seo?.page_title || u?.company || "Mechanic" }, description: seo?.seo_description ?? undefined, keywords: seo?.seo_keywords ?? undefined };
}

/** ProfileController@showMechanic — public mechanic profile. */
export default async function MechanicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const u = await load((await params).slug);
  if (!u) redirect("/city/all");
  const done = await completedJobs(u.id);
  const avg = u.reviews.length ? u.reviews.reduce((t, r) => t + r.overall, 0) / u.reviews.length : null;
  return (
    <>
      <SchemaCode code={u.mechanicpages[0]?.schema_code} />
      <header className="page-hero">
        <div className="site-container py-10 sm:py-14">
          <Link href="/city/all" className="text-link mb-8">← Explore locations</Link>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <MechanicAvatar photo={u.profile_photo_path} className="h-28 w-28 sm:h-36 sm:w-36" ring="border-4 border-surface shadow-card" />
            <div className="min-w-0 flex-1"><span className="eyebrow">Mechanic profile</span><h1 className="mt-3 break-words font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{u.company || "Independent mechanic"}</h1><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">{u.city && <span className="flex items-center gap-1.5"><MapPin size={16} />Based in {u.city}</span>}{avg != null ? <a href="#reviews" className="flex items-center gap-2"><Stars value={Math.round(avg)} /><b className="text-ink">{avg.toFixed(1)}</b> · {u.reviews.length} reviews</a> : <span>No customer reviews yet</span>}</div></div>
          </div>
        </div>
      </header>
      <nav aria-label="Profile sections" className="border-b border-line bg-surface"><div className="site-container flex gap-7 py-5 text-sm font-semibold"><a href="#about" className="text-brand">Overview</a><a href="#experience">Experience</a><a href="#reviews">Reviews ({u.reviews.length})</a></div></nav>
      <div className="site-container grid items-start gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <section id="about" className="card scroll-mt-24 p-6 sm:p-8"><span className="eyebrow">Get to know your mechanic</span><h2 className="mt-3 font-display text-2xl font-semibold">About {u.company || "this mechanic"}</h2><p className="mt-5 whitespace-pre-line text-base leading-8 text-muted">{u.note || "This mechanic hasn’t added an introduction yet. You can explore their listed experience and customer reviews below."}</p></section>
          <section id="experience" className="scroll-mt-24"><h2 className="font-display text-2xl font-semibold">Experience & qualifications</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{u.experience != null && <Fact icon={Award} text={`${u.experience} ${u.experience === 1 ? "year" : "years"} of professional experience`} />}<Fact icon={CheckCircle2} text={`${done} completed booking${done === 1 ? "" : "s"}`} />{u.created_at && <Fact icon={CalendarDays} text={`Member since ${u.created_at.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`} />}</div><div className="card mt-4 p-6"><h3 className="font-semibold">Listed qualifications</h3>{u.userqualifications.length ? <ul className="mt-4 space-y-3">{u.userqualifications.map((q) => <li key={String(q.id)} className="flex items-start gap-3 text-sm leading-6 text-muted"><Award size={18} className="mt-0.5 shrink-0 text-brand" />{q.name || q.qualification}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No qualifications have been listed on this profile.</p>}</div></section>
          <section id="reviews" className="scroll-mt-24"><div className="flex items-end justify-between gap-4"><h2 className="font-display text-2xl font-semibold">Customer reviews</h2><span className="text-sm text-muted">{u.reviews.length} reviews</span></div>
            {u.reviews.length === 0 && <div className="card mt-5 p-8 text-center"><MessageSquare size={28} className="mx-auto text-brand" /><h3 className="mt-4 font-semibold">A fresh start for feedback</h3><p className="mt-2 text-sm leading-6 text-muted">There are no customer reviews for this mechanic yet.</p></div>}
            <ul className="mt-5 space-y-5">{u.reviews.map((r) => <li key={String(r.id)} className="card p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{r.orders.users.fname} {r.orders.users.lname}</h3><p className="mt-1 text-xs text-muted">{r.created_at?.toLocaleDateString("en-GB", { dateStyle: "long" })}</p></div><Stars value={r.overall} /></div>{r.review && <p className="mt-5 whitespace-pre-line text-base leading-8 text-muted">{r.review}</p>}<dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">{([["Quality", r.quality], ["Punctuality", r.punctuality], ["Communication", r.communication]] as const).map(([k,v]) => <div key={k}><dt className="mb-1 text-xs text-muted">{k}</dt><dd><Stars value={v} size={13} /></dd></div>)}</dl>{r.response && <div className="mt-5 rounded-xl border-l-2 border-brand bg-night p-4"><h4 className="text-sm font-semibold">Mechanic’s reply</h4><p className="mt-2 text-sm leading-7 text-muted">{r.response}</p></div>}</li>)}</ul>
          </section>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24"><div className="quote-panel !p-7"><span className="icon-tile"><MapPin size={22} /></span><h2 className="mt-5 font-display text-2xl font-semibold">Plan your next repair</h2><p className="mt-3 text-sm leading-7 text-muted">Start with your vehicle and postcode to explore services and request a quote. Mechanic availability is confirmed during booking.</p><Link href="/#quote" className="btn btn-primary mt-6 w-full">Start a quote <ArrowRight size={17} /></Link><p className="mt-3 text-xs leading-5 text-muted">This starts a general quote and does not reserve this mechanic.</p></div><div className="rounded-2xl border border-line bg-night p-6"><h2 className="font-semibold">Location & coverage</h2><p className="mt-3 text-sm leading-7 text-muted">{u.city || "Location not listed"}{u.radius ? ` · Listed service radius: ${u.radius} miles` : ""}</p><p className="mt-3 text-xs leading-6 text-muted">Confirm that your address is covered when arranging your booking.</p></div></aside>
      </div>
    </>
  );
}

function Fact({ icon: Icon, text }: { icon: typeof Award; text: string }) {
  return <div className="card flex items-center gap-3 p-4 text-sm font-medium"><Icon size={18} className="text-brand" />{text}</div>;
}
