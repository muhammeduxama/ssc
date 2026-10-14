import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** AjaxController@modelsByMake / fuelsByModel / enginesByFuel / yearsByEngine + makes list. Public, read-only. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const level = u.searchParams.get("level");
  const id = u.searchParams.get("id");
  const big = id && /^\d+$/.test(id) ? BigInt(id) : null;
  const json = (rows: { id: bigint; label: string }[]) => NextResponse.json(rows.map((r) => ({ id: Number(r.id), label: r.label })), { headers: { "Cache-Control": "public, max-age=300" } });
  if (level === "makes") return json((await db.makes.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((m) => ({ id: m.id, label: m.name })));
  if (!big) return NextResponse.json([]);
  if (level === "models") return json((await db.modals.findMany({ where: { make_id: big, status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((m) => ({ id: m.id, label: m.name })));
  if (level === "fuels") return json((await db.fuels.findMany({ where: { modal_id: big, status: true }, orderBy: { fuel: "asc" }, select: { id: true, fuel: true } })).map((m) => ({ id: m.id, label: m.fuel })));
  if (level === "engines") return json((await db.engines.findMany({ where: { fuel_id: big }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((m) => ({ id: m.id, label: Number(m.name).toFixed(1) })));
  if (level === "years") {
    const y = await db.years.findMany({ where: { engine_id: big } });
    const out: { id: bigint; label: string }[] = [];
    for (const r of y) for (let v = Number(r.start); v <= Number(r.end); v++) out.push({ id: BigInt(v), label: String(v) });
    return json(out);
  }
  return NextResponse.json([]);
}
