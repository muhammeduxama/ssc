import { CarFront, ClipboardCheck, ScanSearch, SearchCheck, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { asset } from "@/lib/asset";

/** Booking categories get theme-coloured line icons instead of the old uploaded PNGs. */
const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/pre-?purchase|inspection/i, SearchCheck],
  [/diagnos/i, ScanSearch],
  [/servic|mot/i, ClipboardCheck],
  [/repair/i, Wrench],
];

export function CategoryIcon({ title, size = "lg" }: { title: string | null; size?: "md" | "lg" }) {
  const Icon = CATEGORY_ICONS.find(([re]) => re.test(title ?? ""))?.[1] ?? CarFront;
  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-11 w-11 rounded-xl";
  return (
    <span className={`grid ${box} place-items-center bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-on-brand`} aria-hidden>
      <Icon size={size === "lg" ? 30 : 20} strokeWidth={1.75} />
    </span>
  );
}

/** Mechanic photo, or a themed placeholder when none was uploaded. */
export function MechanicAvatar({ photo, className, ring = "border border-line" }: { photo: string | null | undefined; className: string; ring?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset(photo)} alt="" className={`${className} rounded-full ${ring} object-cover`} />;
  }
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-full ${ring} bg-brand-soft text-brand`} aria-hidden>
      <UserRound className="h-1/2 w-1/2" strokeWidth={1.75} />
    </span>
  );
}
