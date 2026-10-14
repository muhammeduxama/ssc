import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/AuthCard";
import { RegisterForm } from "@/components/site/AuthForms";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function Register() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthCard eyebrow="Customers" title="Create an account" intro={<>Already have one? <Link href="/login" className="text-brand underline">Sign in</Link>. Garage or mobile mechanic? <Link href="/join-network" className="text-brand underline">Join our network</Link>.</>} wide>
      <RegisterForm />
    </AuthCard>
  );
}
