import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isStaff } from "@/lib/session";

/** Autocomplete for services/parts (replaces /user/search/services and /user/search/part in the admin quote builder). */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !isStaff(s)) return NextResponse.json([], { status: 401 });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);
  if (u.searchParams.get("type") === "part") {
    const rows = await db.parts.findMany({ where: { name: { contains: q } }, take: 10, select: { name: true, price: true } });
    return NextResponse.json(rows.map((r) => ({ name: r.name, price: Number(r.price) })));
  }
  const rows = await db.services.findMany({ where: { OR: [{ name: { contains: q } }, { search_keywords: { contains: q } }], status: true }, take: 10, select: { name: true, labour_hour: true } });
  return NextResponse.json(rows.map((r) => ({ name: r.name, hours: Number(r.labour_hour) })));
}
