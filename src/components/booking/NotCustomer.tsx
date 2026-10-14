import { logout } from "@/app/login/actions";

/** Staff or mechanic sessions can't book as a customer. */
export function NotCustomer({ name, back }: { name: string; back: string }) {
  return (
    <div className="card space-y-3 p-6">
      <h2 className="font-display text-xl font-semibold">You&apos;re signed in as {name}</h2>
      <p className="text-muted">Bookings and quote requests are made from a customer account. Sign out, then continue — you can sign in or create a customer account on the next step. Your basket is kept.</p>
      <form action={logout}><input type="hidden" name="next" value={back} /><button className="btn btn-primary">Sign out</button></form>
    </div>
  );
}
