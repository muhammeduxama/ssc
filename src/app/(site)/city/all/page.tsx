import type { Metadata } from "next";
import { PageHero } from "@/components/site/blocks";
import { BrowseDirectory } from "@/components/site/BrowseDirectory";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Areas we cover" };
export default async function AllCities() {
  const counties = await db.counties.findMany({ orderBy: { name: "asc" }, include: { cities: { orderBy: { name: "asc" }, select: { name: true, slug: true } } } });
  return <><PageHero eyebrow="Good car care, closer to home" title="Find your local area.">Explore our locations across the UK. Search for your town, city, or county to get started.</PageHero><BrowseDirectory label="Where are you looking?" placeholder="Search a town, city, or county" groups={counties.filter((c) => c.cities.length).map((c) => ({ name: c.name, items: c.cities.map((city) => ({ name: city.name, href: `/city/${city.slug}` })) }))} /></>;
}
