import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { distanceMiles } from "@/lib/geo";

export const ORDER_FILTERS = {
  all: "All orders",
  new: "New orders (today)",
  today: "Today’s bookings",
  tomorrow: "Tomorrow’s bookings",
  progress: "In progress",
  accepted: "Accepted",
  completed: "Completed",
  rejected: "Rejected",
  unverified: "Unverified (no payment)",
  inactive: "Inactive",
  assigned: "Assigned",
  open: "Order management",
} as const;
export type OrderFilter = keyof typeof ORDER_FILTERS;

const include = {
  users: { select: { fname: true, lname: true } },
  postcodes: { include: { cities: { select: { name: true } } } },
  ordertracks: { include: { services: { select: { name: true } } } },
  orderrequests: { select: { id: true } },
  orderpayments: { select: { id: true }, take: 1 },
  timeslots: { select: { end_at: true } },
  orderassigns: {
    take: 1,
    orderBy: { id: "asc" as const },
    include: { users: { select: { company: true, fname: true, lname: true } }, assignlabours: { select: { description: true } } },
  },
} satisfies Prisma.ordersInclude;

type Row = Prisma.ordersGetPayload<{ include: typeof include }>;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Mirrors Admin\Order\OrderController list methods. */
async function fetchFiltered(filter: OrderFilter): Promise<Row[]> {
  const now = new Date();
  const today = startOfDay(now);
  const byAssign = async (from: Date, status?: string) => {
    const a = await db.orderassigns.findMany({
      where: { start_at: { gte: from, lt: addDays(from, 1) }, ...(status ? { status } : {}) },
      orderBy: { id: "desc" },
      select: { order_id: true },
    });
    const ids = a.map((x) => x.order_id);
    const rows = await db.orders.findMany({ where: { id: { in: ids } }, include });
    return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Row[];
  };
  switch (filter) {
    case "new":
      return db.orders.findMany({ where: { created_at: { gte: today, lt: addDays(today, 1) } }, orderBy: { id: "desc" }, include });
    case "today":
      return byAssign(today, "assigned");
    case "tomorrow":
      return byAssign(addDays(today, 1));
    case "completed":
      return db.orders.findMany({ where: { status: "completed" }, orderBy: { id: "desc" }, include });
    case "accepted":
      return db.orders.findMany({ where: { status: "assigned" }, orderBy: { id: "desc" }, include });
    case "rejected":
      return db.orders.findMany({ where: { status: "rejected" }, orderBy: { id: "desc" }, include });
    case "unverified":
      return db.orders.findMany({ where: { orderpayments: { none: {} } }, orderBy: { id: "asc" }, include });
    case "assigned":
    case "progress":
      // The Laravel "progress" route points at a missing method; it shows the same set as "assigned".
      return (await db.orders.findMany({ where: { orderassigns: { some: {} } }, orderBy: { id: "asc" }, include })).filter((o) => o.orderassigns[0]?.status === "assigned");
    case "inactive": {
      const rows = await db.orders.findMany({ where: { status: "pending", order_for: "inspection and mot", orderassigns: { none: {} }, timeslots: { some: {} } }, orderBy: { id: "asc" }, include });
      return rows.filter((o) => {
        const last = o.timeslots.map((t) => t.end_at).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
        return last ? now.getTime() > addDays(last, 7).getTime() : false;
      });
    }
    case "open":
      // Dashboard "Order Management": everything not rejected or completed.
      return db.orders.findMany({ where: { status: { notIn: ["rejected", "completed"] } }, orderBy: { id: "desc" }, include });
    default:
      return db.orders.findMany({ orderBy: { id: "desc" }, include });
  }
}

export async function listAdminOrders(filter: OrderFilter, q?: string) {
  const all = await fetchFiltered(filter);
  // The Laravel list only renders orders that are assigned, MOT/inspection, or priced.
  const visible = all.filter((o) => o.orderassigns.length > 0 || o.order_for === "inspection and mot" || Number(o.price ?? 0) > 0);
  const counts = await messageCounts(visible.filter((o) => o.orderassigns[0]).map((o) => ({ order: o.id, mechanic: o.orderassigns[0].user_id })));
  const term = q?.trim().toLowerCase();

  return visible
    .map((o) => {
      const car = parseCar(o.car_data);
      const a = o.orderassigns[0];
      const accepted = !!a && (o.status === "assigned" || o.status === "completed");
      return {
        id: Number(o.id),
        reg: car.reg ?? "",
        customer: `${o.users.fname} ${o.users.lname}`.trim(),
        work: [...o.ordertracks.map((t) => t.services.name), ...(a?.assignlabours.map((l) => l.description ?? "") ?? [])].filter(Boolean),
        city: o.postcodes.cities?.name ?? "",
        postcode: o.postcodes.postcode,
        status: o.status,
        verified: o.orderpayments.length > 0,
        notified: o.orderrequests.length,
        accepted: accepted ? { company: a.users.company || `${a.users.fname} ${a.users.lname}`, at: a.created_at?.toISOString() ?? null, slot: [a.time, a.date].filter(Boolean).join(" ") } : null,
        mechanicId: a ? Number(a.user_id) : null,
        messages: a ? (counts.get(`${o.id}:${a.user_id}`) ?? 0) : 0,
        tone: accepted ? "ok" : o.orderrequests.length > 0 ? "warn" : "danger",
        created: o.created_at?.toISOString() ?? null,
      } as const;
    })
    .filter((r) => !term || [r.id, r.reg, r.customer, r.city, r.postcode, r.status, ...r.work].join(" ").toLowerCase().includes(term));
}

async function messageCounts(pairs: { order: bigint; mechanic: bigint }[]) {
  const m = new Map<string, number>();
  if (!pairs.length) return m;
  const rows = await db.resolutions.findMany({
    where: { order_id: { in: pairs.map((p) => p.order) } },
    select: { order_id: true, sender_id: true, receiver_id: true },
  });
  for (const p of pairs) {
    const k = `${p.order}:${p.mechanic}`;
    m.set(k, rows.filter((r) => r.order_id === p.order && (r.sender_id === p.mechanic || r.receiver_id === p.mechanic)).length);
  }
  return m;
}

export async function getAdminOrder(id: number) {
  const o = await db.orders.findUnique({
    where: { id: BigInt(id) },
    include: {
      users: true,
      postcodes: { include: { cities: { include: { counties: true } } } },
      ordertracks: { include: { services: { include: { parts: true } } } },
      timeslots: { orderBy: { id: "asc" } },
      orderpayments: { take: 1 },
      adminquotes: { take: 1, include: { adminquotedetails: true } },
      orderrequests: { include: { users: true, orderrequestquotes: { take: 1 } } },
      orderassigns: {
        take: 1,
        orderBy: { id: "asc" },
        include: { users: true, assignlabours: true, assignparts: true, assignfiles: true, assignfaults: true, assignservices: true },
      },
    },
  });
  if (!o) return null;
  const car = parseCar(o.car_data);
  const a = o.orderassigns[0] ?? null;
  const lat = Number(o.postcodes.lat);
  const lng = Number(o.postcodes.long);

  // Part prices: a car-specific price row wins over the part's default (orderdetails.blade.php).
  const partIds = o.ordertracks.flatMap((t) => t.services.parts.map((p) => p.id));
  const prices = partIds.length ? await db.prices.findMany({ where: { part_id: { in: partIds } } }) : [];
  const parts = o.ordertracks.flatMap((t) =>
    t.services.parts
      .filter((p) => p.name !== "MOT" && !(car.fuel === "Diesel" && p.name === "Spark Plugs"))
      .map((p) => ({ name: p.name, price: Number(prices.find((x) => x.part_id === p.id)?.price ?? p.price) })),
  );

  const mechanics = await db.users.findMany({ where: { role_id: 1 }, select: { id: true, company: true, email: true, status: true, lat: true, long: true, post_code: true } });
  const payment = o.orderpayments[0] ?? null;
  const adminQuote = o.adminquotes[0] ?? null;
  const messages = a
    ? await db.resolutions.count({ where: { order_id: o.id, OR: [{ sender_id: a.user_id }, { receiver_id: a.user_id }] } })
    : 0;

  return {
    id: Number(o.id),
    token: o.token,
    status: o.status,
    service: o.order_for,
    price: Number(o.price ?? 0),
    notes: o.notes,
    sscNotes: o.notes_by_ssc,
    car,
    carTitle: carTitle(car),
    created: o.created_at?.toISOString() ?? null,
    driveable: o.drive_able,
    fiveMileDrop: o.five_mile_drop,
    collection: o.free_collection_delivery,
    location: { street: o.users.street ?? "", city: o.postcodes.cities?.name ?? "", county: o.postcodes.cities?.counties?.name ?? "", postcode: o.postcodes.postcode, lat, lng },
    customer: {
      id: Number(o.users.id),
      name: `${o.users.fname} ${o.users.lname}`.trim(),
      email: o.users.email,
      phone: o.users.phone,
      street: o.users.street ?? "",
      city: o.users.city ?? "",
      county: o.users.county ?? "",
      postcode: o.users.post_code ?? "",
    },
    timeslots: o.timeslots.map((t) => ({ time: t.time, date: t.date })),
    work: o.ordertracks.map((t) => t.services.name),
    parts,
    payment: payment ? { status: payment.status ?? "—", total: Number(payment.total_payment ?? 0), fee: Number(payment.platform_fee ?? 0), mechanic: Number(payment.mechanic_payment ?? 0) } : null,
    adminQuote: adminQuote && adminQuote.status === "Sent" ? adminQuote.adminquotedetails.map((d) => ({ name: d.name, price: Number(d.price), type: d.type })) : null,
    assigned: a
      ? {
          id: Number(a.id),
          mechanicId: Number(a.user_id),
          company: a.users.company || "Not provided",
          mechanicName: `${a.users.fname} ${a.users.lname}`.trim(),
          mechanicPhone: a.users.phone,
          status: a.status,
          time: a.time,
          date: a.date,
          price: Number(a.price ?? 0),
          mileage: Number(a.mileage ?? 0),
          completedAt: a.status === "completed" ? (a.updated_at?.toISOString() ?? null) : null,
          labours: a.assignlabours.map((l) => ({ id: Number(l.id), description: l.description ?? "", price: Number(l.labour) })),
          parts: a.assignparts.map((p) => ({ id: Number(p.id), description: p.description ?? "", price: Number(p.price) })),
          services: a.assignservices.map((s) => ({ name: s.name, labour: Number(s.labour) })),
          photos: a.assignfiles.map((f) => ({ id: Number(f.id), image: f.image, description: f.description })),
          faults: a.assignfaults.map((f) => ({ id: Number(f.id), description: f.description, urgency: f.urgency, code: f.trouble_code, fixed: f.fixed })),
        }
      : null,
    requests: o.orderrequests
      .filter((r) => r.users)
      .map((r) => {
        const q = r.orderrequestquotes[0];
        return {
          id: Number(r.id),
          mechanicId: Number(r.user_id),
          company: r.users.company || r.users.email,
          status: r.status,
          active: r.users.status,
          miles: distanceMiles(Number(r.users.lat ?? 0), Number(r.users.long ?? 0), lat, lng),
          quotation: q && q.status === "QUOTATION SENT" ? Number(q.price) : null,
        };
      }),
    mechanics: mechanics
      .map((m) => ({
        id: Number(m.id),
        label: m.company || m.email,
        active: m.status,
        postcode: m.post_code ?? "",
        lat: m.lat === null ? null : Number(m.lat),
        lng: m.long === null ? null : Number(m.long),
        miles: distanceMiles(Number(m.lat ?? 0), Number(m.long ?? 0), lat, lng),
      }))
      .sort((x, y) => x.miles - y.miles),
    messages,
  };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/** Keep order.price in step with the assignment total, as every Laravel labour/part action does. */
export async function adjustAssignPrice(assignId: bigint, delta: number) {
  const a = await db.orderassigns.findUnique({ where: { id: assignId } });
  if (!a) throw new Error("assignment not found");
  const price = new Prisma.Decimal(Number(a.price ?? 0) + delta);
  const now = new Date();
  await db.orderassigns.update({ where: { id: assignId }, data: { price, updated_at: now } });
  await db.orders.update({ where: { id: a.order_id }, data: { price, updated_at: now } });
  return a.order_id;
}
