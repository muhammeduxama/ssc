import { FixedPriceForm, ServicePicker } from "@/components/tools/PriceForms";
import { Empty, PageHeader } from "@/components/ui";
import { activeServices, servicePrices } from "@/lib/admin/prices";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Fixed prices" };

/** FixedPriceController@fixPrice / @servicePrices */
export default async function FixedPrices({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  await requireStaff();
  const services = await activeServices();
  const id = Number((await searchParams).service) || services[0]?.id;
  const s = id ? await servicePrices(id) : null;
  return (
    <>
      <PageHeader eyebrow="Services" title="Fixed prices" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Default labour hours and part prices used for every car, unless a range price overrides them.</p>
      {services.length === 0 || !s ? <Empty title="No active services" /> : (
        <>
          <ServicePicker services={services} current={s.id} base="/admin/prices/fixed" />
          <FixedPriceForm key={s.id} serviceId={s.id} labourHour={s.labourHour} parts={s.parts} />
        </>
      )}
    </>
  );
}
