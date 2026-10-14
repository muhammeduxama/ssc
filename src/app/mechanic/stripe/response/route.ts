import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Mechanic\Payment\PaymentController@stripeResponse: finish Stripe Connect OAuth. */
export async function GET(req: Request) {
  const s = await getSession();
  const back = (q = "") => NextResponse.redirect(new URL(`/mechanic/payments${q}`, req.url));
  if (!s || s.role !== "mechanic") return NextResponse.redirect(new URL("/login", req.url));
  const code = new URL(req.url).searchParams.get("code");
  const keys = await db.stripes.findFirst();
  if (!code || !keys?.secret_key) return back("?stripe=error");
  try {
    const r = await new Stripe(keys.secret_key).oauth.token({ grant_type: "authorization_code", code });
    const now = new Date();
    const data = {
      access_token: r.access_token ?? null,
      livemode: !!r.livemode,
      refresh_token: r.refresh_token ?? null,
      token_type: r.token_type ?? null,
      stripe_publishable_key: r.stripe_publishable_key ?? null,
      stripe_user_id: r.stripe_user_id ?? null,
      scope: r.scope ?? null,
      updated_at: now,
    };
    const existing = await db.userstripes.findFirst({ where: { user_id: BigInt(s.id) } });
    if (existing) await db.userstripes.update({ where: { id: existing.id }, data });
    else await db.userstripes.create({ data: { ...data, user_id: BigInt(s.id), created_at: now } });
  } catch (e) {
    console.error("[stripe connect]", e);
    return back("?stripe=error");
  }
  return back();
}
