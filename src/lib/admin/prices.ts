import "server-only";
import { db } from "@/lib/db";

export async function activeServices() {
  const s = await db.services.findMany({ where: { status: true }, orderBy: { id: "asc" }, select: { id: true, name: true } });
  return s.map((x) => ({ id: Number(x.id), name: x.name }));
}

export async function servicePrices(id: number) {
  const svc = await db.services.findUnique({ where: { id: BigInt(id) }, include: { parts: { orderBy: { id: "asc" } } } });
  if (!svc) return null;
  const prices = await db.prices.findMany({ where: { part_id: { in: svc.parts.map((p) => p.id) } } });
  return {
    id: Number(svc.id),
    name: svc.name,
    labourHour: Number(svc.labour_hour),
    parts: svc.parts.map((p) => {
      const pr = prices.find((x) => x.part_id === p.id);
      return { id: Number(p.id), name: p.name, price: Number(pr?.price ?? p.price), make: pr?.make ?? "ALL", year: pr?.year ?? "ALL", engine: pr?.engine ?? "ALL", fuel: pr?.fuel ?? "ALL" };
    }),
  };
}

/** Options for range pricing (RangePriceController@rangePrice). */
export async function rangeOptions() {
  const [makes, fuels, engines, minY, maxY] = await Promise.all([
    db.makes.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { name: true } }),
    db.fuels.findMany({ where: { status: true }, distinct: ["fuel"], select: { fuel: true } }),
    db.engines.findMany({ where: { status: true }, distinct: ["name"], orderBy: { name: "asc" }, select: { name: true } }),
    db.years.aggregate({ _min: { start: true } }),
    db.years.aggregate({ _max: { end: true } }),
  ]);
  const from = Number(minY._min.start) || 1990;
  const to = Number(maxY._max.end) || new Date().getFullYear();
  return {
    makes: makes.map((m) => m.name),
    fuels: fuels.map((f) => f.fuel).sort(),
    years: Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i),
    engines: engines.map((e) => Number(e.name).toFixed(1)),
  };
}
