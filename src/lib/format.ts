export const gbp = (v: unknown) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v ?? 0));

export const shortDate = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";

export const dateTime = (d: Date | string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d))
    : "—";

export type Car = { make?: string; model?: string; fuel?: string; engine?: string; year?: string | number; reg?: string; logo?: string };

export function parseCar(raw: string | null | undefined): Car {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Car;
  } catch {
    return {};
  }
}

export const carTitle = (c: Car) => [c.make, c.model].filter(Boolean).join(" ") || "Vehicle";

export const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-warn-soft text-warn" },
  assigned: { label: "Assigned", cls: "bg-brand-soft text-brand" },
  completed: { label: "Completed", cls: "bg-ok-soft text-ok" },
  rejected: { label: "Rejected", cls: "bg-danger-soft text-danger" },
  cancelled: { label: "Cancelled", cls: "bg-danger-soft text-danger" },
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
