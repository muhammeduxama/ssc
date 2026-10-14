import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/blocks";

export const metadata: Metadata = { title: "Thanks for joining" };

const NEXT = [
  "Verify your email address using the link we sent you.",
  "Upload your required documents from the second email.",
  "We review your documents and activate your account, then booking requests start arriving.",
];

export default function Thanks() {
  return (
    <>
      <PageHead top={<span className="icon-tile"><MailCheck size={22} /></span>} eyebrow="Application received" title="Thanks for joining!">
        We&apos;ve emailed you two links: one to verify your email address and one to upload your required documents.
      </PageHead>
      <section className="site-container py-10 sm:py-12">
        <div className="quote-panel max-w-3xl">
          <h2 className="font-display text-xl font-semibold">What happens next</h2>
          <ol className="mt-5 space-y-4">
            {NEXT.map((t, i) => (
              <li key={t} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs text-brand">{i + 1}</span><span className="text-muted">{t}</span></li>
            ))}
          </ol>
          <Link href="/login" className="btn btn-primary mt-8">Go to sign in</Link>
        </div>
      </section>
    </>
  );
}
