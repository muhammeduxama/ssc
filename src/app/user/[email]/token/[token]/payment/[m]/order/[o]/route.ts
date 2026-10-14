import { goSignedIn } from "@/lib/magic";

/** Old "add your card" link (it used to sign the customer in). The payment page checks ownership. */
export async function GET(req: Request, { params }: { params: Promise<{ o: string }> }) {
  const { o } = await params;
  return goSignedIn(req, /^\d+$/.test(o) ? `/get-payment-info/${o}` : "/portal/orders");
}
