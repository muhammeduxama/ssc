import Link from "next/link";
import { redirect } from "next/navigation";
import { ChooseAlternative } from "@/components/mechanic/Alternatives";
import { ToastProvider } from "@/components/Toast";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Choose a time" };

/** User\HomeController@chooseAlternatives — link from the "alternatives received" email. */
export default async function ChooseAlternatives({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^\d+$/.test(id)) redirect("/");
  const order = await db.orders.findUnique({ where: { token } });
  const req = await db.orderrequests.findUnique({ where: { id: BigInt(id) }, include: { users: { select: { company: true } } } });
  if (!order || order.status !== "pending" || !req || req.order_id !== order.id) redirect("/");
  let options: { date: string; times: { time: string }[] }[] = [];
  try {
    options = JSON.parse(req.slots ?? "[]");
  } catch {}
  return (
    <ToastProvider>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" aria-label="Smart Servicing Centre home"><Logo className="h-14" /></Link>
        <span className="eyebrow mt-10">Booking #{String(order.id)}</span>
        <h1 className="mb-6 mt-3 font-display text-3xl font-semibold">Choose a new time</h1>
        {options.length ? <ChooseAlternative token={token} id={Number(req.id)} options={options} company={req.users.company ?? "Your mechanic"} /> : <p className="text-muted">No alternatives have been proposed yet.</p>}
      </main>
    </ToastProvider>
  );
}
