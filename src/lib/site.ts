import "server-only";
import { db } from "@/lib/db";

/** Saved admin quotes ("popular repairs") — Adminquote::whereSaved('no') filtered in PHP. */
export async function popularRepairs(filter: (o: { notes: string | null; car: Record<string, string>; city: string }) => boolean, limit = 9) {
  const quotes = await db.adminquotes.findMany({
    where: { saved: "no" },
    orderBy: { id: "desc" },
    take: 500,
    include: { orders: { select: { notes: true, car_data: true, postcodes: { select: { cities: { select: { name: true } } } } } } },
  });
  const out: { id: number; make: string; model: string; notes: string; price: number }[] = [];
  for (const q of quotes) {
    let car: Record<string, string> = {};
    try {
      car = JSON.parse(q.orders.car_data ?? "{}");
    } catch {}
    if (!q.orders.notes || !filter({ notes: q.orders.notes, car, city: q.orders.postcodes.cities.name })) continue;
    out.push({ id: Number(q.id), make: car.make ?? "", model: car.model ?? "", notes: q.orders.notes, price: Number(q.price ?? 0) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Laravel's BINARY slug match (MySQL compares case-insensitively by default). */
export const exact = <T extends { slug: string | null }>(rows: T[], slug: string) => rows.find((r) => r.slug === slug) ?? null;

export const completedJobs = (mechanicId: bigint) => db.orderassigns.count({ where: { user_id: mechanicId, status: "completed" } });

/** Route params can arrive still percent-encoded (slugs with "?" or "&"). */
export const decodeSlug = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Random sample (Laravel inRandomOrder()->take(n)); kept out of components so renders stay pure. */
export const sample = <T,>(rows: T[], n: number) => rows.map((r) => [Math.random(), r] as const).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, r]) => r);
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
export const isPast = (d: Date) => d.getTime() < Date.now();
