import { NextResponse } from "next/server";
import { checkVerification } from "@/lib/auth-flows";

/** VerificationController@verify — signed link from the "Verify Email Address" email. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; hash: string }> }) {
  const { id, hash } = await params;
  const u = new URL(req.url);
  const ok = await checkVerification(id, hash, u.searchParams.get("expires") ?? "", u.searchParams.get("signature") ?? "");
  return NextResponse.redirect(new URL(ok ? "/login?verified=1" : "/email/verify", req.url));
}
