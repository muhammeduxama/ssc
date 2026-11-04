import logos from "./car-logos.json";

export function carBrandLogo(make?: string | null) {
  const key = (make ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (logos as Record<string, string>)[key];
}
