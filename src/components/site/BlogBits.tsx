import Link from "next/link";
import { asset } from "@/lib/asset";

export type BlogCard = { id: bigint; title: string; slug: string; thumbnail_image: string | null; thumbnail_image_alertnative: string | null; feature_image: string | null; created_at: Date | null; author: string | null };

export function PostCard({ b, big }: { b: BlogCard; big?: boolean }) {
  const img = b.thumbnail_image || b.feature_image;
  return (
    <Link href={`/blog/${encodeURIComponent(b.slug)}`} className="card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-card">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(img)} alt={b.thumbnail_image_alertnative ?? ""} className={`w-full object-cover ${big ? "aspect-[16/9]" : "aspect-[4/3]"}`} loading="lazy" />
      )}
      <div className="p-6">
        <h3 className={`font-display font-semibold leading-snug group-hover:text-brand ${big ? "text-2xl" : "text-base"}`}>{b.title}</h3>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{b.created_at?.toLocaleDateString("en-GB", { dateStyle: "medium" })}{b.author ? ` · ${b.author}` : ""}</div>
      </div>
    </Link>
  );
}

export function Categories({ categs, active }: { categs: { title: string; slug: string }[]; active?: string }) {
  return (
    <nav className="card p-5" aria-label="Blog categories">
      <h2 className="font-display font-semibold">Categories</h2>
      <ul className="mt-3 space-y-1 text-sm">
        {categs.map((c) => (
          <li key={c.slug}><Link href={`/blog/tag/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={`block rounded-md px-2 py-1.5 hover:bg-sunken ${active === c.slug ? "bg-brand-soft font-semibold text-brand" : ""}`}>{c.title}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

export const cardSelect = { id: true, title: true, slug: true, thumbnail_image: true, thumbnail_image_alertnative: true, feature_image: true, created_at: true, author: true } as const;
