import { goSignedIn } from "@/lib/magic";

/** Old follow-on quote "Book Me In" link (it used to sign the customer in). The portal checks ownership. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return goSignedIn(req, /^\d+$/.test(id) ? `/portal/follow-on/${id}` : "/portal/quotes");
}
