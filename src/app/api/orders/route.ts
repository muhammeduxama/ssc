import { json, staffOnly } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@orders (staff only here). */
export async function GET() {
  const denied = await staffOnly();
  if (denied) return denied;
  return json(await db.orders.findMany({ orderBy: { id: "asc" } }));
}
