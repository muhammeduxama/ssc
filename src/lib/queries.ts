import "server-only";
import { db } from "./db";
import { isStaff, type Session } from "./session";
import { parseCar, carTitle } from "./format";

/** Orders a person is allowed to see. */
export function orderScope(s: Session) {
  if (isStaff(s)) return {};
  const id = BigInt(s.id);
  if (s.role === "customer") return { user_id: id };
  return { orderassigns: { some: { user_id: id } } };
}

export async function getDashboard(s: Session) {
  const scope = orderScope(s);
  const staff = isStaff(s);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, today, pending, assigned, completed, byStatus, recent] = await Promise.all([
    db.orders.count({ where: scope }),
    db.orders.count({ where: { ...scope, created_at: { gte: dayStart } } }),
    db.orders.count({ where: { ...scope, status: "pending" } }),
    db.orders.count({ where: { ...scope, status: "assigned" } }),
    db.orders.count({ where: { ...scope, status: "completed" } }),
    db.orders.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    db.orders.findMany({
      where: scope,
      orderBy: { id: "desc" },
      take: 6,
      include: { users: { select: { fname: true, lname: true } }, postcodes: { select: { postcode: true } } },
    }),
  ]);

  // Last six months of orders, ending at the most recent order (so older datasets still chart).
  const latest = await db.orders.findFirst({ where: scope, orderBy: { created_at: "desc" }, select: { created_at: true } });
  const end = latest?.created_at ?? now;
  const since = new Date(end.getFullYear(), end.getMonth() - 5, 1);
  const monthOrders = await db.orders.findMany({ where: { ...scope, created_at: { gte: since } }, select: { created_at: true, price: true } });
  const series = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(end.getFullYear(), end.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
      orders: 0,
      value: 0,
    };
  });
  for (const o of monthOrders) {
    if (!o.created_at) continue;
    const k = `${o.created_at.getFullYear()}-${o.created_at.getMonth()}`;
    const row = series.find((r) => r.key === k);
    if (row) {
      row.orders += 1;
      row.value += Number(o.price ?? 0);
    }
  }

  let income: { all: number; month: number } | null = null;
  let people: { customers: number; mechanics: number } | null = null;
  if (staff) {
    const [all, month, customers, mechanics] = await Promise.all([
      db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: { status: "Success" } }),
      db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: { status: "Success", created_at: { gte: monthStart } } }),
      db.users.count({ where: { role_id: 2 } }),
      db.users.count({ where: { role_id: 1 } }),
    ]);
    income = { all: Number(all._sum.platform_fee ?? 0), month: Number(month._sum.platform_fee ?? 0) };
    people = { customers, mechanics };
  } else if (s.role === "mechanic") {
    const earn = await db.orderassigns.aggregate({ _sum: { price: true }, where: { user_id: BigInt(s.id), status: "completed" } });
    income = { all: Number(earn._sum.price ?? 0), month: 0 };
  }

  return {
    kpis: { total, today, pending, assigned, completed },
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    series: series.map(({ month, orders, value }) => ({ month, orders, value: Math.round(value) })),
    income,
    people,
    recent: recent.map((o) => ({
      id: Number(o.id),
      car: carTitle(parseCar(o.car_data)),
      reg: parseCar(o.car_data).reg ?? "",
      customer: `${o.users.fname} ${o.users.lname}`.trim(),
      service: o.order_for,
      status: o.status,
      price: Number(o.price ?? 0),
      postcode: o.postcodes.postcode,
      at: o.created_at?.toISOString() ?? null,
    })),
  };
}

export async function listOrders(s: Session, opts: { status?: string; q?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const take = 15;
  const q = opts.q?.trim();
  const where = {
    ...orderScope(s),
    ...(opts.status && opts.status !== "all" ? { status: opts.status } : {}),
    ...(q
      ? {
          OR: [
            { car_data: { contains: q } },
            { order_for: { contains: q } },
            { postcodes: { postcode: { contains: q } } },
            ...(Number.isInteger(Number(q)) ? [{ id: BigInt(q) }] : []),
          ],
        }
      : {}),
  };
  const [rows, count] = await Promise.all([
    db.orders.findMany({
      where,
      orderBy: { id: "desc" },
      take,
      skip: (page - 1) * take,
      include: {
        users: { select: { fname: true, lname: true } },
        postcodes: { select: { postcode: true } },
        orderassigns: { select: { id: true, status: true, users: { select: { fname: true, lname: true, company: true } } } },
      },
    }),
    db.orders.count({ where }),
  ]);
  return {
    count,
    pages: Math.max(1, Math.ceil(count / take)),
    page,
    rows: rows.map((o) => {
      const car = parseCar(o.car_data);
      return {
        id: Number(o.id),
        car: carTitle(car),
        reg: car.reg ?? "",
        customer: `${o.users.fname} ${o.users.lname}`.trim(),
        service: o.order_for,
        status: o.status,
        price: Number(o.price ?? 0),
        postcode: o.postcodes.postcode,
        mechanics: o.orderassigns.length,
        at: o.created_at?.toISOString() ?? null,
      };
    }),
  };
}

export async function getOrder(s: Session, id: number) {
  const o = await db.orders.findFirst({
    where: { id: BigInt(id), ...orderScope(s) },
    include: {
      users: { select: { id: true, fname: true, lname: true, email: true, phone: true } },
      postcodes: { include: { cities: { select: { name: true } } } },
      orderassigns: {
        include: {
          users: { select: { id: true, fname: true, lname: true, company: true, phone: true } },
          assignservices: true,
          orderquotes: true,
        },
      },
      orderpayments: true,
      ordertracks: { orderBy: { id: "asc" } },
    },
  });
  if (!o) return null;
  const car = parseCar(o.car_data);
  return {
    id: Number(o.id),
    car,
    title: carTitle(car),
    service: o.order_for,
    status: o.status,
    notes: o.notes,
    price: Number(o.price ?? 0),
    driveable: o.drive_able,
    dropOff: o.car_drop_off,
    collection: o.free_collection_delivery,
    postcode: o.postcodes.postcode,
    city: o.postcodes.cities?.name ?? "",
    createdAt: o.created_at?.toISOString() ?? null,
    customer: { id: Number(o.users.id), name: `${o.users.fname} ${o.users.lname}`.trim(), email: o.users.email, phone: o.users.phone },
    assignments: o.orderassigns.map((a) => ({
      id: Number(a.id),
      mechanicId: Number(a.user_id),
      mechanic: a.users.company || `${a.users.fname} ${a.users.lname}`.trim(),
      phone: a.users.phone,
      status: a.status,
      date: a.date,
      time: a.time,
      price: Number(a.price ?? 0),
      services: a.assignservices.map((x) => ({ name: x.name, labour: Number(x.labour ?? 0) })),
    })),
    payments: o.orderpayments.map((p) => ({
      id: Number(p.id),
      total: Number(p.total_payment ?? 0),
      mechanic: Number(p.mechanic_payment ?? 0),
      fee: Number(p.platform_fee ?? 0),
      status: p.status ?? "Unpaid",
      at: p.created_at?.toISOString() ?? null,
    })),
  };
}

export async function listPeople(role: "customer" | "mechanic", q?: string) {
  const term = q?.trim();
  const rows = await db.users.findMany({
    where: {
      role_id: role === "mechanic" ? 1 : 2,
      ...(term ? { OR: [{ fname: { contains: term } }, { lname: { contains: term } }, { email: { contains: term } }, { company: { contains: term } }, { post_code: { contains: term } }] } : {}),
    },
    orderBy: { id: "desc" },
    take: 100,
    include: { _count: { select: { orders: true, orderassigns: true } } },
  });
  return rows.map((u) => ({
    id: Number(u.id),
    name: `${u.fname} ${u.lname}`.trim(),
    company: u.company ?? "",
    email: u.email,
    phone: u.phone,
    city: u.city ?? "",
    postcode: u.post_code ?? "",
    active: u.status,
    jobs: role === "mechanic" ? u._count.orderassigns : u._count.orders,
    joined: u.created_at?.toISOString() ?? null,
  }));
}
