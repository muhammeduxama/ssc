import Link from "next/link";
import { gbp } from "@/lib/format";
import { distanceMiles } from "@/lib/geo";
import { MechanicAvatar } from "@/components/site/ThemeIcons";

type Req = {
  id: bigint;
  users: { company: string | null; fname: string; lname: string; profile_photo_path: string | null; lat: unknown; long: unknown };
  orderrequestquotes: { price: unknown; status: string | null; orderrequestquotelabours: { name: string }[]; orderrequestquoteparts: { name: string }[] }[];
};

/** Quotes mechanics sent for a repair request (order view in the Laravel portal). */
export function MechanicQuotes({ orderId, requests, at }: { orderId: bigint; requests: Req[]; at: { lat: unknown; long: unknown } }) {
  const quoted = requests.filter((r) => r.orderrequestquotes[0]);
  if (!quoted.length) return <p className="card p-5 text-muted">No quotation received yet.</p>;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {quoted.map((r) => {
        const q = r.orderrequestquotes[0];
        const miles = r.users.lat != null && at.lat != null ? distanceMiles(Number(r.users.lat), Number(r.users.long), Number(at.lat), Number(at.long)) : null;
        return (
          <li key={String(r.id)} className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <MechanicAvatar photo={r.users.profile_photo_path} className="h-14 w-14" ring="border border-line" />
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">{r.users.company || `${r.users.fname} ${r.users.lname}`}</div>
                {miles != null && <div className="text-sm text-muted">{miles} miles away</div>}
              </div>
              <div className="font-display text-2xl font-semibold text-brand">{gbp(q.price)}</div>
            </div>
            <ul className="mt-3 flex-1 space-y-1 text-sm">
              {q.orderrequestquotelabours.map((l, i) => <li key={`l${i}`}>• {l.name}</li>)}
              {q.orderrequestquoteparts.map((p, i) => <li key={`p${i}`} className="text-muted">• {p.name}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <Link href={`/portal/quotes/${orderId}/accept/${r.id}`} className="btn btn-primary flex-1">Book me in</Link>
              <Link href={`/portal/requests/${r.id}`} className="btn btn-secondary flex-1">Ask question</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
