import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] };

const FROM = process.env.MAIL_FROM || "Smart Servicing Centre <no-reply@smartservicingcentre.co.uk>";

/**
 * Sends through Mailgun's HTTP API when MAILGUN_DOMAIN + MAILGUN_SECRET are set
 * (the Laravel app's mailer). Otherwise writes an .html preview to .outbox/ so
 * nothing is sent from development machines.
 */
export async function sendMail(m: Mail): Promise<boolean> {
  const to = Array.isArray(m.to) ? m.to : [m.to];
  const domain = process.env.MAILGUN_DOMAIN;
  const secret = process.env.MAILGUN_SECRET;
  try {
    if (domain && secret) {
      const body = new FormData();
      body.set("from", FROM);
      for (const t of to) body.append("to", t);
      body.set("subject", m.subject);
      body.set("html", m.html);
      if (m.replyTo) body.set("h:Reply-To", m.replyTo);
      for (const a of m.attachments ?? []) body.append("attachment", new Blob([new Uint8Array(a.content)]), a.filename);
      const res = await fetch(`https://${process.env.MAILGUN_ENDPOINT || "api.mailgun.net"}/v3/${domain}/messages`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`api:${secret}`).toString("base64")}` },
        body,
      });
      if (!res.ok) console.error("[mail] mailgun error", res.status, await res.text());
      return res.ok;
    }
    const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".outbox");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.html`);
    await writeFile(file, `<!-- to: ${to.join(", ")} | subject: ${m.subject} -->\n${m.html}`);
    console.log(`[mail] (dev) "${m.subject}" → ${to.join(", ")} saved to ${path.relative(process.cwd(), file)}`);
    return true;
  } catch (e) {
    console.error("[mail] failed", e);
    return false;
  }
}

/** Fire-and-forget, like Laravel's queued jobs: never block or fail the request. */
export function queueMail(m: Mail, delayMs = 0) {
  setTimeout(() => void sendMail(m), delayMs);
}
