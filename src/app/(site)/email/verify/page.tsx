import type { Metadata } from "next";
import { AuthCard } from "@/components/site/AuthCard";
import { ResendVerification } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Verify your email address" };

export default function VerifyNotice() {
  return (
    <AuthCard eyebrow="Account" title="Verify your email address" intro="Before proceeding, please check your email for a verification link. If you did not receive the email, we can send another.">
      <ResendVerification />
    </AuthCard>
  );
}
