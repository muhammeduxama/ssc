const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** TimeSetting::convertTime("8-10 AM") → start hour in 24h (PM adds 12). */
export function slotHours(time: string) {
  const [range, shift] = time.trim().split(/\s+/);
  let [a, b] = (range ?? "").split("-").map(Number);
  if (shift === "PM") {
    if (a < 12) a += 12;
    if (b < 12) b += 12;
  }
  return { start: a, end: b };
}

/** TimeSetting::stringToDate("Tue 06 Apr 2021", "8-10 AM") → Date at the slot start. */
export function slotStart(date: string, time: string): Date | null {
  const parts = date.trim().split(/\s+/).slice(1); // drop weekday
  const [d, mon, y] = parts;
  const m = MONTHS.indexOf(mon);
  const { start } = slotHours(time);
  if (m < 0 || !Number.isFinite(Number(d)) || !Number.isFinite(Number(y)) || !Number.isFinite(start)) return null;
  return new Date(Number(y), m, Number(d), start, 0, 0);
}

export const TIME_SLOTS = ["8-10 AM", "10-12 AM", "12-02 PM", "02-04 PM", "04-06 PM", "06-08 PM"];
