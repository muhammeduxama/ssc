import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { LOGO_CID } from "./layout";
import { LOGO_PNG_BASE64 } from "./logo";

export type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] };

const FROM = process.env.MAIL_FROM_ADDRESS
  ? { name: process.env.MAIL_FROM_NAME || "Smart Servicing Centre", address: process.env.MAIL_FROM_ADDRESS }
  : "Smart Servicing Centre <no-reply@smartservicingcentre.co.uk>";

/** One pooled SMTP connection, created on first use. */
let transport: Transporter | null = null;
/** MAIL_ENABLED=false turns sending off (emails go to .outbox/ and email verification is skipped). */
export const mailEnabled = process.env.MAIL_ENABLED !== "false" && !!process.env.MAIL_HOST;

function smtp() {
  if (!mailEnabled) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 465,
    // true = TLS from the start (port 465); false = STARTTLS (port 587).
    secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE === "true" : Number(process.env.MAIL_PORT) !== 587,
    auth: process.env.MAIL_USERNAME ? { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD } : undefined,
    pool: true,
  });
  return transport;
}

/**
 * Sends over SMTP when MAIL_HOST is set and MAIL_ENABLED isn't false. Otherwise writes an .html preview to .outbox/ so
 * nothing is sent from development machines.
 */
// Inline (cid:) image, so the logo shows in every inbox without being downloaded from the site.
const logo = { filename: "logo.png", content: Buffer.from(LOGO_PNG_BASE64, "base64"), cid: LOGO_CID, contentType: "image/png", contentDisposition: "inline" as const };

export async function sendMail(m: Mail): Promise<boolean> {
  const to = Array.isArray(m.to) ? m.to : [m.to];
  try {
    const t = smtp();
    if (t) {
      await t.sendMail({ from: FROM, to, subject: m.subject, html: m.html, replyTo: m.replyTo, attachments: [...(m.attachments ?? []), logo] });
      return true;
    }
    const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".outbox");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.html`);
    await writeFile(file, `<!-- to: ${to.join(", ")} | subject: ${m.subject} -->\n${m.html.replaceAll(`cid:${LOGO_CID}`, `data:image/png;base64,${LOGO_PNG_BASE64}`)}`);
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
