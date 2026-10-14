import type { Cart } from "@/lib/booking/pricing";
import { gbp } from "@/lib/format";

export function Basket({ cart, car }: { cart: Cart; car: React.ReactNode }) {
  const items = Object.entries(cart.items ?? {});
  return (
    <div className="card overflow-hidden">
      <div className="bg-night px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-night-ink">Your basket</div>
      <div className="space-y-4 p-5">
        {car}
        <div className="flex items-center justify-between rounded-lg bg-sunken px-4 py-3 font-semibold"><span className="uppercase">Total</span><span className="font-display text-xl">{gbp(cart.totalPrice)}</span></div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Selected services · {items.length}</p>
          <ul className="mt-2 space-y-2">
            {items.map(([id, it]) => (
              <li key={id} className="text-sm">
                <div className="flex justify-between gap-2"><span>{it.item.name}</span><span className="font-medium">{gbp(it.price)}</span></div>
                {it.item.included_parts.length > 0 && <div className="text-xs text-muted">Includes: {it.item.included_parts.map((p) => p.name).join(", ")}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
