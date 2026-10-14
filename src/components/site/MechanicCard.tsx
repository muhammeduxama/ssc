import Link from "next/link";
import { ArrowUpRight, MapPin, CheckCircle2, Star } from "lucide-react";
import { slugify } from "@/lib/slug";
import { MechanicAvatar } from "@/components/site/ThemeIcons";

export type MechanicCardData = { id: bigint; company: string | null; note: string | null; profile_photo_path: string | null; completed: number; where: string; rating?: number | null; reviewCount?: number };
export const mechanicHref = (m: { id: bigint; company: string | null }) => `/mechanic/show/${slugify(m.company ?? "mechanic")}_${m.id}`;
export function MechanicCard({ m }: { m: MechanicCardData }) {
  return <li className="mechanic-profile-card">
    <div className="flex items-start justify-between gap-3"><MechanicAvatar photo={m.profile_photo_path} className="h-20 w-20" ring="border-4 border-surface shadow-sm" />{m.rating != null && !!m.reviewCount ? <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold"><Star size={14} className="text-brand" fill="currentColor" />{m.rating.toFixed(1)}<span className="font-normal text-muted">({m.reviewCount})</span></span> : <span className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted">No reviews yet</span>}</div>
    <h3 className="mt-5 font-display text-xl font-semibold leading-snug"><Link href={mechanicHref(m)} className="hover:text-brand">{m.company || "Independent mechanic"}</Link></h3>
    <p className="mt-2 flex items-start gap-1.5 text-sm text-muted"><MapPin size={15} className="mt-0.5 shrink-0" />{m.where}</p>
    <p className="mt-4 line-clamp-3 text-sm leading-7 text-muted">{m.note || "Explore this mechanic’s profile for their experience, qualifications, and customer feedback."}</p>
    <div className="mb-6 mt-4 flex items-center gap-2 text-xs font-medium text-brand"><CheckCircle2 size={15} />{m.completed} completed {m.completed === 1 ? "booking" : "bookings"}</div>
    <Link href={mechanicHref(m)} className="btn btn-secondary mt-auto w-full justify-between">View profile <ArrowUpRight size={17} /></Link>
  </li>;
}
