import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; verified?: string }> }) {
  const sp = await searchParams;
  if (await getSession()) redirect(sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard");
  return (
    <main className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between bg-night p-12 text-night-ink lg:flex">
        <Link href="/" aria-label="Smart Servicing Centre home">
          <Logo className="h-20" />
        </Link>
        <div>
          <span className="eyebrow">One workspace</span>
          <h1 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Every booking, quote and message in one place.
          </h1>
          <p className="mt-4 max-w-md text-lg text-night-muted">
            Customers, garages and mobile mechanics, connected. Sign in with your existing Smart Servicing Centre account.
          </p>
        </div>
        <dl className="grid grid-cols-2 border-t border-night-line font-mono text-sm text-night-muted">
          {[
            ["Orders", "Quotes & bookings"],
            ["Chat", "Live job messaging"],
            ["Mechanics", "Garages & mobile"],
            ["Payments", "Payouts & fees"],
          ].map(([a, b], i) => (
            <div key={a} className={`border-b border-night-line py-3.5 ${i % 2 ? "pl-4" : "border-r pr-4"}`}>
              <dt className="font-medium text-night-ink">{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
        <span className="absolute bottom-0 left-12 h-0.5 w-24 bg-accent" />
      </aside>
      <section className="grid place-items-center px-6 py-12">
        <div className="card w-full max-w-md p-8 sm:p-10">
          <span className="eyebrow">Sign in</span>
          <h2 className="mb-1 mt-3 font-display text-3xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mb-7 text-sm text-muted">Admins, mechanics and customers sign in here.</p>
          {sp.reset && <p role="status" className="mb-4 rounded-lg border border-ok bg-ok-soft px-3 py-2 text-sm">Your password has been reset. Please sign in.</p>}
          {sp.verified && <p role="status" className="mb-4 rounded-lg border border-ok bg-ok-soft px-3 py-2 text-sm">Your email address is verified.</p>}
          <LoginForm next={sp.next} />
          <div className="mt-4 flex justify-between text-sm">
            <Link href="/password/reset" className="text-brand hover:underline">Forgot password?</Link>
            <Link href="/register" className="text-brand hover:underline">Create an account</Link>
          </div>
          <p className="mt-6 text-center font-mono text-xs text-muted">
            <Link href="/" className="text-brand hover:underline">← Back to website</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
