import { json, staffOnly } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@order (staff only here). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await staffOnly();
  if (denied) return denied;
  const { id } = await params;
  return json(/^\d+$/.test(id) ? await db.orders.findUnique({ where: { id: BigInt(id) } }) : null);
}
