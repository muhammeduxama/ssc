import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { dispatchPushAlerts } from "./push";
import { safeAlertUrl } from "./policy";

type Alert = { audience: string; kind: "order" | "message"; title: string; body: string; url: string; eventKey?: string };
/** Notification failures must never roll back a saved booking or message. */
export async function notify(alert: Alert) {
  try {
    const eventKey = alert.eventKey ?? `event:${randomUUID()}`;
    await db.appAlert.upsert({ where: { eventKey }, update: {}, create: { ...alert, eventKey, url: safeAlertUrl(alert.url) } });
    try { after(dispatchPushAlerts); } catch { /* The background worker also drains this outbox. */ }
  } catch { console.warn("[alerts] Could not save notification; check the PWA database migration."); }
}
export async function notifyMessage(orderId: string | number | bigint, audience: string, thread: string, eventKey?: string) {
  await notify({ audience, kind: "message", title: "New booking message", body: `You have a new message about booking #${orderId}.`, url: `/messages?thread=${encodeURIComponent(thread)}`, eventKey });
}
export async function notifyOrder(orderId: string | number | bigint, audience = "staff", quote = false) {
  await notify({ audience, kind: "order", title: quote ? "New repair quote request" : "New booking received", body: `Open ${quote ? "quote request" : "booking"} #${orderId} to review the details.`, url: audience === "staff" ? `/admin/${quote ? "quotes" : "orders"}/view/${orderId}` : quote ? "/mechanic/quote-requests" : "/mechanic/requests", eventKey: `${quote ? "quote" : "order"}:${orderId}:${audience}` });
}
