import { RangePriceForm, ServicePicker } from "@/components/tools/PriceForms";
import { Empty, PageHeader } from "@/components/ui";
import { activeServices, rangeOptions, servicePrices } from "@/lib/admin/prices";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Range prices" };

/** RangePriceController@rangePrice / @getRangePrice / @setRangePrice */
export default async function RangePrices({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  await requireStaff();
  const [services, o] = await Promise.all([activeServices(), rangeOptions()]);
  const id = Number((await searchParams).service) || services[0]?.id;
  const s = id ? await servicePrices(id) : null;
  return (
    <>
      <PageHeader eyebrow="Services" title="Range prices" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Set part prices that only apply to certain makes, fuels, years and engine sizes.</p>
      {!s ? <Empty title="No active services" /> : (
        <>
          <ServicePicker services={services} current={s.id} base="/admin/prices/range" />
          <RangePriceForm key={s.id} serviceId={s.id} labourHour={s.labourHour} parts={s.parts} o={o} />
        </>
      )}
    </>
  );
}
