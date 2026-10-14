import "server-only";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isFile, saveUpload, uploadProblem } from "@/lib/files";
import type { ClientField, Field, Resource } from "./types";

type Delegate = {
  findMany: (a: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (a: unknown) => Promise<Record<string, unknown> | null>;
  findFirst: (a: unknown) => Promise<Record<string, unknown> | null>;
  count: (a: unknown) => Promise<number>;
  create: (a: unknown) => Promise<Record<string, unknown>>;
  update: (a: unknown) => Promise<Record<string, unknown>>;
  delete: (a: unknown) => Promise<unknown>;
};

export const delegate = (model: string) => (db as unknown as Record<string, Delegate>)[model];

const scalarTypes = (model: string) => {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === model);
  if (!m) throw new Error(`Unknown model ${model}`);
  return new Map(m.fields.filter((f) => f.kind === "scalar").map((f) => [f.name, { type: f.type, required: f.isRequired, hasDefault: f.hasDefaultValue }]));
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

/** Convert a form string to the Prisma column type. */
function coerce(type: string, raw: string | null, required: boolean) {
  if (raw === null || raw === "") {
    if (type === "Boolean") return false;
    if (!required) return null;
    if (type === "String") return "";
    if (["Int", "BigInt", "Decimal", "Float"].includes(type)) return type === "BigInt" ? BigInt(0) : 0;
    return undefined;
  }
  switch (type) {
    case "BigInt":
      return BigInt(raw);
    case "Int":
      return parseInt(raw, 10);
    case "Float":
      return parseFloat(raw);
    case "Decimal":
      return new Prisma.Decimal(raw);
    case "Boolean":
      return raw === "1" || raw === "true" || raw === "on";
    case "DateTime":
      return new Date(raw);
    default:
      return raw;
  }
}

/** JSON-safe value for the UI. */
export function plain(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "toFixed" in v) return Number(v as unknown as number);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

export async function clientFields(r: Resource): Promise<ClientField[]> {
  return Promise.all(
    r.fields.map(async (f) => {
      if ((f.type !== "relation" && f.type !== "multi") || !f.relation) return { ...f, choices: f.options };
      const rows = await delegate(f.relation.model).findMany({
        where: f.relation.where,
        orderBy: f.relation.orderBy ?? { [f.relation.label]: "asc" },
        select: { id: true, [f.relation.label]: true },
        take: 2000,
      });
      return { ...f, choices: rows.map((x) => ({ value: String(x.id), label: String(x[f.relation!.label] ?? `#${x.id}`) })) };
    }),
  );
}

export type ListOpts = { q?: string; page?: number; parent?: string; filters?: Record<string, string> };

export async function listRecords(r: Resource, o: ListOpts) {
  const take = 20;
  const page = Math.max(1, o.page ?? 1);
  const types = scalarTypes(r.model);
  const where: Record<string, unknown> = {};
  if (r.parent && o.parent) where[r.parent.field] = coerce(types.get(r.parent.field)!.type, o.parent, true);
  for (const [k, v] of Object.entries(o.filters ?? {})) if (v && types.has(k)) where[k] = coerce(types.get(k)!.type, v, true);
  const q = o.q?.trim();
  if (q && r.search?.length) {
    where.OR = r.search.map((f) => {
      const t = types.get(f)?.type;
      if (t === "BigInt" || t === "Int") return Number.isInteger(Number(q)) ? { [f]: coerce(t, q, true) } : { id: -1 };
      return { [f]: { contains: q } };
    });
  }
  const d = delegate(r.model);
  const [rows, count] = await Promise.all([
    d.findMany({ where, orderBy: r.orderBy ?? { id: "desc" }, take, skip: (page - 1) * take }),
    d.count({ where }),
  ]);

  // Resolve relation labels for listed relation columns.
  const labels: Record<string, Map<string, string>> = {};
  for (const f of r.fields.filter((x) => x.list && x.type === "relation" && x.relation)) {
    const ids = [...new Set(rows.map((x) => x[f.name]).filter((v) => v !== null && v !== undefined))];
    if (!ids.length) continue;
    const rel = await delegate(f.relation!.model).findMany({ where: { id: { in: ids } }, select: { id: true, [f.relation!.label]: true } });
    labels[f.name] = new Map(rel.map((x) => [String(x.id), String(x[f.relation!.label])]));
  }

  return {
    count,
    page,
    pages: Math.max(1, Math.ceil(count / take)),
    rows: rows.map((x) => {
      const out: Record<string, string | number | boolean | null> = { id: plain(x.id) };
      for (const f of r.fields) {
        const v = plain(x[f.name]);
        out[f.name] = f.type === "relation" && v !== null ? (labels[f.name]?.get(String(v)) ?? `#${v}`) : v;
      }
      return out;
    }),
  };
}

export async function getRecord(r: Resource, id: string) {
  const row = await delegate(r.model).findUnique({ where: { id: BigInt(id) } });
  if (!row) return null;
  const out: Record<string, string | number | boolean | null> = { id: plain(row.id) };
  for (const f of r.fields) {
    if (f.type === "multi" && f.through) {
      const links = await delegate(f.through.model).findMany({ where: { [f.through.self]: BigInt(id) }, select: { [f.through.other]: true } });
      out[f.name] = links.map((l) => String(l[f.through!.other])).join(",");
    } else out[f.name] = f.type === "password" ? null : plain(row[f.name]);
  }
  return out;
}

export type SaveResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> };

export async function saveRecord(r: Resource, form: FormData, id?: string): Promise<SaveResult> {
  const types = scalarTypes(r.model);
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const f of r.fields as Field[]) {
    if (f.editOnly && !id) continue;
    if (f.type === "multi") continue;
    const t = types.get(f.name);
    if (!t) continue;

    if (f.type === "image" || f.type === "file") {
      const file = form.get(f.name);
      if (isFile(file) && uploadProblem(file)) errors[f.name] = uploadProblem(file)!;
      else if (isFile(file)) data[f.name] = await saveUpload(file, f.dir ?? "uploads", f.leadingSlash);
      else if (f.required && !id) errors[f.name] = `${f.label} is required.`;
      continue;
    }
    if (f.type === "password") {
      const pw = String(form.get(f.name) ?? "");
      if (pw) {
        if (pw.length < 8) errors[f.name] = "Use at least 8 characters.";
        else data[f.name] = (await bcrypt.hash(pw, 10)).replace(/^\$2[ab]\$/, "$2y$");
      } else if (!id && f.required) errors[f.name] = `${f.label} is required.`;
      continue;
    }
    if (f.type === "boolean") {
      data[f.name] = form.get(f.name) === "1" || form.get(f.name) === "on";
      continue;
    }

    let raw = form.get(f.name);
    let str = raw === null ? null : String(raw).trim();
    if (f.type === "slug" && !str && f.slugFrom) str = slugify(String(form.get(f.slugFrom) ?? ""));
    if (f.type === "slug" && str) str = slugify(str);
    if (f.required && !str) {
      errors[f.name] = `${f.label} is required.`;
      continue;
    }
    if ((f.type === "number" || f.type === "money") && str && Number.isNaN(Number(str))) {
      errors[f.name] = `${f.label} must be a number.`;
      continue;
    }
    try {
      const v = coerce(t.type, str, t.required);
      if (v !== undefined) data[f.name] = v;
    } catch {
      errors[f.name] = `${f.label} is not valid.`;
    }
    raw = null;
  }

  if (r.parent && !id) {
    const p = form.get(r.parent.field);
    if (p) data[r.parent.field] = coerce(types.get(r.parent.field)!.type, String(p), true);
  }

  // Uniqueness checks the app enforced in Laravel validation.
  for (const f of r.fields.filter((x) => x.unique && data[x.name] !== undefined && data[x.name] !== null && data[x.name] !== "")) {
    const clash = await delegate(r.model).findFirst({ where: { [f.name]: data[f.name], ...(id ? { NOT: { id: BigInt(id) } } : {}) }, select: { id: true } });
    if (clash) errors[f.name] = `This ${f.label.toLowerCase()} is already taken.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const now = new Date();
  if (types.has("updated_at")) data.updated_at = now;
  const d = delegate(r.model);
  if (id) {
    const row = await d.update({ where: { id: BigInt(id) }, data });
    await syncMulti(r, BigInt(String(row.id)), form);
    await r.afterSave?.(BigInt(String(row.id)), form);
    return { ok: true, id: Number(row.id) };
  }
  if (types.has("created_at")) data.created_at = now;
  for (const [k, v] of Object.entries(r.createDefaults ?? {})) if (data[k] === undefined) data[k] = v;
  // Fill required columns without defaults that the form does not cover.
  for (const [k, t] of types) {
    if (k === "id" || data[k] !== undefined || !t.required || t.hasDefault) continue;
    data[k] = coerce(t.type, null, true);
  }
  const row = await d.create({ data });
  await syncMulti(r, BigInt(String(row.id)), form);
  await r.afterCreate?.(BigInt(String(row.id)), form);
  await r.afterSave?.(BigInt(String(row.id)), form);
  return { ok: true, id: Number(row.id) };
}

export async function deleteRecord(r: Resource, id: string) {
  await delegate(r.model).delete({ where: { id: BigInt(id) } });
}

async function syncMulti(r: Resource, id: bigint, form: FormData) {
  const now = new Date();
  for (const f of r.fields.filter((x) => x.type === "multi" && x.through)) {
    const t = f.through!;
    const ids = [...new Set(form.getAll(f.name).map(String).filter(Boolean))];
    const d = delegate(t.model) as Delegate & { deleteMany: (a: unknown) => Promise<unknown>; createMany: (a: unknown) => Promise<unknown> };
    await d.deleteMany({ where: { [t.self]: id } });
    if (ids.length)
      await d.createMany({ data: ids.map((o) => ({ [t.self]: id, [t.other]: BigInt(o), created_at: now, updated_at: now })) });
  }
}
