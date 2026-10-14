import "server-only";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { distanceMiles } from "@/lib/geo";

export const QUOTE_FILTERS = {
  all: "All quotations",
  new: "New quotations (today)",
  yesterday: "Yesterday quotations",
  "not-responded": "Not responded",
  closed: "Closed quotations",
} as const;
export type QuoteFilter = keyof typeof QUOTE_FILTERS;

const day = (d: Date, n = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Admin\Quote\QuoteController list methods. */
export async function listQuotes(filter: QuoteFilter, q?: string) {
  const now = new Date();
  const base = { order_for: "repairs" };
  const where =
    filter === "new"
      ? { ...base, price: null, created_at: { gte: day(now), lt: day(now, 1) } }
      : filter === "yesterday"
        ? { ...base, price: null, created_at: { gte: day(now, -1), lt: day(now) } }
        : filter === "not-responded"
          ? { ...base, status: "pending", orderrequests: { none: {} } }
          : filter === "closed"
            ? { ...base, status: "rejected" }
            : { ...base, price: null };
  const rows = await db.orders.findMany({
    where,
    orderBy: { id: filter === "all" ? "desc" : "asc" },
    include: {
      users: { select: { fname: true, lname: true } },
      postcodes: { include: { cities: { select: { name: true } } } },
      adminquotes: { take: 1, select: { status: true } },
      orderrequests: { select: { orderrequestquotes: { take: 1, select: { status: true } } } },
    },
  });
  const term = q?.trim().toLowerCase();
  return rows
    .map((o) => {
      const car = parseCar(o.car_data);
      const responded = o.orderrequests.filter((r) => r.orderrequestquotes[0]?.status === "QUOTATION SENT").length;
      const viewed = o.orderrequests.filter((r) => r.orderrequestquotes[0]).length;
      const sent = o.adminquotes[0]?.status === "Sent";
      const notified = o.orderrequests.length;
      return {
        id: Number(o.id),
        reg: car.reg ?? "",
        customer: `${o.users.fname} ${o.users.lname}`.trim(),
        city: o.postcodes.cities?.name ?? "",
        postcode: o.postcodes.postcode,
        notes: (o.notes ?? "").split(/\s+/).slice(0, 4).join(" "),
        status: o.status,
        notified,
        adminSent: sent,
        responded,
        viewed,
        tone: sent || (responded > 0 && notified > 0) ? "ok" : notified > 0 ? "warn" : "danger",
        created: o.created_at?.toISOString() ?? null,
      } as const;
    })
    .filter((r) => !term || [r.id, r.reg, r.customer, r.city, r.postcode, r.notes].join(" ").toLowerCase().includes(term));
}

/** QuoteController@sentEstimates: all bespoke estimates. */
export async function listEstimates() {
  const rows = await db.bespokes.findMany({
    orderBy: { id: "desc" },
    include: { users: { select: { company: true, fname: true, lname: true } }, bespokeusers: { take: 1 }, bespokeparts: true, bespokelabours: true },
  });
  return rows.map((b) => {
    const car = parseCar(b.car_data);
    const cust = b.bespokeusers[0];
    return {
      id: Number(b.id),
      reg: car.reg ?? "",
      customer: cust ? `${cust.fname ?? ""} ${cust.lname ?? ""}`.trim() || cust.email : "—",
      sentBy: b.users.company || `${b.users.fname} ${b.users.lname}`,
      postcode: b.postcode ?? "",
      price: Number(b.price),
      status: b.status,
      parts: b.bespokeparts.map((p) => `${p.name} (£${Number(p.price).toFixed(2)})`),
      labours: b.bespokelabours.map((l) => `${l.name} ${l.hour}h (£${Number(l.price).toFixed(2)})`),
      created: b.created_at?.toISOString() ?? null,
    };
  });
}

export async function getQuote(id: number) {
  const o = await db.orders.findUnique({
    where: { id: BigInt(id) },
    include: {
      users: true,
      postcodes: { include: { cities: true } },
      ordertracks: { include: { services: { select: { name: true } } } },
      adminquotes: { take: 1, include: { adminquotedetails: { orderBy: { id: "asc" } } } },
      orderrequests: {
        include: {
          users: true,
          orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } },
        },
      },
      quotechats: { orderBy: { id: "asc" } },
    },
  });
  if (!o) return null;
  const car = parseCar(o.car_data);
  const lat = Number(o.postcodes.lat);
  const lng = Number(o.postcodes.long);
  const [mechanics, areaMechanics] = await Promise.all([
    db.users.findMany({ where: { role_id: 1 }, select: { id: true, company: true, email: true, status: true, lat: true, long: true, post_code: true } }),
    db.users.findMany({ where: { role_id: 1, post_code: o.postcodes.postcode }, select: { id: true, company: true, email: true } }),
  ]);
  const aq = o.adminquotes[0] ?? null;
  const services = o.ordertracks.map((t) => t.services.name);
  return {
    id: Number(o.id),
    token: o.token,
    status: o.status,
    notes: o.notes,
    car,
    carTitle: carTitle(car),
    created: o.created_at?.toISOString() ?? null,
    updated: o.updated_at?.toISOString() ?? null,
    customer: { id: Number(o.users.id), name: `${o.users.fname} ${o.users.lname}`.trim(), email: o.users.email, phone: o.users.phone, street: o.users.street ?? "" },
    postcode: o.postcodes.postcode,
    city: o.postcodes.cities?.name ?? "",
    center: { lat, lng },
    services,
    adminQuote: aq
      ? { id: Number(aq.id), status: aq.status, price: Number(aq.price ?? 0), notes: aq.notes, lines: aq.adminquotedetails.map((d) => ({ id: Number(d.id), name: d.name, price: Number(d.price), type: d.type })) }
      : null,
    requests: o.orderrequests
      .filter((r) => r.users)
      .map((r) => {
        const q = r.orderrequestquotes[0];
        return {
          id: Number(r.id),
          mechanic: r.users.company || r.users.email,
          mechanicId: Number(r.user_id),
          active: r.users.status,
          miles: distanceMiles(Number(r.users.lat ?? 0), Number(r.users.long ?? 0), lat, lng),
          status: r.status,
          quote: q
            ? {
                id: Number(q.id),
                status: q.status ?? "",
                price: Number(q.price),
                at: q.updated_at?.toISOString() ?? null,
                labours: q.orderrequestquotelabours.map((l) => ({ name: l.name, price: Number(l.price) })),
                parts: q.orderrequestquoteparts.map((p) => ({ name: p.name, price: Number(p.price) })),
              }
            : null,
        };
      }),
    areaMechanics: areaMechanics.map((m) => ({ id: Number(m.id), label: m.company || m.email })),
    mechanics: mechanics
      .map((m) => ({ id: Number(m.id), label: m.company || m.email, active: m.status, postcode: m.post_code ?? "", lat: m.lat === null ? null : Number(m.lat), lng: m.long === null ? null : Number(m.long), miles: distanceMiles(Number(m.lat ?? 0), Number(m.long ?? 0), lat, lng) }))
      .sort((a, b) => a.miles - b.miles),
    chat: o.quotechats.map((c) => ({ id: Number(c.id), sender: c.sender, text: c.message ?? "", file: c.file, at: (c.created_at ?? new Date()).toISOString() })),
  };
}
export type AdminQuoteView = NonNullable<Awaited<ReturnType<typeof getQuote>>>;
