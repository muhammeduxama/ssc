import { json } from "@/lib/api";
import { db } from "@/lib/db";

/** Api\ApiController@service */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return json(/^\d+$/.test(id) ? await db.services.findUnique({ where: { id: BigInt(id) } }) : null);
}
