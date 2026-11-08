import "server-only";
import { createHash } from "node:crypto";
import { sendNotification } from "web-push";
import { db } from "@/lib/db";
import { passwordVersion } from "@/lib/session";
import { safeAlertUrl, validPushEndpoint } from "./policy";

export const PUSH_DEVICE_COOKIE = "ssc-push-device";
export const endpointHash = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");
export const pushReady = () => process.env.PUSH_ENABLED === "true" && !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT;
let running = false;

/** A leased, retryable outbox; a stopped process can resume after the lease expires. */
export async function dispatchPushAlerts() {
  if (running || !pushReady()) return;
  running = true;
  try {
    const rows = await db.appAlert.findMany({ where: { deliveredAt: null, attempts: { lt: 5 }, nextAttemptAt: { lte: new Date() }, createdAt: { gt: new Date(Date.now() - 86400_000) } }, orderBy: { id: "asc" }, take: 20 });
    for (const row of rows) {
      const claim = await db.appAlert.updateMany({ where: { id: row.id, deliveredAt: null, nextAttemptAt: { lte: new Date() } }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 120_000) } });
      if (!claim.count) continue;
      const devices = await db.pushSubscription.findMany({ where: { ...(row.audience === "staff" ? { role: { in: ["admin", "editor"] } } : { ownerKey: row.audience }), updatedAt: { gt: new Date(Date.now() - 90 * 86400_000) } } });
      let retry = false;
      for (const d of devices) {
        const [kind, id] = d.ownerKey.split(":");
        if (!["admin", "user"].includes(kind) || !/^\d{1,20}$/.test(id ?? "") || BigInt(id) > BigInt("18446744073709551615") || !validPushEndpoint(d.endpoint)) { await db.pushSubscription.deleteMany({ where: { endpointHash: d.endpointHash } }); continue; }
        const user = kind === "admin" ? await db.admins.findUnique({ where: { id: BigInt(id) }, select: { password: true, role: true } }) : await db.users.findUnique({ where: { id: BigInt(id) }, select: { password: true, status: true, role_id: true } });
        const role = user && ("role" in user ? user.role : user.role_id === BigInt(1) ? "mechanic" : "customer");
        if (!user || role !== d.role || ("status" in user && !user.status) || passwordVersion(user.password) !== d.version) { await db.pushSubscription.deleteMany({ where: { endpointHash: d.endpointHash } }); continue; }
        try {
          await sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify({ id: String(row.id), title: row.title, body: row.body, url: safeAlertUrl(row.url), sound: d.sound, account: d.ownerKey }), {
            vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! }, TTL: 3600, urgency: "normal", timeout: 10_000,
          });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.pushSubscription.deleteMany({ where: { endpointHash: d.endpointHash } });
          else { retry = true; console.warn(`[push] Delivery deferred (${code ?? "network error"}).`); }
        }
      }
      if (!retry) await db.appAlert.update({ where: { id: row.id }, data: { deliveredAt: new Date() } });
    }
  } catch { console.warn("[push] Could not process notifications; check the PWA database migration."); }
  finally { running = false; }
}
