import { goSignedIn } from "@/lib/magic";

/** Old "Reply" link in the SSC quote-chat email (it used to sign the customer in). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return goSignedIn(req, /^\d+$/.test(id) ? `/portal/quotes/${id}/chat` : "/portal/quotes");
}
