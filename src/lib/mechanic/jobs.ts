import "server-only";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { distanceMiles } from "@/lib/geo";

export async function settings() {
  const s = await db.settings.findFirst({ orderBy: { id: "desc" } });
  return {
    labourRate: Number(s?.labour_rate ?? 60),
    labourHourLimit: Number(s?.labour_hour_limit ?? 1),
    commissionPct: Number(s?.garage_comission ?? 0),
    maxCommission: Number(s?.max_commission ?? 0),
  };
}

/** OrderassignResource: commission = min(price × pct, max). */
export const commissionFor = (price: number, s: { commissionPct: number; maxCommission: number }) => {
  const c = Math.round((s.commissionPct / 100) * price * 100) / 100;
  return c > s.maxCommission ? s.maxCommission : c;
};
/** OrderassignResource: 'stripe' => round(0.20 + price × 1.4%) (rounded to whole pounds, as Laravel does). */
export const stripeFeeFor = (price: number) => Math.round(0.2 + price * 0.014);

async function me(id: string) {
  const u = await db.users.findUnique({ where: { id: BigInt(id) }, include: { requiredocs: { select: { status: true } }, userstripes: { take: 1 } } });
  if (!u) throw new Error("mechanic not found");
  return u;
}

/** Mechanic\HomeController@index */
export async function mechanicHome(id: string) {
  const uid = BigInt(id);
  const [completed, progress, reqs, u] = await Promise.all([
    db.orderassigns.count({ where: { user_id: uid, status: "completed" } }),
    db.orderassigns.count({ where: { user_id: uid, status: "assigned" } }),
    db.orderrequests.findMany({ where: { user_id: uid, status: "pending" }, select: { orders: { select: { status: true, order_for: true } } } }),
    me(id),
  ]);
  const docs = u.requiredocs;
  return {
    completed,
    progress,
    requests: reqs.filter((r) => r.orders.status === "pending" && r.orders.order_for === "inspection and mot").length,
    docsUploaded: docs.length > 0,
    docsApproved: docs.length > 0 && docs.every((d) => d.status === "approved"),
    stripeConnected: !!u.userstripes[0]?.stripe_user_id,
    active: u.status,
  };
}

const orderInclude = {
  users: true,
  postcodes: { include: { cities: { include: { counties: true } } } },
  ordertracks: { include: { services: { include: { parts: true, maincategories: { select: { id: true } } } } } },
  timeslots: { orderBy: { id: "asc" as const } },
  adminquotes: { take: 1, include: { adminquotedetails: true } },
  orderassigns: { take: 1, select: { user_id: true } },
};

/** AppController@requestOrder: pending bookings offered to this mechanic (priced ones only). */
export async function jobRequests(mechanicId: string) {
  const u = await me(mechanicId);
  const rows = await db.orderrequests.findMany({
    where: { user_id: u.id, status: "pending", orders: { status: "pending", price: { gt: 0 } } },
    orderBy: { id: "desc" },
    include: { orders: { include: orderInclude } },
  });
  const s = await settings();
  return rows.map((r) => {
    const o = r.orders;
    const car = parseCar(o.car_data);
    const price = Number(o.price ?? 0);
    return {
      id: Number(r.id),
      orderId: Number(o.id),
      car: carTitle(car),
      reg: car.reg ?? "",
      service: o.order_for,
      work: o.ordertracks.map((t) => t.services.name),
      price,
      net: price - commissionFor(price, s),
      city: o.postcodes.cities?.name ?? "",
      postcode: o.postcodes.postcode,
      miles: u.lat !== null && u.long !== null ? distanceMiles(Number(u.lat), Number(u.long), Number(o.postcodes.lat), Number(o.postcodes.long)) : 0,
      slots: o.timeslots.length,
      created: o.created_at?.toISOString() ?? null,
    };
  });
}

/** AppController@getRequest + OrderRequestResource */
export async function jobRequest(mechanicId: string, requestId: number) {
  const u = await me(mechanicId);
  const r = await db.orderrequests.findFirst({
    where: { id: BigInt(requestId), user_id: u.id },
    include: { orders: { include: orderInclude }, orderrequestquotes: { take: 1, include: { orderrequestquotelabours: true, orderrequestquoteparts: true } } },
  });
  if (!r) return null;
  const o = r.orders;
  const car = parseCar(o.car_data);
  const s = await settings();
  const price = Number(o.price ?? 0);
  const aq = o.adminquotes[0];
  const docs = u.requiredocs;
  const byDate = new Map<string, { id: number; time: string }[]>();
  for (const t of o.timeslots) byDate.set(t.date, [...(byDate.get(t.date) ?? []), { id: Number(t.id), time: t.time }]);
  return {
    id: Number(r.id),
    status: r.status,
    order: { id: Number(o.id), status: o.status, service: o.order_for, notes: o.notes, sscNotes: o.notes_by_ssc, token: o.token, driveable: o.drive_able, collection: o.free_collection_delivery, dropOff: o.car_drop_off },
    takenBy: o.orderassigns[0] ? Number(o.orderassigns[0].user_id) : 0,
    car,
    carTitle: carTitle(car),
    price,
    commission: commissionFor(price, s),
    labourRate: Number(o.postcodes.cities?.labour_rate ?? s.labourRate),
    customer: { name: `${o.users.fname} ${o.users.lname}`.trim(), city: o.postcodes.cities?.name ?? "", postcode: o.postcodes.postcode },
    miles: u.lat !== null && u.long !== null ? distanceMiles(Number(u.lat), Number(u.long), Number(o.postcodes.lat), Number(o.postcodes.long)) : 0,
    work: o.ordertracks.map((t) => ({ name: t.services.name, parts: t.services.parts.filter((p) => p.name !== "MOT").map((p) => p.name) })),
    sscQuote: aq ? aq.adminquotedetails.map((d) => ({ name: d.name, price: Number(d.price), type: d.type })) : null,
    schedule: [...byDate.entries()].map(([date, times]) => ({ date, times })),
    docsUploaded: docs.length > 0,
    docsApproved: docs.length > 0 && docs.every((d) => d.status === "approved"),
  };
}

/** AppController@assignedOrder / @completedOrder */
export async function myJobs(mechanicId: string, status: "assigned" | "completed") {
  const rows = await db.orderassigns.findMany({
    where: { user_id: BigInt(mechanicId), status, ...(status === "assigned" ? { orders: { status: "assigned" } } : {}) },
    orderBy: { id: "desc" },
    take: status === "completed" ? 50 : undefined,
    include: { orders: { include: { users: { select: { fname: true, lname: true } }, postcodes: { include: { cities: { select: { name: true } } } }, ordertracks: { include: { services: { select: { name: true } } } } } }, orderquotes: { take: 1 } },
  });
  return rows.map((a) => {
    const car = parseCar(a.orders.car_data);
    return {
      id: Number(a.id),
      orderId: Number(a.order_id),
      car: carTitle(car),
      reg: car.reg ?? "",
      customer: `${a.orders.users.fname} ${a.orders.users.lname}`.trim(),
      work: a.orders.ordertracks.map((t) => t.services.name),
      city: a.orders.postcodes.cities?.name ?? "",
      postcode: a.orders.postcodes.postcode,
      date: a.date,
      time: a.time,
      startAt: a.start_at?.toISOString() ?? null,
      price: Number(a.price ?? 0),
      followOn: a.orderquotes[0] ? { status: a.orderquotes[0].status, price: Number(a.orderquotes[0].price) } : null,
    };
  });
}

/** AppController@getAssignOrder / @getCompletedOrder + OrderassignResource: the job workspace. */
export async function jobWorkspace(mechanicId: string | null, assignId: number) {
  const a = await db.orderassigns.findFirst({
    where: { id: BigInt(assignId), ...(mechanicId ? { user_id: BigInt(mechanicId) } : {}) },
    include: {
      users: { include: { userstripes: { take: 1 } } },
      orders: { include: orderInclude },
      assignservices: { include: { assignserviceparts: true }, orderBy: { id: "asc" } },
      assignlabours: { orderBy: { id: "asc" } },
      assignparts: { orderBy: { id: "asc" } },
      assignfiles: { orderBy: { id: "asc" } },
      assignfaults: { orderBy: { id: "asc" } },
      assignexcuses: { take: 1 },
      orderquotes: { take: 1, include: { orderquotelabours: true, orderquoteparts: true } },
    },
  });
  if (!a) return null;
  const o = a.orders;
  const s = await settings();
  const price = Number(a.price ?? 0);
  const car = parseCar(o.car_data);
  const q = a.orderquotes[0];
  const payment = await db.orderpayments.findFirst({ where: { order_id: o.id } });
  const byDate = new Map<string, { id: number; time: string }[]>();
  for (const t of o.timeslots) byDate.set(t.date, [...(byDate.get(t.date) ?? []), { id: Number(t.id), time: t.time }]);
  return {
    id: Number(a.id),
    status: a.status,
    time: a.time,
    date: a.date,
    startAt: a.start_at?.toISOString() ?? null,
    price,
    commission: commissionFor(price, s),
    stripeFee: stripeFeeFor(price),
    mileage: Number(a.mileage ?? 0),
    labourHourLimit: s.labourHourLimit,
    labourRate: Number(o.postcodes.cities?.labour_rate ?? s.labourRate),
    diagnose: o.ordertracks.some((t) => Number(t.services.maincategories?.id) === 3),
    stripeConnected: !!a.users.userstripes[0]?.stripe_user_id,
    paymentAuthorised: !!payment,
    order: { id: Number(o.id), token: o.token, status: o.status, service: o.order_for, notes: o.notes, sscNotes: o.notes_by_ssc, driveable: o.drive_able, collection: o.free_collection_delivery, dropOff: o.car_drop_off },
    customer: { id: Number(o.users.id), name: `${o.users.fname} ${o.users.lname}`.trim(), phone: o.users.phone, email: o.users.email, houseNo: o.users.house_no ?? "", street: o.users.street ?? "", city: o.users.city ?? o.postcodes.cities?.name ?? "", postcode: o.postcodes.postcode },
    car,
    carTitle: carTitle(car),
    services: a.assignservices.map((x) => ({ id: Number(x.id), name: x.name, labour: Number(x.labour), parts: x.assignserviceparts.filter((p) => p.name !== "MOT").map((p) => ({ id: Number(p.id), name: p.name, price: Number(p.price) })) })),
    labours: a.assignlabours.map((l) => ({ id: Number(l.id), description: l.description ?? "", price: Number(l.labour) })),
    parts: a.assignparts.map((p) => ({ id: Number(p.id), description: p.description ?? "", price: Number(p.price) })),
    photos: a.assignfiles.map((f) => ({ id: Number(f.id), image: f.image, description: f.description ?? "" })),
    faults: a.assignfaults.map((f) => ({ id: Number(f.id), description: f.description, urgency: f.urgency, code: f.trouble_code ?? "", fixed: f.fixed })),
    excuse: a.assignexcuses[0]?.reason ?? null,
    followOn: q
      ? {
          status: q.status,
          price: Number(q.price),
          commission: commissionFor(Number(q.price), s),
          labours: q.orderquotelabours.map((l) => ({ id: Number(l.id), name: l.service_name, hours: l.labour_hour, price: Number(l.labour_price) })),
          parts: q.orderquoteparts.map((p) => ({ id: Number(p.id), name: p.part_name, price: Number(p.part_price) })),
        }
      : null,
    schedule: [...byDate.entries()].map(([date, times]) => ({ date, times })),
  };
}
export type JobWorkspace = NonNullable<Awaited<ReturnType<typeof jobWorkspace>>>;

/** AppController@quotationRequest + QuoteRequest@quoteRequest: repair quotes this mechanic can price. */
export async function quoteRequests(mechanicId: string, all = false) {
  const rows = await db.orderrequests.findMany({
    where: { user_id: BigInt(mechanicId), ...(all ? {} : { status: "pending" }), orders: { order_for: "repairs", ...(all ? {} : { status: "pending", adminquotes: { none: {} } }) } },
    orderBy: { id: "desc" },
    include: { orders: { include: { users: { select: { fname: true, lname: true } }, postcodes: { select: { postcode: true } }, ordertracks: { include: { services: { select: { name: true } } } } } }, orderrequestquotes: { take: 1 } },
  });
  return rows
    .filter((r) => all || !r.orderrequestquotes[0] || !r.orderrequestquotes[0].status || r.orderrequestquotes[0].status === "NOT DELIVERED")
    .map((r) => {
      const car = parseCar(r.orders.car_data);
      const q = r.orderrequestquotes[0];
      return {
        id: Number(r.id),
        orderId: Number(r.order_id),
        car: carTitle(car),
        reg: car.reg ?? "",
        customer: `${r.orders.users.fname} ${r.orders.users.lname}`.trim(),
        notes: r.orders.notes ?? "",
        work: r.orders.ordertracks.map((t) => t.services.name),
        postcode: r.orders.postcodes.postcode,
        orderStatus: r.orders.status,
        quote: q ? { status: q.status ?? "NOT DELIVERED", price: Number(q.price) } : null,
        created: r.created_at?.toISOString() ?? null,
      };
    });
}

/** QuoteRequest@quotationRequestView */
export async function quoteRequest(mechanicId: string, id: number) {
  const r = await db.orderrequests.findFirst({
    where: { id: BigInt(id), user_id: BigInt(mechanicId) },
    include: {
      orders: { include: { users: true, postcodes: { include: { cities: true } }, ordertracks: { include: { services: { select: { name: true } } } } } },
      orderrequestquotes: { take: 1, include: { orderrequestquotelabours: { orderBy: { id: "asc" } }, orderrequestquoteparts: { orderBy: { id: "asc" } } } },
    },
  });
  if (!r) return null;
  const o = r.orders;
  const car = parseCar(o.car_data);
  const q = r.orderrequestquotes[0];
  const s = await settings();
  return {
    id: Number(r.id),
    status: r.status,
    order: { id: Number(o.id), status: o.status, notes: o.notes ?? "", work: o.ordertracks.map((t) => t.services.name) },
    car,
    carTitle: carTitle(car),
    customer: { name: `${o.users.fname} ${o.users.lname}`.trim(), city: o.postcodes.cities?.name ?? "", postcode: o.postcodes.postcode },
    labourRate: Number(o.postcodes.cities?.labour_rate ?? s.labourRate),
    quote: q
      ? {
          status: q.status ?? "NOT DELIVERED",
          price: Number(q.price),
          commission: commissionFor(Number(q.price), s),
          labours: q.orderrequestquotelabours.map((l) => ({ id: Number(l.id), name: l.name, price: Number(l.price) })),
          parts: q.orderrequestquoteparts.map((p) => ({ id: Number(p.id), name: p.name, price: Number(p.price) })),
        }
      : null,
  };
}
