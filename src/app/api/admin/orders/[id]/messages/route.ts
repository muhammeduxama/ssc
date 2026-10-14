import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isStaff } from "@/lib/session";

/** OrderController@getMessages / Order::getMessages($mechanic) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !isStaff(s)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const mechanic = new URL(req.url).searchParams.get("mechanic");
  if (!/^\d+$/.test(id) || !mechanic || !/^\d+$/.test(mechanic)) return NextResponse.json([], { status: 400 });
  const m = BigInt(mechanic);
  const rows = await db.resolutions.findMany({ where: { order_id: BigInt(id), OR: [{ sender_id: m }, { receiver_id: m }] }, orderBy: { id: "asc" } });
  return NextResponse.json(
    rows.map((r) => ({
      id: Number(r.id),
      who: r.admin ? "ssc" : r.sender_id === m ? "mechanic" : "customer",
      text: r.message ?? "",
      file: r.file,
      fileType: r.file_type,
      at: (r.created_at ?? new Date()).toISOString(),
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
