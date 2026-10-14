import type { Metadata } from "next";
import { PageHero } from "@/components/site/blocks";
import { BrowseDirectory } from "@/components/site/BrowseDirectory";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Makes we service" };
export default async function AllMakes() {
  const makes = await db.makes.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
  const groups = new Map<string, { name: string; href: string }[]>();
  const seen = new Set<string>();
  for (const make of makes) {
    if (!make.slug || seen.has(make.slug)) continue;
    seen.add(make.slug);
    const letter = make.name[0].toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), { name: make.name, href: `/makes/${make.slug}` }]);
  }
  return <><PageHero eyebrow="Made for your make" title="Every car has its own needs.">Find servicing and repair information for your manufacturer. Choose your make below or search by name.</PageHero><BrowseDirectory label="Find your car make" placeholder="Search Ford, BMW, Toyota…" groups={Array.from(groups, ([name, items]) => ({ name, items }))} /></>;
}
