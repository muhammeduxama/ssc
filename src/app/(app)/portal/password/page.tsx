import type { Metadata } from "next";
import { PasswordForm } from "@/components/PasswordForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Change password" };

/** PortalController@changepassword / @check */
export default function Password() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Change password" description="Choose a strong password to protect your account." />
      <div className="card max-w-xl p-6"><PasswordForm /></div>
    </>
  );
}
