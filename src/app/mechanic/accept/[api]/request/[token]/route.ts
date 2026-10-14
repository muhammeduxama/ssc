import { goSignedIn } from "@/lib/magic";

/** Old "View Booking Request" link (it used to sign in with the mechanic's api_token). */
export async function GET(req: Request, { params }: { params: Promise<{ api: string; token: string }> }) {
  return goSignedIn(req, `/go/request/${encodeURIComponent((await params).token)}`);
}
