import { json } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@servicePages */
export async function GET() {
  return json(await db.servicepages.findMany({ orderBy: { id: "asc" } }));
}
