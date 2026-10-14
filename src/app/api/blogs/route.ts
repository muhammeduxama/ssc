import { json } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@blogs (published posts only; Laravel also leaked drafts). */
export async function GET() {
  return json(await db.blogs.findMany({ where: { status: true }, orderBy: { id: "asc" } }));
}
