import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Basket } from "@/components/booking/Basket";
import { PlaceOrderForm } from "@/components/booking/PlaceOrderForm";
import { CarSummary, Steps } from "@/components/booking/Steps";
import { buildCart } from "@/lib/booking/pricing";
import { loadBooking } from "@/lib/booking/state";
import { NotCustomer } from "@/components/booking/NotCustomer";
import { currentCustomer } from "@/lib/customer";
import { getSession } from "@/lib/session";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complete your booking" };

/** OrderController@placeOrder */
export default async function PlaceOrder() {
  const b = await loadBooking();
  if (!b || !b.booking.cart.length) redirect("/");
  const [cart, me, s] = await Promise.all([buildCart(b.booking.cart, b.car, b.postcode.id), currentCustomer(), getSession()]);
  if (!cart.items) redirect("/");
  return (
    <>
    <PageHead top={<Steps at={3} />} eyebrow="Date, time & location" title="We need a few more details to complete your booking" />
    <section className="site-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {s && !me ? <NotCustomer name={s.name} back="/place/order" /> : <PlaceOrderForm guest={!me} postcode={b.postcode.postcode} reg={b.booking.reg ?? "No registration"} city={me?.city || b.postcode.cities.name} street={me?.street ?? ""} houseNo={me?.house_no ?? ""} />}
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Basket cart={cart} car={<CarSummary reg={b.booking.reg} car={b.car} />} />
          <Link href="/choose-category" className="btn btn-secondary w-full">Back to services</Link>
        </aside>
      </div>
    </section>
    </>
  );
}
