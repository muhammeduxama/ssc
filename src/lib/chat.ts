import "server-only";
import { db } from "./db";
import { isStaff, type Session } from "./session";
import { orderScope } from "./queries";
import { parseCar, carTitle } from "./format";
import { queueMail } from "./mail/send";
import { adminMechanicChat, messageCenter } from "./mail/templates";

/**
 * A thread is one conversation about one order.
 *   key "<orderId>:s:<userId>"  support chat between staff and that user (table adminresolutions)
 *   key "<orderId>:p:<userId>"  direct chat between the signed-in user and <userId> (table resolutions)
 */
export type Thread = {
  key: string;
  orderId: number;
  title: string;
  subtitle: string;
  kind: "support" | "direct";
  last: string;
  lastAt: string | null;
  unread: number;
};

export type Message = {
  id: string;
  mine: boolean;
  author: string;
  text: string;
  file: string | null;
  fileType: string | null;
  at: string;
};

const name = (u: { fname: string; lname: string; company?: string | null } | undefined) =>
  u ? (u.company || `${u.fname} ${u.lname}`).trim() : "Unknown";

export function parseKey(key: string) {
  const [o, k, u] = key.split(":");
  const orderId = Number(o);
  const userId = Number(u);
  if (!Number.isInteger(orderId) || !Number.isInteger(userId) || (k !== "s" && k !== "p")) return null;
  return { orderId, userId, kind: k === "s" ? ("support" as const) : ("direct" as const) };
}

async function orderLabel(ids: number[]) {
  const rows = await db.orders.findMany({ where: { id: { in: ids.map(BigInt) } }, select: { id: true, car_data: true, order_for: true } });
  return new Map(rows.map((r) => [Number(r.id), `#${r.id} · ${carTitle(parseCar(r.car_data))} · ${r.order_for}`]));
}

export async function listThreads(s: Session): Promise<Thread[]> {
  if (isStaff(s)) {
    const rows = await db.adminresolutions.findMany({ orderBy: { id: "desc" }, take: 400, include: { users: { select: { fname: true, lname: true, company: true } } } });
    const seen = new Map<string, Thread>();
    const labels = await orderLabel([...new Set(rows.map((r) => Number(r.order_id)))]);
    for (const r of rows) {
      const key = `${r.order_id}:s:${r.user_id}`;
      const t = seen.get(key);
      if (!t) {
        seen.set(key, {
          key,
          orderId: Number(r.order_id),
          title: name(r.users),
          subtitle: labels.get(Number(r.order_id)) ?? `Order #${r.order_id}`,
          kind: "support",
          last: r.message || (r.file ? "Attachment" : ""),
          lastAt: r.created_at?.toISOString() ?? null,
          unread: r.sender !== "admin" && !r.seen ? 1 : 0,
        });
      } else if (r.sender !== "admin" && !r.seen) t.unread += 1;
    }
    return [...seen.values()];
  }

  const me = BigInt(s.id);
  // Direct chats (customer <-> mechanic).
  const direct = await db.resolutions.findMany({
    where: { OR: [{ sender_id: me }, { receiver_id: me }], admin: false },
    orderBy: { id: "desc" },
    take: 400,
    include: {
      users_resolutions_sender_idTousers: { select: { fname: true, lname: true, company: true } },
      users_resolutions_receiver_idTousers: { select: { fname: true, lname: true, company: true } },
    },
  });
  // Support chats (this user <-> staff).
  const support = await db.adminresolutions.findMany({ where: { user_id: me }, orderBy: { id: "desc" }, take: 200 });
  const labels = await orderLabel([...new Set([...direct.map((d) => Number(d.order_id)), ...support.map((d) => Number(d.order_id))])]);

  const map = new Map<string, Thread>();
  for (const r of direct) {
    const mineSent = r.sender_id === me;
    const peerId = mineSent ? r.receiver_id : r.sender_id;
    const peer = mineSent ? r.users_resolutions_receiver_idTousers : r.users_resolutions_sender_idTousers;
    const key = `${r.order_id}:p:${peerId}`;
    const t = map.get(key);
    if (!t)
      map.set(key, {
        key,
        orderId: Number(r.order_id),
        title: name(peer),
        subtitle: labels.get(Number(r.order_id)) ?? `Order #${r.order_id}`,
        kind: "direct",
        last: r.message || (r.file ? "Attachment" : ""),
        lastAt: r.created_at?.toISOString() ?? null,
        unread: !mineSent && !r.seen ? 1 : 0,
      });
    else if (!mineSent && !r.seen) t.unread += 1;
  }
  for (const r of support) {
    const key = `${r.order_id}:s:${s.id}`;
    const t = map.get(key);
    if (!t)
      map.set(key, {
        key,
        orderId: Number(r.order_id),
        title: "Smart Servicing Centre support",
        subtitle: labels.get(Number(r.order_id)) ?? `Order #${r.order_id}`,
        kind: "support",
        last: r.message || (r.file ? "Attachment" : ""),
        lastAt: r.created_at?.toISOString() ?? null,
        unread: r.sender === "admin" && !r.seen ? 1 : 0,
      });
    else if (r.sender === "admin" && !r.seen) t.unread += 1;
  }
  return [...map.values()].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}

async function canAccess(s: Session, orderId: number) {
  if (await db.orders.findFirst({ where: { id: BigInt(orderId), ...orderScope(s) }, select: { id: true } })) return true;
  // Mechanics answer customers' questions about a job request before it is assigned to them.
  return s.role === "mechanic" && !!(await db.orderrequests.findFirst({ where: { order_id: BigInt(orderId), user_id: BigInt(s.id) }, select: { id: true } }));
}

export async function getMessages(s: Session, key: string): Promise<Message[] | null> {
  const k = parseKey(key);
  if (!k) return null;

  if (k.kind === "support") {
    // Staff may read any support thread; users only their own.
    if (!isStaff(s) && String(k.userId) !== s.id) return null;
    const rows = await db.adminresolutions.findMany({ where: { order_id: BigInt(k.orderId), user_id: BigInt(k.userId) }, orderBy: { id: "asc" } });
    const person = isStaff(s) ? name((await db.users.findUnique({ where: { id: BigInt(k.userId) }, select: { fname: true, lname: true, company: true } })) ?? undefined) : "";
    // Mark the other side's messages as read.
    await db.adminresolutions.updateMany({
      where: { order_id: BigInt(k.orderId), user_id: BigInt(k.userId), seen: false, sender: isStaff(s) ? { not: "admin" } : "admin" },
      data: { seen: true },
    });
    return rows.map((r) => ({
      id: `s${r.id}`,
      mine: isStaff(s) ? r.sender === "admin" : r.sender !== "admin",
      author: isStaff(s) ? (r.sender === "admin" ? "You" : person) : r.sender === "admin" ? "Smart Servicing Centre support" : "You",
      text: r.message ?? "",
      file: r.file,
      fileType: r.file_type,
      at: (r.created_at ?? new Date()).toISOString(),
    }));
  }

  if (isStaff(s) || !(await canAccess(s, k.orderId))) return null;
  const me = BigInt(s.id);
  const peer = BigInt(k.userId);
  const rows = await db.resolutions.findMany({
    where: { order_id: BigInt(k.orderId), admin: false, OR: [{ sender_id: me, receiver_id: peer }, { sender_id: peer, receiver_id: me }] },
    orderBy: { id: "asc" },
    include: { users_resolutions_sender_idTousers: { select: { fname: true, lname: true, company: true } } },
  });
  await db.resolutions.updateMany({ where: { order_id: BigInt(k.orderId), sender_id: peer, receiver_id: me, seen: 0 }, data: { seen: 1 } });
  return rows.map((r) => ({
    id: `p${r.id}`,
    mine: r.sender_id === me,
    author: r.sender_id === me ? "You" : name(r.users_resolutions_sender_idTousers),
    text: r.message ?? "",
    file: r.file,
    fileType: r.file_type,
    at: (r.created_at ?? new Date()).toISOString(),
  }));
}

export async function sendMessage(s: Session, key: string, text: string) {
  const k = parseKey(key);
  const body = text.trim();
  if (!k || !body) return false;
  const now = new Date();

  if (k.kind === "support") {
    if (!isStaff(s) && String(k.userId) !== s.id) return false;
    await db.adminresolutions.create({
      data: {
        order_id: BigInt(k.orderId),
        user_id: BigInt(k.userId),
        sender: isStaff(s) ? "admin" : s.role,
        message: body,
        seen: false,
        created_at: now,
        updated_at: now,
      },
    });
    // Jobs\AdminMechanicChat: email the other side of the support chat.
    const order = await db.orders.findUnique({ where: { id: BigInt(k.orderId) }, select: { token: true } });
    if (order) {
      if (isStaff(s)) {
        const u = await db.users.findUnique({ where: { id: BigInt(k.userId) } });
        if (u) queueMail(adminMechanicChat({ name: `${u.fname} ${u.lname}`, email: u.email }, " from Smart Servicing Centre ", k.orderId, order.token), 20_000);
      } else queueMail(adminMechanicChat({ name: "Syed Hamdani", email: "info@smartservicingcentre.co.uk" }, s.role === "mechanic" ? " from mechanic " : " from customer ", k.orderId, order.token), 20_000);
    }
    return true;
  }
  if (isStaff(s) || !(await canAccess(s, k.orderId))) return false;
  await db.resolutions.create({
    data: { order_id: BigInt(k.orderId), sender_id: BigInt(s.id), receiver_id: BigInt(k.userId), admin: false, message: body, seen: 0, created_at: now, updated_at: now },
  });
  // ResolutionController@sendMessage: email the receiver with a link back to the conversation.
  const [order, to, from] = await Promise.all([
    db.orders.findUnique({ where: { id: BigInt(k.orderId) }, select: { token: true, user_id: true, orderassigns: { select: { id: true }, take: 1 } } }),
    db.users.findUnique({ where: { id: BigInt(k.userId) } }),
    db.users.findUnique({ where: { id: BigInt(s.id) } }),
  ]);
  if (order && to && from) {
    const fromCustomer = from.id === order.user_id;
    const mechanicId = fromCustomer ? to.id : from.id;
    const link = order.orderassigns.length ? `/app/resolution/chat/${order.token}` : `/app/resolution/question/${mechanicId}/order/${order.token}/customer/${order.user_id}`;
    queueMail(messageCenter({ name: `${to.fname} ${to.lname}`, email: to.email }, k.orderId, fromCustomer ? `your customer ${from.fname} ${from.lname}` : `your mechanic ${from.company ?? from.fname}`, link));
  }
  return true;
}

/** Start (or reopen) a support thread for an order the person can see. */
export async function unreadCount(s: Session) {
  if (isStaff(s)) return db.adminresolutions.count({ where: { sender: { not: "admin" }, seen: false } });
  const me = BigInt(s.id);
  const [a, b] = await Promise.all([
    db.adminresolutions.count({ where: { user_id: me, sender: "admin", seen: false } }),
    db.resolutions.count({ where: { receiver_id: me, seen: 0, admin: false } }),
  ]);
  return a + b;
}
