import "server-only";
import { db } from "@/lib/db";

const day = (d: Date, n = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Admin\HomeController@index — every tile uses the Laravel formula verbatim. */
export async function getAdminTiles() {
  const now = new Date();
  const today = day(now);
  const tomorrow = day(now, 1);
  const yesterday = day(now, -1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const repairsNoPrice = { order_for: "repairs", price: null };
  const success = { status: "Success" };

  const [
    allorders,
    neworders,
    tomorrowAssign,
    todayAssign,
    completed,
    accepted,
    rejected,
    unverified,
    inactiveCandidates,
    assignedFirst,
    allmechanics,
    mobiles,
    garages,
    customers,
    allquotes,
    newquotes,
    yesterdayquotes,
    notresponded,
    closedquotes,
    bespokes,
    overall,
    current,
    previous,
    todayFee,
  ] = await Promise.all([
    db.orders.count({ where: { OR: [{ order_for: "inspection and mot" }, { status: "assigned" }, { status: "completed" }] } }),
    db.orders.count({ where: { created_at: { gte: today, lt: tomorrow }, order_for: "inspection and mot" } }),
    db.orderassigns.count({ where: { start_at: { gte: tomorrow, lt: day(now, 2) } } }),
    db.orderassigns.count({ where: { start_at: { gte: today, lt: tomorrow }, status: "assigned" } }),
    db.orders.count({ where: { status: "completed" } }),
    db.orders.count({ where: { status: "assigned", order_for: "inspection and mot" } }),
    db.orders.count({ where: { status: "rejected", order_for: "inspection and mot" } }),
    db.orders.count({ where: { price: { gt: 0 }, orderpayments: { none: {} } } }),
    db.orders.findMany({ where: { status: "pending", order_for: "inspection and mot", orderassigns: { none: {} }, timeslots: { some: {} } }, select: { timeslots: { select: { end_at: true } } } }),
    db.orderassigns.findMany({ orderBy: { id: "asc" }, distinct: ["order_id"], select: { status: true } }),
    db.users.count({ where: { role_id: 1 } }),
    db.users.count({ where: { role_id: 1, service_type: "Mobile Mechanic Service," } }),
    // Laravel's orWhere drops the role filter on the second clause; kept identical.
    db.users.count({ where: { OR: [{ role_id: 1, service_type: "Collection and Delivery" }, { service_type: "Mobile Mechanic Service,Collection and Delivery" }] } }),
    db.users.count({ where: { role_id: 2 } }),
    db.orders.count({ where: repairsNoPrice }),
    db.orders.count({ where: { ...repairsNoPrice, created_at: { gte: today, lt: tomorrow } } }),
    db.orders.count({ where: { ...repairsNoPrice, created_at: { gte: yesterday, lt: today } } }),
    db.orders.count({ where: { order_for: "repairs", status: "pending", orderrequests: { none: {} } } }),
    db.orders.count({ where: { order_for: "repairs", status: "rejected" } }),
    db.bespokes.count(),
    db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: success }),
    db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: { ...success, created_at: { gte: monthStart } } }),
    db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: { ...success, created_at: { gte: lastMonthStart, lt: monthStart } } }),
    db.orderpayments.aggregate({ _sum: { platform_fee: true }, where: { ...success, created_at: { gte: today, lt: tomorrow } } }),
  ]);

  const inactive = inactiveCandidates.filter((o) => {
    const last = o.timeslots.map((t) => t.end_at).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
    return last ? now.getTime() > day(last, 7).getTime() : false;
  }).length;

  return {
    orders: [
      { label: "All orders", value: allorders, href: "/admin/orders/all", icon: "ShoppingBag" },
      { label: "Today’s orders", value: todayAssign, href: "/admin/orders/today", icon: "CalendarCheck" },
      { label: "Tomorrow orders", value: tomorrowAssign, href: "/admin/orders/tomorrow", icon: "CalendarClock" },
      { label: "Accepted orders", value: accepted, href: "/admin/orders/accepted", icon: "BadgeCheck" },
      { label: "Completed orders", value: completed, href: "/admin/orders/completed", icon: "CheckCircle2" },
      { label: "New orders", value: neworders, href: "/admin/orders/new", icon: "Sparkles" },
      { label: "Inactive orders", value: inactive, href: "/admin/orders/inactive", icon: "Hourglass", tone: "accent" },
      { label: "Customers", value: customers, href: "/admin/clients", icon: "Users" },
      { label: "All mechanics", value: allmechanics, href: "/admin/mechanics", icon: "Wrench" },
      { label: "Mobile mechanics", value: mobiles, href: "/admin/mechanics?type=mobile", icon: "Truck" },
      { label: "Garages", value: garages, href: "/admin/mechanics?type=garage", icon: "Warehouse" },
      { label: "Cancelled orders", value: rejected, href: "/admin/orders/rejected", icon: "XCircle", tone: "danger" },
      { label: "Unverified orders", value: unverified, href: "/admin/orders/unverified", icon: "ShieldAlert", tone: "accent" },
      { label: "Assigned orders", value: assignedFirst.filter((a) => a.status === "assigned").length, href: "/admin/orders/assigned", icon: "UserCheck" },
    ],
    income: [
      { label: "Overall income", value: Number(overall._sum.platform_fee ?? 0) },
      { label: `${now.toLocaleString("en-GB", { month: "short" })}’s income`, value: Number(current._sum.platform_fee ?? 0) },
      { label: "Today’s income", value: Number(todayFee._sum.platform_fee ?? 0) },
      { label: "Previous month income", value: Number(previous._sum.platform_fee ?? 0) },
    ],
    quotes: [
      { label: "All quotations", value: allquotes, href: "/admin/quotes/all" },
      { label: "New quotations", value: newquotes, href: "/admin/quotes/new" },
      { label: "Yesterday quotations", value: yesterdayquotes, href: "/admin/quotes/yesterday" },
      { label: "Not responded quotes", value: notresponded, href: "/admin/quotes/not-responded", tone: "accent" },
      { label: "Closed quotations", value: closedquotes, href: "/admin/quotes/closed" },
      { label: "Sent estimates", value: bespokes, href: "/admin/quotes/estimates" },
    ],
  };
}
