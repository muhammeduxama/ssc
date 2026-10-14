/** URL for a file stored in the legacy public folder (served by /legacy/...). */
export function asset(p: string | null | undefined) {
  if (!p) return "";
  if (/^(https?:|data:)/.test(p)) return p;
  return `/legacy/${p.replace(/^\/+/, "")}`;
}
