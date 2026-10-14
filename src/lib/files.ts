import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";

export const PUBLIC_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LEGACY_PUBLIC_DIR ?? "../public");

/** Resolve a stored relative path safely inside the legacy public dir. */
export function resolvePublic(rel: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ PUBLIC_DIR, rel.replace(/^\/+/, ""));
  if (!full.startsWith(PUBLIC_DIR + path.sep)) throw new Error("bad path");
  return full;
}

/** File types users may upload. No SVG/HTML (they can carry scripts) and nothing executable. */
const UPLOAD_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Why a file can't be uploaded, or null when it's fine. */
export function uploadProblem(file: File, types: Iterable<string> = UPLOAD_TYPES): string | null {
  const allowed = new Set(types);
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!allowed.has(ext)) return `Upload a ${[...allowed].join(", ").toUpperCase()} file.`;
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}

/**
 * Save an uploaded file the way Laravel does: <dir>/<rand><time>.<ext>.
 * Returns the stored path, e.g. "blogs/uploads/123171234.png" (leading slash when asked).
 */
export async function saveUpload(file: File, dir: string, leadingSlash = false) {
  const problem = uploadProblem(file);
  if (problem) throw new Error(problem);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${randomInt(1_000_000_000, 2_147_483_647)}${Math.floor(Date.now() / 1000)}.${ext}`;
  const cleanDir = dir.replace(/^\/+|\/+$/g, "");
  const target = resolvePublic(`${cleanDir}/${name}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `${leadingSlash ? "/" : ""}${cleanDir}/${name}`;
}

export const isFile = (v: FormDataEntryValue | null): v is File => typeof v === "object" && v !== null && "arrayBuffer" in v && (v as File).size > 0;
