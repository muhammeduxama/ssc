import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/site/AuthCard";
import { ForgotForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function Forgot() {
  return (
    <AuthCard eyebrow="Account" title="Reset password" intro={<>Remembered it? <Link href="/login" className="text-brand underline">Sign in</Link>.</>}>
      <ForgotForm />
    </AuthCard>
  );
}
