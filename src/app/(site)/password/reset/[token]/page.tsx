import type { Metadata } from "next";
import { AuthCard } from "@/components/site/AuthCard";
import { ResetForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function Reset({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ email?: string }> }) {
  const [{ token }, { email }] = await Promise.all([params, searchParams]);
  return (
    <AuthCard eyebrow="Account" title="Choose a new password">
      <ResetForm token={token} email={email ?? ""} />
    </AuthCard>
  );
}
