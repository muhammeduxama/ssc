import "server-only";
import { slugify } from "@/lib/crud/engine";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * AjaxController@postCode/checkPostCode: known postcode row, or look it up on getaddress.io and
 * create county / city / postcode rows (ExceptionCase::insertPostCode).
 */
export async function findOrCreatePostcode(raw: string): Promise<{ ok: true; postcode: { id: bigint; postcode: string } } | { ok: false; message: string }> {
  const code = raw.replace(/\s+/g, "").toUpperCase();
  if (!code) return { ok: false, message: "Please enter your postcode" };
  const existing = await db.postcodes.findFirst({ where: { postcode: code } });
  if (existing) return { ok: true, postcode: existing };
  const found = (await fromGetAddress(code)) ?? (await fromPostcodesIo(code));
  if (!found) return { ok: false, message: "Postcode not found" };
  if ("message" in found) return { ok: false, message: found.message };
  const { lat, long } = found;
  // An empty name would match every row with LIKE '%%' (a Laravel bug); fall back to the other name.
  const town = found.town || found.countyName || code;
  const countyName = found.countyName || town;
  const now = new Date();
  let county = await db.counties.findFirst({ where: { name: { contains: countyName } } });
  if (!county) county = await db.counties.create({ data: { name: countyName || town, created_at: now, updated_at: now } });
  let city = (await db.cities.findFirst({ where: { name: { contains: town } } })) ?? (await db.cities.findFirst({ where: { slug: { contains: slugify(town) } } }));
  if (!city) city = await db.cities.create({ data: { county_id: county.id, slug: slugify(town), name: town, page_title: town, created_at: now, updated_at: now } });
  const postcode = await db.postcodes.create({
    data: { long: new Prisma.Decimal(long), lat: new Prisma.Decimal(lat), postcode: code, city_id: city.id, county_id: county.id, created_at: now, updated_at: now },
  });
  if (!found.town.trim()) {
    // Jobs\CityNotExistJob: ask staff to name the city for this postcode.
    await db.notifications.create({
      data: { title: `City Not Exist For ${code}`, description: `We have found a postcode ${code} that does not have city name listed. Please visit your portal and add city name for this postcode`, link: `/admin/settings/postcodes?q=${code}`, created_at: now, updated_at: now },
    });
  }
  return { ok: true, postcode };
}

type Found = { lat: number; long: number; town: string; countyName: string } | { message: string };

/** getaddress.io (what Laravel used). Returns null when the key is missing or the API is unavailable. */
async function fromGetAddress(code: string): Promise<Found | null> {
  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(`https://api.getaddress.io/find/${encodeURIComponent(code)}?api-key=${apiKey}&expand=true`, { cache: "no-store" });
    if (r.status === 404 && !(await r.clone().text()).includes("Message")) return null; // retired /find endpoint
    const data = (await r.json()) as { Message?: string; latitude?: number; longitude?: number; addresses?: { county?: string; town_or_city?: string }[] };
    if (data.Message) return r.status === 401 || r.status === 403 || r.status === 429 ? null : { message: `Postcode ${data.Message}` };
    const a = data.addresses?.[0];
    if (!a || data.latitude == null || data.longitude == null) return null;
    return { lat: data.latitude, long: data.longitude, town: (a.town_or_city ?? "").trimStart(), countyName: (a.county ?? "").trimStart() };
  } catch {
    return null;
  }
}

/** postcodes.io — free, keyless UK postcode data; used when getaddress.io can't answer. */
async function fromPostcodesIo(code: string): Promise<Found | null> {
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (r.status === 404) return { message: "Postcode not found" };
    const j = (await r.json()) as { result?: { latitude: number | null; longitude: number | null; admin_district: string | null; admin_county: string | null; region: string | null; country: string | null } };
    const x = j.result;
    if (!x || x.latitude == null || x.longitude == null) return { message: "Postcode not found" };
    return { lat: x.latitude, long: x.longitude, town: x.admin_district ?? "", countyName: x.admin_county ?? x.region ?? x.country ?? "" };
  } catch {
    return null;
  }
}
