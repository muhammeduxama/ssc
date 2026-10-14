import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { PUBLIC_DIR, resolvePublic } from "@/lib/files";
import { getSession, isStaff } from "@/lib/session";

/** Only these file types are ever served; data dumps, logs, archives and config files never are. */
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp4": "video/mp4",
  ".css": "text/css", ".js": "text/javascript", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".eot": "application/vnd.ms-fontobject",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const INLINE = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".mp4", ".css", ".js", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg"]);

/** Upload folders Laravel used; old rows sometimes stored a wrong folder (e.g. "sschello/…", "ssc/mechanic123.png"). */
const UPLOAD_DIRS = ["ssc/mechanic", "blogs/uploads", "blogs/users", "uploads/message", "ssc/category", "uploads/services", "ssc/email/attach", "ssc/mechanic/app"];

/** Mechanic documents and signed agreements: staff, or the mechanic they belong to. */
const OWNER_DIRS = ["ssc/mechanic", "ssc/signable"];
/** Chat attachments, job photos and other private uploads: any signed-in user (random file names). */
const LOGIN_DIRS = ["ssc/mechanic/app", "uploads/message", "uploads/attachment", "uploads/documents", "uploads/csv"];

const under = (full: string, dir: string) => path.dirname(full) === path.join(PUBLIC_DIR, dir);

async function locate(rel: string) {
  const direct = resolvePublic(rel);
  try {
    if ((await stat(direct)).isFile()) return direct;
  } catch {}
  const base = path.basename(rel).replace(/^mechanic/, "");
  for (const d of UPLOAD_DIRS) {
    try {
      const f = resolvePublic(`${d}/${base}`);
      if ((await stat(f)).isFile()) return f;
    } catch {}
  }
  return null;
}

/** Loose documents dropped in the folder root (old invoices, test PDFs): staff only. */
const atRoot = (full: string) => path.dirname(full) === PUBLIC_DIR && ![".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"].includes(path.extname(full).toLowerCase());

async function mayRead(full: string) {
  const login = LOGIN_DIRS.some((d) => under(full, d));
  const owner = OWNER_DIRS.some((d) => under(full, d));
  const root = atRoot(full);
  if (!login && !owner && !root) return true;
  const s = await getSession();
  if (!s) return false;
  if (isStaff(s) || login) return true;
  if (root) return false;
  if (s.role !== "mechanic") return false;
  const base = path.basename(full);
  const me = BigInt(s.id);
  const [doc, sig] = await Promise.all([
    db.requiredocs.findFirst({ where: { user_id: me, document: { endsWith: base } }, select: { id: true } }),
    db.signables.findFirst({ where: { user_id: me, name: { endsWith: base } }, select: { id: true } }),
  ]);
  return !!(doc || sig);
}

const notFound = () => new Response("Not found", { status: 404, headers: { "X-Content-Type-Options": "nosniff" } });

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path.map(decodeURIComponent);
  try {
    const full = await locate(parts.join("/"));
    if (!full) return notFound();
    const ext = path.extname(full).toLowerCase();
    if (!TYPES[ext]) return notFound();
    if (!(await mayRead(full))) return notFound();
    const isPrivate = atRoot(full) || [...OWNER_DIRS, ...LOGIN_DIRS].some((d) => under(full, d));
    return new Response(new Uint8Array(await readFile(/*turbopackIgnore: true*/ full)), {
      headers: {
        "Content-Type": TYPES[ext],
        "X-Content-Type-Options": "nosniff",
        // The sandboxing Content-Security-Policy for these files is set in next.config.ts.
        ...(INLINE.has(ext) ? {} : { "Content-Disposition": "attachment" }),
        "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=3600",
      },
    });
  } catch {
    return notFound();
  }
}
