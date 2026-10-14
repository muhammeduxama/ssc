import { QuotePriceCard } from "@/components/tools/PriceForms";
import { Empty, PageHeader } from "@/components/ui";
import { rangeOptions } from "@/lib/admin/prices";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Quote prices data" };

/** QuoteDataController@adminQuotes: admin quotes whose prices haven't been saved/skipped yet. */
export default async function QuotePrices() {
  await requireStaff();
  const [quotes, o] = await Promise.all([
    db.adminquotes.findMany({ where: { saved: "no" }, orderBy: { id: "desc" }, include: { adminquotedetails: true, orders: { select: { id: true, car_data: true } } } }),
    rangeOptions(),
  ]);
  return (
    <>
      <PageHeader eyebrow={`Data · ${quotes.length} pending`} title="Quote prices data" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Turn prices from quotes you sent into reusable labour hours and range part prices, or skip a quote.</p>
      {quotes.length === 0 ? <Empty title="Nothing to review" /> : (
        <div className="space-y-4">
          {quotes.map((q) => {
            const car = parseCar(q.orders.car_data);
            return <QuotePriceCard key={String(q.id)} o={o} q={{ id: Number(q.id), order: Number(q.orders.id), car: `${carTitle(car)} ${car.engine ?? ""} ${car.fuel ?? ""} ${car.year ?? ""}`.trim(), lines: q.adminquotedetails.map((d) => ({ name: d.name, price: Number(d.price), type: d.type })) }} />;
          })}
        </div>
      )}
    </>
  );
}
