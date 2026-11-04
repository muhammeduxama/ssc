import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Basket } from "@/components/booking/Basket";
import { PlaceOrderForm } from "@/components/booking/PlaceOrderForm";
import { BookingLayout } from "@/components/booking/BookingLayout";
import { CarSummary } from "@/components/booking/Steps";
import { buildCart } from "@/lib/booking/pricing";
import { loadBooking } from "@/lib/booking/state";
import { NotCustomer } from "@/components/booking/NotCustomer";
import { currentCustomer } from "@/lib/customer";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complete your booking" };

/** OrderController@placeOrder */
export default async function PlaceOrder() {
  const b = await loadBooking();
  if (!b || !b.booking.cart.length) redirect("/");
  const [cart, me, s] = await Promise.all([buildCart(b.booking.cart, b.car, b.postcode.id), currentCustomer(), getSession()]);
  if (!cart.items) redirect("/");
  return (
    <BookingLayout step={3} title="Let's plan your visit" description="Tell us where your car will be and when you're available. You'll review your card details in the final step." back={{href:"/choose-category",label:"Back to services"}}>
      <div className="booking-columns">
        {s && !me ? <NotCustomer name={s.name} back="/place/order" /> : <PlaceOrderForm guest={!me} postcode={b.postcode.postcode} reg={b.booking.reg ?? "No registration"} city={b.postcode.cities.name || me?.city || ""} street={me?.street ?? ""} houseNo={me?.house_no ?? ""} />}
        <aside className="booking-sidebar">
          <Basket cart={cart} car={<CarSummary reg={b.booking.reg} car={b.car} postcode={b.postcode.postcode}/>} />
          <Link href="/choose-category" className="btn btn-secondary w-full">Back to services</Link>
        </aside>
      </div>
    </BookingLayout>
  );
}
