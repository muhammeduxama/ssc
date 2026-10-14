import "server-only";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";

export const orderCardInclude = {
  postcodes: { include: { cities: { include: { counties: true } } } },
  users: true,
  orderpayments: { take: 1 },
  ordertracks: { include: { services: { select: { name: true } } } },
  timeslots: { orderBy: { id: "asc" as const }, take: 1 },
  adminquotes: { take: 1 },
  quotechats: { select: { id: true }, take: 1 },
  orderassigns: { take: 1, include: { users: true, assignlabours: true, assignparts: true } },
} as const;

export type CardOrder = NonNullable<Awaited<ReturnType<typeof loadCardOrders>>>[number];
export const loadCardOrders = (where: object) => db.orders.findMany({ where, orderBy: { id: "desc" }, include: orderCardInclude });

export const carOf = (raw: string | null) => {
  const c = parseCar(raw);
  return { ...c, title: carTitle(c), line: [c.make, c.model, c.year, c.engine, c.fuel].filter(Boolean).join(" ") };
};

export const paid = (o: { orderpayments: { status: string | null }[] }) => o.orderpayments[0]?.status === "Success";
