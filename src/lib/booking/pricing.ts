import "server-only";
import { db } from "@/lib/db";

export type PricedService = {
  id: number;
  name: string;
  maincategory_id: number;
  description: string | null;
  included_parts: { name: string; price: number }[];
  price: number;
  labour: number;
  /** 1 = an essential part has no price for this car → "get a quote" instead of add to basket. */
  quote: 0 | 1;
};

export type CarLike = { id: bigint | number; make: string; fuel: string; oil_capacity: unknown; spark_plug: number | null; glow_plug: number | null };

export const PACKAGES = [1000, 1001, 1002];
export const MOT_ID = 1003;

const n = (v: unknown) => Number(v ?? 0);

export async function getSettings() {
  const s = await db.settings.findFirst({ orderBy: { id: "desc" } });
  return { mot: n(s?.mot ?? 74), motDiscount: n(s?.mot_discount ?? 29) };
}

/** Labour rate for a postcode — `$postcode->city->labour_rate`. */
export async function labourRate(postcodeId: bigint | number) {
  const p = await db.postcodes.findUnique({ where: { id: BigInt(postcodeId) }, include: { cities: true } });
  return n(p?.cities.labour_rate ?? 60);
}

/**
 * Port of Service::getPrice. Kept faithful, including the petrol spark-plug double count
 * (`price * spark_plug` + `price * (spark_plug < 1 ? 4 : spark_plug)`) so quotes match Laravel.
 */
export async function priceServices(serviceIds: (bigint | number)[], car: CarLike, rate: number): Promise<Map<number, PricedService>> {
  const ids = serviceIds.map((i) => BigInt(i));
  const [services, make] = await Promise.all([
    db.services.findMany({ where: { id: { in: ids } }, include: { parts: { include: { prices: { orderBy: { id: "asc" }, take: 1 } }, orderBy: { id: "asc" } } } }),
    db.makes.findFirst({ where: { name: car.make } }),
  ]);
  const fuel = car.fuel.toLowerCase();
  const out = new Map<number, PricedService>();
  for (const s of services) {
    const labour = rate * n(s.labour_hour);
    const base = { id: Number(s.id), name: s.name, maincategory_id: Number(s.maincategory_id), description: s.description };
    if (Number(s.maincategory_id) === 3) {
      out.set(base.id, { ...base, price: labour, labour, included_parts: [], quote: 0 });
      continue;
    }
    let total = 0;
    let quote: 0 | 1 = 0;
    const parts: { name: string; price: number }[] = [];
    for (const part of s.parts) {
      let value = 0;
      let range = 0;
      let partPrice = n(part.price);
      let essential = part.essential;
      const price = part.prices[0] ?? null;
      if (price && n(price.price) > 0) {
        let makes: string[] = [];
        try {
          makes = (JSON.parse(price.make) as unknown[]).map(String);
        } catch {}
        if (make && (makes.includes("ALL") || makes.includes(String(make.id)))) {
          range = 1;
          partPrice = n(price.price);
          value += n(price.price);
        }
      }
      if (fuel.includes("petrol") && !price) {
        if (part.name === "Engine Oil") value += partPrice * (n(car.oil_capacity) < 1 ? 5 : n(car.oil_capacity));
        else if (part.name === "Spark Plugs") {
          value += partPrice * n(car.spark_plug);
          value += partPrice * (n(car.spark_plug) < 1 ? 4 : n(car.spark_plug));
          essential = true;
        } else if (part.name === "Fuel Filter" || part.name === "Glow Plugs") essential = false;
        else value += partPrice * part.default_qty;
      }
      if (fuel.includes("diesel") && !price) {
        if (part.name === "Engine Oil") value += partPrice * (n(car.oil_capacity) < 1 ? 5 : n(car.oil_capacity));
        else if (part.name === "Spark Plugs") essential = false;
        else if (part.name === "Glow Plugs") value += partPrice * (n(car.glow_plug) < 1 ? 4 : n(car.glow_plug));
        else value += partPrice * part.default_qty;
      }
      parts.push({ name: part.name, price: value });
      total += value;
      if ((!price || range === 0) && essential && partPrice < 1) quote = 1;
    }
    out.set(base.id, { ...base, included_parts: parts, price: total + labour, labour, quote });
  }
  return out;
}

export async function priceService(id: bigint | number, car: CarLike, rate: number) {
  return (await priceServices([id], car, rate)).get(Number(id)) ?? null;
}

/** Service::mot */
export async function motItem(price: number): Promise<PricedService | null> {
  const s = await db.services.findUnique({ where: { id: BigInt(MOT_ID) } });
  if (!s) return null;
  return { id: MOT_ID, name: s.name, maincategory_id: Number(s.maincategory_id), description: s.description, included_parts: [], price, labour: price, quote: 0 };
}

export const round2 = (v: number) => Math.round(v * 100) / 100;

export type CartItem = { item: PricedService; price: number };
export type Cart = { items: Record<string, CartItem> | null; totalPrice: number };

/**
 * Builds the basket exactly as CartController leaves it: packages (1000–1002) are mutually
 * exclusive, and the MOT costs `mot - mot_discount` whenever a package is in the basket.
 */
export async function buildCart(ids: number[], car: CarLike, postcodeId: bigint | number): Promise<Cart> {
  if (!ids.length) return { items: null, totalPrice: 0 };
  const [rate, settings] = await Promise.all([labourRate(postcodeId), getSettings()]);
  const others = ids.filter((i) => i !== MOT_ID);
  const priced = await priceServices(others, car, rate);
  const items: Record<string, CartItem> = {};
  let total = 0;
  for (const id of ids) {
    let item: PricedService | null;
    if (id === MOT_ID) {
      const withPackage = ids.some((i) => PACKAGES.includes(i));
      item = await motItem(withPackage ? settings.mot - settings.motDiscount : settings.mot);
    } else item = priced.get(id) ?? null;
    if (!item) continue;
    items[String(id)] = { item, price: round2(item.price) };
    total = round2(total + round2(item.price));
  }
  return { items: Object.keys(items).length ? items : null, totalPrice: Math.max(0, total) };
}

/** CartController@addToCart: ids after adding `id` (flag = also add the discounted MOT). */
export function addToBasket(ids: number[], id: number, withMot = false) {
  let next = ids.slice();
  if (PACKAGES.includes(id)) next = next.filter((i) => !PACKAGES.includes(i));
  if (!next.includes(id)) next.push(id);
  if (withMot && id !== MOT_ID && !next.includes(MOT_ID)) next.push(MOT_ID);
  return next;
}

/** removeFromCart / removeFromCartwithmot */
export function removeFromBasket(ids: number[], id: number, withMot = false) {
  return ids.filter((i) => i !== id && !(withMot && i === MOT_ID));
}
