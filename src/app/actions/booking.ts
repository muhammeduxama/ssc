"use server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { buildCart, addToBasket, removeFromBasket, type Cart } from "@/lib/booking/pricing";
import { findOrCreatePostcode } from "@/lib/booking/postcode";
import { clearBooking, getBooking, loadBooking, setBooking, updateBooking } from "@/lib/booking/state";
import { customerFromBookingForm, randomToken } from "@/lib/customer";
import { storeCard } from "@/lib/booking/stripe";
import { db } from "@/lib/db";
import { distanceMiles } from "@/lib/geo";
import { schedule } from "@/lib/jobs/queue";
import { queueMail } from "@/lib/mail/send";
import { newOrderCustomer, newOrderToAdmin, quotationReceived } from "@/lib/mail/templates";
import { parseCar } from "@/lib/format";
import { slotStart, TIME_SLOTS } from "@/lib/time";
import { findOrCreateCar, lookupRegistration } from "@/lib/vehicle";
import { MIN, TOO_MANY, allow } from "@/lib/rate-limit";

type R = { ok: boolean; message: string; link?: string };
const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);

/** AjaxController@postCode — registration + postcode → /choose-category */
export async function startBooking(reg: string, postcode: string): Promise<R> {
  if (!reg.trim() || !postcode.trim()) return { ok: false, message: "Please enter your registration number and postcode." };
  // Each lookup costs money with the vehicle-data provider.
  if (!(await allow(["vehicle", 20, 60 * MIN]))) return { ok: false, message: TOO_MANY };
  const p = await findOrCreatePostcode(postcode);
  if (!p.ok) return p;
  const r = await lookupRegistration(reg, await ip());
  if (!r.ok) return r;
  await setBooking({ postcodeId: String(p.postcode.id), carId: String(r.car.id), reg: r.reg, cart: [], slots: [] });
  return { ok: true, message: "Vehicle found", link: "/choose-category" };
}

/** AjaxController@unknownReg — postcode + make/model/fuel/engine/year picked by hand. */
export async function startBookingManual(form: FormData): Promise<R> {
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const ids = ["make", "model", "fuel", "engine"].map((k) => g(k));
  if (!g("postcode") || ids.some((v) => !/^\d+$/.test(v)) || !g("year")) return { ok: false, message: "Please fill in your postcode and every vehicle field." };
  const p = await findOrCreatePostcode(g("postcode"));
  if (!p.ok) return p;
  const [make, model, fuel, engine] = await Promise.all([
    db.makes.findUnique({ where: { id: BigInt(ids[0]) } }),
    db.modals.findUnique({ where: { id: BigInt(ids[1]) } }),
    db.fuels.findUnique({ where: { id: BigInt(ids[2]) } }),
    db.engines.findUnique({ where: { id: BigInt(ids[3]) } }),
  ]);
  if (!make || !model || !fuel || !engine) return { ok: false, message: "Please choose your vehicle again." };
  const car = await findOrCreateCar({ make: make.name, model: model.name, fuel: fuel.fuel, engine: Number(engine.name).toFixed(1), year: g("year") }, "API");
  await setBooking({ postcodeId: String(p.postcode.id), carId: String(car.id), reg: null, cart: [], slots: [] });
  return { ok: true, message: "Vehicle saved", link: "/choose-category" };
}

async function cartFor(ids: number[]): Promise<Cart | null> {
  const b = await loadBooking();
  if (!b) return null;
  return buildCart(ids, b.car, b.postcode.id);
}

/** CartController@addToCart (flag = add with the discounted MOT). */
export async function basketAdd(id: number, withMot = false): Promise<{ ok: boolean; message: string; cart?: Cart; ids?: number[] }> {
  const b = await getBooking();
  if (!b) return { ok: false, message: "Your session has expired. Please start again." };
  const ids = addToBasket(b.cart, id, withMot);
  const cart = await cartFor(ids);
  if (!cart) return { ok: false, message: "Your session has expired. Please start again." };
  const item = cart.items?.[String(id)]?.item;
  if (item?.quote === 1) return { ok: false, message: "This service needs a quote." };
  await updateBooking({ cart: ids });
  return { ok: true, message: "Added to basket", cart, ids };
}

/** CartController@removeFromCart / removeFromCartwithmot */
export async function basketRemove(id: number, withMot = false): Promise<{ ok: boolean; message: string; cart?: Cart; ids?: number[] }> {
  const b = await getBooking();
  if (!b) return { ok: false, message: "Your session has expired. Please start again." };
  const ids = removeFromBasket(b.cart, id, withMot);
  const cart = await cartFor(ids);
  await updateBooking({ cart: ids });
  return { ok: true, message: "Removed from basket", cart: cart ?? { items: null, totalPrice: 0 }, ids };
}

/** Choosing a new category empties the basket (OrderController@selectService). */
export async function basketReset() {
  await updateBooking({ cart: [] });
}

const isFutureSlot = (s: { date: string; time: string }) => {
  const d = slotStart(s.date, s.time);
  return !!d && TIME_SLOTS.includes(s.time) && d.getTime() > Date.now();
};

const yes = (v: FormDataEntryValue | null) => String(v) === "Yes";

function needAnswers(form: FormData): string | null {
  if (!form.get("rd_safe_drive")) return "Select option, either your vehicle is drive able?";
  if (!form.get("rd_mobile_mech")) return "Select option about garage free collection & delivery service";
  if (!form.get("drop_off_location")) return "Select option drop off the vehicle at a vetted garage within 5 miles";
  return null;
}

const carData = async (car: { make: string; model: string; fuel: string; engine: string; year: string }, reg: string | null) => {
  const make = await db.makes.findFirst({ where: { name: car.make } });
  return JSON.stringify({ make: car.make, model: car.model, fuel: car.fuel, engine: car.engine, year: car.year, logo: make?.icon ?? null, reg: reg ?? "UNKNOWN" });
};

/** OrderController@orderSchedule + @saveOrder */
export async function placeOrder(form: FormData): Promise<R> {
  const b = await loadBooking();
  if (!b || !b.booking.cart.length) return { ok: false, message: "Your basket is empty. Please start again.", link: "/" };
  let slots: { date: string; time: string }[] = [];
  try {
    slots = (JSON.parse(String(form.get("slots") ?? "[]")) as { date: string; time: string }[]).filter(isFutureSlot);
  } catch {}
  if (!slots.length) return { ok: false, message: "Please select at least one date and time slot." };
  const missing = needAnswers(form);
  if (missing) return { ok: false, message: missing };
  if (!form.get("terms")) return { ok: false, message: "Please accept the terms and conditions." };
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!g("house_no") || !g("street") || !g("city")) return { ok: false, message: "House no, street and city are required." };

  const who = await customerFromBookingForm({ first_name: g("first_name"), last_name: g("last_name"), email: g("email"), password: String(form.get("password") ?? ""), phone: g("phone") }, await ip());
  if (!who.ok) return who;
  const user = who.user;
  const cart = await buildCart(b.booking.cart, b.car, b.postcode.id);
  if (!cart.items) return { ok: false, message: "Your basket is empty. Please start again.", link: "/" };
  if (Object.values(cart.items).some((i) => i.item.quote === 1)) return { ok: false, message: "One of your services needs a quote. Please remove it from the basket." };

  const now = new Date();
  const order = await db.$transaction(async (tx) => {
    await tx.users.update({ where: { id: user.id }, data: { street: g("street"), house_no: g("house_no"), city: g("city"), updated_at: now } });
    const o = await tx.orders.create({
      data: {
        user_id: user.id,
        notes: g("notes") || null,
        order_for: "inspection and mot",
        postcode_id: b.postcode.id,
        price: dec(cart.totalPrice),
        token: randomToken(100),
        free_collection_delivery: yes(form.get("rd_mobile_mech")),
        drive_able: yes(form.get("rd_safe_drive")),
        five_mile_drop: yes(form.get("drop_off_location")),
        car_data: await carData(b.car, b.booking.reg),
        created_at: now,
        updated_at: now,
      },
    });
    await tx.cartdatas.create({ data: { order_id: o.id, data: JSON.stringify(cart), created_at: now, updated_at: now } });
    let inspection = false;
    for (const it of Object.values(cart.items!)) {
      await tx.ordertracks.create({ data: { order_id: o.id, service_id: BigInt(it.item.id), price: dec(it.price), created_at: now, updated_at: now } });
      if (it.item.maincategory_id === 3) inspection = true;
    }
    if (inspection) await tx.orders.update({ where: { id: o.id }, data: { inspection: true } });
    for (const s of slots) {
      const start = slotStart(s.date, s.time)!;
      await tx.timeslots.create({ data: { order_id: o.id, date: s.date, time: s.time, start_at: start, end_at: new Date(start.getTime() + 2 * 3600_000), created_at: now, updated_at: now } });
    }
    return o;
  });
  await clearBooking();
  return { ok: true, message: "Booking saved. Please add your card to confirm it.", link: `/get-payment-info/${order.id}` };
}

/** OrderController@saveRepairquote */
export async function saveRepairQuote(serviceId: number, form: FormData): Promise<R> {
  const b = await loadBooking();
  if (!b) return { ok: false, message: "Your session has expired. Please start again.", link: "/" };
  const service = await db.services.findUnique({ where: { id: BigInt(serviceId) } });
  if (!service) return { ok: false, message: "Service not found.", link: "/choose-category" };
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!form.get("terms")) return { ok: false, message: "Please accept the terms and conditions." };
  if (!g("house_no") || !g("street")) return { ok: false, message: "House no and street are required." };
  const who = await customerFromBookingForm({ first_name: g("first_name"), last_name: g("last_name"), email: g("email"), password: String(form.get("password") ?? ""), phone: g("phone") }, await ip());
  if (!who.ok) return who;
  const user = who.user;
  const now = new Date();
  const order = await db.$transaction(async (tx) => {
    await tx.users.update({ where: { id: user.id }, data: { street: g("street"), house_no: g("house_no"), city: g("city") || user.city, updated_at: now } });
    const o = await tx.orders.create({
      data: { user_id: user.id, postcode_id: b.postcode.id, notes: g("service") || service.name, order_for: "repairs", car_data: await carData(b.car, b.booking.reg), token: randomToken(100), created_at: now, updated_at: now },
    });
    await tx.ordertracks.create({ data: { order_id: o.id, service_id: service.id, created_at: now, updated_at: now } });
    await tx.notifications.create({
      data: { link: `/admin/quotes/view/${o.id}`, title: `New Quotation is Received in ${b.postcode.postcode}`, description: `New quotation #${o.id} is received in ${b.postcode.postcode}`, created_at: now, updated_at: now },
    });
    return o;
  });
  queueMail(newOrderToAdmin({ type: "quote", orderId: order.id, postcode: b.postcode.postcode, service: service.name }));
  queueMail(quotationReceived(user, { id: order.id, car: parseCar(order.car_data), services: [service.name] }), 20_000);
  return { ok: true, message: "Your quote request has been sent", link: `/services/${order.id}/status` };
}

/** PaymentController@saveCardForLaterUse */
export async function saveCard(orderId: number, setupIntentId: string): Promise<R> {
  const r = await storeCard(BigInt(orderId), setupIntentId);
  if (!r.ok) return r;
  const order = await db.orders.findUniqueOrThrow({
    where: { id: r.order.id },
    include: { postcodes: { include: { cities: { include: { counties: true } } } }, orderassigns: { take: 1 }, timeslots: true, ordertracks: { include: { services: { include: { parts: true } } } } },
  });
  if (!order.orderassigns.length) {
    const service = order.ordertracks.map((t, i) => `${i + 1}. ${t.services.name}, `).join("");
    const price = Number(order.price ?? 0);
    const now = new Date();
    await db.notifications.create({ data: { link: `/admin/orders/view/${order.id}`, title: `New Order is Received in ${order.postcodes.postcode}`, description: `New order #${order.id} is received in ${order.postcodes.postcode}`, created_at: now, updated_at: now } });
    queueMail(newOrderToAdmin({ type: "order", orderId: order.id, postcode: order.postcodes.postcode, service, price }));
    queueMail(
      newOrderCustomer(r.me, {
        id: order.id,
        price,
        car: parseCar(order.car_data),
        services: order.ordertracks.map((t) => ({ name: t.services.name, parts: t.services.parts.filter((p) => p.name !== "MOT").map((p) => p.name) })),
        slots: order.timeslots.map((s) => ({ date: s.date, time: s.time })),
        address: [order.postcodes.postcode, order.postcodes.cities.name, order.postcodes.cities.counties.name].join(" - "),
      }),
      20_000,
    );
    const mechanics = await db.users.findMany({ where: { role_id: 1, lat: { not: null }, long: { not: null }, radius: { not: null } } });
    for (const m of mechanics) {
      const d = distanceMiles(Number(order.postcodes.lat), Number(order.postcodes.long), Number(m.lat), Number(m.long));
      if (d > Number(m.radius)) continue;
      const exists = await db.orderrequests.findFirst({ where: { order_id: order.id, user_id: m.id } });
      if (!exists) await db.orderrequests.create({ data: { order_id: order.id, user_id: m.id, created_at: now, updated_at: now } });
      for (const delay of [20_000, 3600_000, 3 * 3600_000]) await schedule("informMechanic", { orderId: String(order.id), mechanicId: String(m.id) }, delay);
    }
  }
  return { ok: true, message: "Your card is saved. We are finding the best mechanic for you.", link: `/services/${order.id}/status` };
}

/** OrderController@searchService — repair search box on the services page (category 1, active, 10 max). */
export async function searchRepairs(q: string): Promise<{ id: number; name: string; price: number; quote: 0 | 1; description: string | null }[]> {
  const b = await loadBooking();
  if (!b || q.trim().length < 1) return [];
  const rows = await db.services.findMany({ where: { maincategory_id: 1, status: true, name: { contains: q.trim() } }, orderBy: { name: "asc" }, take: 10, select: { id: true } });
  const { priceServices, labourRate } = await import("@/lib/booking/pricing");
  const priced = await priceServices(rows.map((r) => r.id), b.car, await labourRate(b.postcode.id));
  return rows.map((r) => priced.get(Number(r.id))).filter((p) => !!p).map((p) => ({ id: p.id, name: p.name, price: Math.round(p.price * 100) / 100, quote: p.quote, description: p.description }));
}
