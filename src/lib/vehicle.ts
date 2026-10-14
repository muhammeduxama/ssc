import "server-only";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/crud/engine";
import { db } from "@/lib/db";

export type CarRow = { id: number; make: string; model: string; fuel: string; engine: string; year: string };

/** ExceptionCase::check_cc: 1598 → "1.6" */
const ccToLitres = (cc: number) => (Math.round(Math.round(cc / 10) / 10) / 10).toFixed(1);
/** ExceptionCase::check_engine: BMW 0.2 → 2.0 quirk */
const fixEngine = (e: string, make: string) => (make.toLowerCase() === "bmw" && Number(e) === 0.2 ? "2.0" : e);

async function findOrCreateMake(name: string) {
  const value = name.toUpperCase().includes("MERCEDES") ? "Mercedes-benz" : name.trim();
  const m = await db.makes.findFirst({ where: { name: value } });
  if (m) return m;
  const now = new Date();
  return db.makes.create({ data: { name: value, slug: slugify(value), status: true, created_at: now, updated_at: now } });
}

/** ExceptionCase::addNewCar */
export async function findOrCreateCar(c: Omit<CarRow, "id">, source = "A") {
  const found = await db.cars.findFirst({ where: { make: { contains: c.make }, model: { contains: c.model }, year: c.year, engine: { contains: c.engine }, fuel: { contains: c.fuel } } });
  if (found) return found;
  const now = new Date();
  return db.cars.create({ data: { ...c, source, oil_capacity: new Prisma.Decimal(5), coil_pack: 1, spark_plug: 4, glow_plug: 4, status: true, created_at: now, updated_at: now } });
}

/** ExceptionCase::storeApiData */
export async function rememberReg(carId: bigint, reg: string, ip?: string | null) {
  const v = await db.vehicledatas.findFirst({ where: { car_id: carId, reg } });
  if (v) return v;
  const now = new Date();
  return db.vehicledatas.create({ data: { car_id: carId, reg, ip: ip ?? null, api: true, created_at: now, updated_at: now } });
}

const toRow = (c: { id: bigint; make: string; model: string; fuel: string; engine: string; year: string }): CarRow => ({ id: Number(c.id), make: c.make, model: c.model, fuel: c.fuel, engine: c.engine, year: c.year });

/**
 * AjaxController@checkRegistration: cached reg → car, otherwise ask VehicleSmart and
 * create make / model-request / car rows exactly like the Laravel flow.
 */
export async function lookupRegistration(raw: string, ip?: string | null): Promise<{ ok: true; car: CarRow; reg: string } | { ok: false; message: string }> {
  const reg = raw.replace(/\s+/g, "").toUpperCase();
  if (!reg) return { ok: false, message: "Please provide a valid registration no" };
  const cached = await db.vehicledatas.findFirst({ where: { reg }, orderBy: { id: "desc" } });
  if (cached) {
    const car = await db.cars.findUnique({ where: { id: cached.car_id } });
    if (car) return { ok: true, car: toRow(car), reg };
  }
  const appid = process.env.VEHICLESMART_APPID;
  if (!appid) return { ok: false, message: "Vehicle lookup is not configured (VEHICLESMART_APPID)." };
  let data: { Success?: boolean; VehicleDetails?: Record<string, string | number> };
  try {
    const r = await fetch(`https://api.vehiclesmart.com/rest/vehicleData?reg=${encodeURIComponent(reg)}&appid=${appid}&isRefreshing=false&dvsaFallbackMode=false`, { cache: "no-store" });
    data = await r.json();
  } catch {
    return { ok: false, message: "Vehicle lookup is unavailable right now. Please try again." };
  }
  const d = data.VehicleDetails;
  if (!data.Success || !d) return { ok: false, message: "Please provide a valid registration no" };
  const make = await findOrCreateMake(String(d.Make ?? ""));
  const modelName = String(d.Model ?? "");
  const model = await db.modals.findFirst({ where: { make_id: make.id, OR: [{ name: { contains: modelName } }, { search_keywords: { contains: modelName } }] } });
  if (!model) {
    const now = new Date();
    await db.modeldatas.create({ data: { make_id: make.id, name: modelName, status: "pending", created_at: now, updated_at: now } });
  }
  const engine = fixEngine(ccToLitres(Number(d.CylinderCapacity ?? 0)), make.name);
  const car = await findOrCreateCar({ make: make.name, model: modelName, year: String(d.Year ?? ""), engine, fuel: String(d.Fuel ?? "") });
  await rememberReg(car.id, reg, ip);
  return { ok: true, car: toRow(car), reg };
}
