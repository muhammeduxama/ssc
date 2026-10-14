import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServiceChooser, type Group } from "@/components/booking/ServiceChooser";
import { CarSummary, Steps } from "@/components/booking/Steps";
import { buildCart, getSettings, labourRate, MOT_ID, priceServices } from "@/lib/booking/pricing";
import { loadBooking } from "@/lib/booking/state";
import { db } from "@/lib/db";
import { PageHead } from "@/components/site/blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose services" };

/** OrderController@selectService — repairs accordion, servicing + MOT list, diagnostics list, basket. */
export default async function ChooseService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await loadBooking();
  if (!b) redirect("/");
  const categs = await db.maincategories.findMany({ where: { status: true }, orderBy: { id: "asc" }, include: { mainsubcategories: { orderBy: { id: "asc" }, include: { mainsubsubcategories: { orderBy: { id: "asc" } } } } } });
  const current = categs.find((c) => String(c.id) === id) ?? categs[0];
  if (!current) redirect("/choose-category");
  const [rate, settings, cart] = await Promise.all([labourRate(b.postcode.id), getSettings(), buildCart(b.booking.cart, b.car, b.postcode.id)]);

  // The three Laravel tabs are the first three active categories, in order.
  const [repairCat, serviceCat, diagCat] = categs;
  const subsub = repairCat ? repairCat.mainsubcategories.flatMap((s) => s.mainsubsubcategories.map((x) => x.id)) : [];
  const [repairServices, servicing, diagnostics] = await Promise.all([
    subsub.length ? db.services.findMany({ where: { mainsubsubcategory_id: { in: subsub } }, orderBy: { id: "asc" }, select: { id: true, mainsubsubcategory_id: true } }) : [],
    serviceCat ? db.services.findMany({ where: { maincategory_id: serviceCat.id }, orderBy: { id: "asc" }, select: { id: true } }) : [],
    diagCat ? db.services.findMany({ where: { maincategory_id: diagCat.id }, orderBy: { id: "asc" }, select: { id: true } }) : [],
  ]);
  const priced = await priceServices([...repairServices, ...servicing, ...diagnostics].map((s) => s.id).filter((i) => Number(i) !== MOT_ID), b.car, rate);
  const row = (sid: bigint) => {
    const p = priced.get(Number(sid));
    return p ? { id: p.id, name: p.name, price: Math.round(p.price * 100) / 100, quote: p.quote, description: p.description } : null;
  };

  const repairs: Group[] = repairCat
    ? repairCat.mainsubcategories.map((s) => ({
        title: s.title,
        groups: s.mainsubsubcategories.map((ss) => ({ title: ss.title, items: repairServices.filter((r) => r.mainsubsubcategory_id === ss.id).map((r) => row(r.id)).filter((x) => !!x) })),
      }))
    : [];
  const motService = servicing.some((s) => Number(s.id) === MOT_ID);
  const tabs = [
    repairCat && { id: Number(repairCat.id), title: repairCat.title, kind: "repairs" as const },
    serviceCat && { id: Number(serviceCat.id), title: serviceCat.title, kind: "services" as const },
    diagCat && { id: Number(diagCat.id), title: diagCat.title, kind: "diagnose" as const },
  ].filter((t) => !!t);

  return (
    <>
    <PageHead top={<Steps at={2} />} eyebrow="Build your booking" title="Choose your services">Add what your car needs. Prices update as you go.</PageHead>
    <section className="site-container py-10 sm:py-12">
      <ServiceChooser
        initialTab={Number(current.id)}
        tabs={tabs}
        repairs={repairs}
        servicing={servicing.filter((s) => Number(s.id) !== MOT_ID).map((s) => row(s.id)).filter((x) => !!x)}
        mot={motService ? { price: settings.mot, discounted: settings.mot - settings.motDiscount } : null}
        diagnostics={diagnostics.map((s) => row(s.id)).filter((x) => !!x)}
        cart={cart}
        ids={b.booking.cart}
        car={<CarSummary reg={b.booking.reg} car={b.car} />}
      />
    </section>
    </>
  );
}
