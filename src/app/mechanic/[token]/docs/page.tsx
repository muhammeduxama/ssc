import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { uploadDocsByToken } from "./actions";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Upload your documents" };

/** ProfileController@docs — the "Add Require Documents" email link. */
export default async function DocsByToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const u = await db.users.findUnique({ where: { api_token: token }, select: { fname: true, lname: true, company: true } });
  if (!u) notFound();
  const docs = await db.documents.findMany({ orderBy: { id: "asc" } });
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" aria-label="Smart Servicing Centre home"><Logo className="h-14" /></Link>
      <span className="eyebrow mt-10">Required documents</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Hi {u.fname}, you’re nearly ready to accept work</h1>
      <p className="mt-2 text-muted">Upload a clear image of each document. You can take a picture on your phone if you don’t have a scanner.</p>
      <form action={uploadDocsByToken.bind(null, token)} className="card mt-8 space-y-5 p-6">
        {docs.map((d) => (
          <div key={String(d.id)}>
            <label htmlFor={`d${d.id}`} className="label">{d.name}{d.mandatory && <span className="text-danger"> *</span>}</label>
            <input id={`d${d.id}`} type="file" name={String(d.id)} accept={d.type === "1" ? "image/*" : "application/pdf,image/*"} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
          </div>
        ))}
        <button className="btn btn-primary w-full">Upload documents</button>
      </form>
    </main>
  );
}
