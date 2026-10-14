import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/AuthCard";
import { readLink, redeemLink } from "@/lib/login-links";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Continue", robots: { index: false } };

/**
 * Landing page for email login links. The link is only used up when the person presses
 * Continue, so email security scanners that open links in advance can't spend it.
 */
export default async function LoginLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = readLink(token);
  if (!p) redirect("/login");
  const s = await getSession();
  if (s?.kind === "user" && s.id === p.u) redirect(p.t);
  if (p.expired) redirect(`/login?next=${encodeURIComponent(p.t)}`);

  async function go() {
    "use server";
    redirect(await redeemLink(token));
  }

  return (
    <AuthCard eyebrow="Smart Servicing Centre" title="Continue to your account" intro="This secure link signs you in once and expires after 7 days.">
      <form action={go}>
        <button className="btn btn-primary w-full">Continue</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Not you? <Link href="/login" className="text-brand underline">Sign in with your password</Link>
      </p>
    </AuthCard>
  );
}
