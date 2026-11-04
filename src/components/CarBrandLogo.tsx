"use client";
import { CarFront } from "lucide-react";
import { useState } from "react";
import { carBrandLogo } from "@/lib/car-brand";

export function CarBrandLogo({ make, fallbackSrc, className = "" }: { make?: string | null; fallbackSrc?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = carBrandLogo(make) || fallbackSrc;
  const initials = (make ?? "").trim().split(/[\s-]+/).map(word => word[0]).join("").slice(0, 3).toUpperCase();
  return <span className={`car-brand-logo ${className}`} aria-label={make ? `${make} logo` : "Vehicle"} role="img">
    {src && src !== failedSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={80} height={54} loading="lazy" onError={() => setFailedSrc(src)}/>
    ) : initials ? <span className="car-brand-monogram" aria-hidden>{initials}</span> : <CarFront size={23} aria-hidden/>}
  </span>;
}
