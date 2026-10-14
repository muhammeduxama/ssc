import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Documents received" };

/** ProfileController@docsStatus (the upload action already rotated the emailed token). */
export default function DocsStatus() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-6 text-center">
      <div>
        <CheckCircle2 size={48} className="mx-auto text-ok" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Thanks, we’ve got your documents</h1>
        <p className="mt-2 text-muted">Our team will review them and let you know once your account is approved.</p>
        <Link href="/login" className="btn btn-primary mt-6">Sign in</Link>
      </div>
    </main>
  );
}
