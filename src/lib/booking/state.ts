import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { secureCookies, sessionSecret } from "@/lib/session";

const COOKIE = "ssc-booking";
const key = new TextEncoder().encode(sessionSecret());

/** What Laravel kept in the session during booking: postcode, car, reg, cart and chosen time slots. */
export type Booking = {
  postcodeId: string;
  carId: string;
  reg: string | null;
  cart: number[];
  slots: { date: string; time: string }[];
  /** Bespoke acceptance: token of the bespoke estimate being booked. */
  bespoke?: string;
};

export async function getBooking(): Promise<Booking | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key);
    return payload.b as Booking;
  } catch {
    return null;
  }
}

export async function setBooking(b: Booking) {
  const token = await new SignJWT({ b }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2d").sign(key);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookies, path: "/", maxAge: 60 * 60 * 48 });
}

export async function updateBooking(patch: Partial<Booking>) {
  const b = await getBooking();
  if (!b) return null;
  const next = { ...b, ...patch };
  await setBooking(next);
  return next;
}

export async function clearBooking() {
  (await cookies()).delete(COOKIE);
}

/** Loads the rows the booking points at; null if the booking is missing or stale. */
export async function loadBooking() {
  const b = await getBooking();
  if (!b) return null;
  const [postcode, car] = await Promise.all([
    db.postcodes.findUnique({ where: { id: BigInt(b.postcodeId) }, include: { cities: true, counties: true } }),
    db.cars.findUnique({ where: { id: BigInt(b.carId) } }),
  ]);
  if (!postcode || !car) return null;
  return { booking: b, postcode, car };
}
