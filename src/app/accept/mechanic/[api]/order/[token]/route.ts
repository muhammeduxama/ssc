import { db } from "@/lib/db";
import { goSignedIn } from "@/lib/magic";

/** Old "Book Me In" link from a mechanic's quote (it used to sign the customer in). */
export async function GET(req: Request, { params }: { params: Promise<{ api: string; token: string }> }) {
  const { api, token } = await params;
  const m = await db.users.findFirst({ where: { api_token: api, role_id: 1 }, select: { id: true } });
  return goSignedIn(req, m ? `/go/quote/${encodeURIComponent(token)}/mechanic/${m.id}` : "/portal/quotes");
}
