import { json } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@services */
export async function GET() {
  return json(await db.services.findMany({ orderBy: { id: "asc" } }));
}
