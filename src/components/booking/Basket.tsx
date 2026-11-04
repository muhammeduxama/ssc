import { Check, LockKeyhole } from "lucide-react";
import type { Cart } from "@/lib/booking/pricing";
import { gbp } from "@/lib/format";

export function Basket({ cart, car }: { cart: Cart; car: React.ReactNode }) {
  const items = Object.entries(cart.items ?? {});
  return <section className="booking-summary"><div className="booking-summary-heading"><h2>Your booking</h2><span>{items.length} service{items.length===1?"":"s"}</span></div>{car}
    <ul className="booking-basket-items">{items.map(([id,it])=><li key={id}><div><strong>{it.item.name}</strong><span>{gbp(it.price)}</span></div>{it.item.included_parts.length>0&&<p>Includes {it.item.included_parts.map(p=>p.name).join(", ")}</p>}</li>)}</ul>
    <div className="booking-total"><span>Booking total</span><strong>{gbp(cart.totalPrice)}</strong></div><p className="booking-summary-note"><Check size={15}/>Review your details before confirming.</p><p className="booking-summary-note"><LockKeyhole size={15}/>Card details are handled securely by Stripe.</p>
  </section>;
}
