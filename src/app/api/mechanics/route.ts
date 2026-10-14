import { json, staffOnly } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@mechanics (staff only here). */
export async function GET() {
  const denied = await staffOnly();
  if (denied) return denied;
  return json(await db.users.findMany({ where: { role_id: 1 }, orderBy: { id: "asc" } }));
}
