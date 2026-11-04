import { CarBrandLogo } from "./CarBrandLogo";

export function VehicleMark({ src, make }: { src?: string | null; make?: string | null }) {
  return <CarBrandLogo make={make} fallbackSrc={src} className="car-brand-logo-compact"/>;
}
