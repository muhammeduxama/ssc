"use client";
import { useActionState } from "react";
import type { ClientField } from "@/lib/crud/types";
import { asset } from "@/lib/asset";
import { MultiSelect } from "./MultiSelect";
import { RichText } from "./RichText";
import type { FormState } from "@/app/(app)/admin/r/[resource]/actions";

type Values = Record<string, string | number | boolean | null>;

export function ResourceForm({
  fields,
  values,
  action,
  isEdit,
  hidden,
  submitLabel,
}: {
  fields: ClientField[];
  values: Values;
  action: (s: FormState, f: FormData) => Promise<FormState>;
  isEdit: boolean;
  hidden?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  const err = (n: string) => state.errors?.[n];

  return (
    <form action={run} className="card p-6" encType="multipart/form-data">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state.message && (
        <p role="alert" className="mb-5 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {fields
          .filter((f) => !(f.editOnly && !isEdit))
          .map((f) => {
            const v = values[f.name] ?? (isEdit ? null : (f.default ?? null));
            const wide = f.wide || f.type === "richtext" || f.type === "code" || f.type === "multi";
            const id = `f-${f.name}`;
            const invalid = !!err(f.name);
            const base = `input ${invalid ? "!border-danger" : ""}`;
            return (
              <div key={f.name} className={wide ? "md:col-span-2" : ""}>
                {f.type !== "boolean" && (
                  <label htmlFor={id} className="label">
                    {f.label}
                    {f.required && <span className="text-danger"> *</span>}
                  </label>
                )}
                {(() => {
                  switch (f.type) {
                    case "textarea":
                      return <textarea id={id} name={f.name} defaultValue={v as string} rows={4} className={base} />;
                    case "code":
                      return <textarea id={id} name={f.name} defaultValue={v as string} rows={5} className={`${base} font-mono text-xs`} />;
                    case "richtext":
                      return <RichText name={f.name} defaultValue={v as string} invalid={invalid} />;
                    case "boolean":
                      return (
                        <label className="flex h-full items-center gap-3 pt-6">
                          <input type="checkbox" name={f.name} value="1" defaultChecked={!!v} className="h-5 w-5" />
                          <span className="text-sm font-medium">{f.label}</span>
                        </label>
                      );
                    case "select":
                    case "relation":
                      return (
                        <select id={id} name={f.name} defaultValue={v === null ? "" : String(v)} className={base}>
                          {!f.required && <option value="">—</option>}
                          {f.required && v === null && <option value="">Choose…</option>}
                          {f.choices?.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      );
                    case "multi":
                      return <MultiSelect name={f.name} choices={f.choices ?? []} defaultValue={v as string} />;
                    case "image":
                    case "file":
                      return (
                        <div className="flex items-center gap-4">
                          {v && f.type === "image" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={asset(String(v))} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
                          )}
                          <input id={id} type="file" name={f.name} accept={f.type === "image" ? "image/*" : undefined} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
                        </div>
                      );
                    case "password":
                      return <input id={id} type="password" name={f.name} autoComplete="new-password" className={base} />;
                    case "number":
                    case "money":
                      return <input id={id} type="number" step="any" name={f.name} defaultValue={v === null ? "" : String(v)} className={base} />;
                    case "email":
                      return <input id={id} type="email" name={f.name} defaultValue={(v as string) ?? ""} className={base} />;
                    case "date":
                      return <input id={id} type="date" name={f.name} defaultValue={v ? String(v).slice(0, 10) : ""} className={base} />;
                    default:
                      return <input id={id} name={f.name} defaultValue={v === null ? "" : String(v)} className={base} placeholder={f.type === "slug" ? "Generated from the title if left empty" : undefined} />;
                  }
                })()}
                {(err(f.name) || f.help) && <p className={`mt-1 text-xs ${err(f.name) ? "text-danger" : "text-muted"}`}>{err(f.name) ?? f.help}</p>}
              </div>
            );
          })}
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
