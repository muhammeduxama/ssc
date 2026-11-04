import { CarBrandLogo } from "@/components/CarBrandLogo";
import { Check, MapPin } from "lucide-react";

const STEPS = ["Your vehicle", "Choose services", "Visit details", "Confirm booking"];
export function Steps({ at, complete = false, quote = false }: { at: 1 | 2 | 3 | 4; complete?: boolean; quote?: boolean }) {
  return <ol className="booking-steps" aria-label="Booking progress">{(quote ? ["Your vehicle", "Choose a repair", "Your details", "Request sent"] : STEPS).map((s,i) => {
    const n=i+1;const state=complete||n<at?"done":n===at?"current":"todo";
    return <li key={s} data-state={state} aria-current={state==="current"?"step":undefined}><span className="booking-step-number">{state==="done"?<Check size={15} aria-hidden/>:n}</span><span>{s}</span>{state==="done"&&<span className="sr-only">Complete</span>}</li>;
  })}</ol>;
}

export function CarSummary({ reg, car, postcode }: { reg: string | null; car: { make: string; model: string; fuel: string; engine: string; year: string }; postcode?: string }) {
  return <div className="booking-car"><CarBrandLogo make={car.make} className="car-brand-logo-compact"/><div className="min-w-0 flex-1"><strong>{car.make} {car.model}</strong><span>{[car.year,car.fuel,car.engine && `${car.engine}L`].filter(Boolean).join(" · ")}</span>{postcode&&<span className="booking-car-location"><MapPin size={12}/>{postcode.toUpperCase()}</span>}</div><span className="booking-registration">{reg || "Manual selection"}</span></div>;
}
