"use client";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Opt = { id: number; label: string };
const fields = ["make", "model", "fuel", "engine", "year"] as const;
type Field = typeof fields[number];
const levels = { make: "makes", model: "models", fuel: "fuels", engine: "engines", year: "years" };
const emptyValues = { make: "", model: "", fuel: "", engine: "", year: "" };
const emptyOptions: Record<Field, Opt[]> = { make: [], model: [], fuel: [], engine: [], year: [] };
async function load(level: string, id: string, signal: AbortSignal): Promise<Opt[]> {
  const response = await fetch(`/api/vehicle?level=${level}${id ? `&id=${encodeURIComponent(id)}` : ""}`, { signal });
  if (!response.ok) throw new Error("Vehicle lookup failed");
  return response.json();
}

export function VehiclePicker({ onCompleteChange }: { onCompleteChange?: (complete: boolean) => void }) {
  const prefix = useId();
  const [values, setValues] = useState(emptyValues);
  const [options, setOptions] = useState(emptyOptions);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<Field | null>("make");
  const [retry, setRetry] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    load("makes", "", controller.signal)
      .then((make) => setOptions((current) => ({ ...current, make })))
      .catch(() => { if (!controller.signal.aborted) setError("Vehicle makes couldn’t load. Please retry."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(null); });
    return () => request.current?.abort();
  }, [retry]);

  const pick = async (field: Field, value: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const index = fields.indexOf(field);
    const nextValues = { ...values, [field]: value };
    const nextOptions = { ...options };
    for (const dependent of fields.slice(index + 1)) { nextValues[dependent] = ""; nextOptions[dependent] = []; }
    setValues(nextValues);
    onCompleteChange?.(fields.every((key) => !!nextValues[key]));
    setOptions(nextOptions);
    setError("");
    const next = fields[index + 1];
    setLoading(next && value ? next : null);
    if (!next || !value) return;
    try {
      const rows = await load(levels[next], value, controller.signal);
      if (!controller.signal.aborted) {
        setOptions((current) => ({ ...current, [next]: rows }));
        if (!rows.length) setError("No matching vehicles found. Please try another selection.");
      }
    } catch { if (!controller.signal.aborted) setError("Vehicle details couldn’t load. Select the previous option again to retry."); }
    finally { if (!controller.signal.aborted) setLoading(null); }
  };
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Start with your make. We’ll narrow down the options.</p>
        <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand" aria-live="polite">{fields.filter((field) => values[field]).length} / 5 selected</span>
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {fields.map((field, index) => {
          const disabled = loading === field || !options[field].length;
          const label = field === "engine" ? "Engine size" : field === "year" ? "Year of manufacture" : field === "fuel" ? "Fuel type" : field[0].toUpperCase() + field.slice(1);
          return <div key={field} className={field === "year" ? "sm:col-span-2" : ""}>
            <label className="label flex items-center justify-between" htmlFor={`${prefix}-${field}`}>{label}{values[field] && <Check size={15} className="text-brand" aria-hidden="true" />}</label>
            <div className="vehicle-select-wrap">
              <select id={`${prefix}-${field}`} name={field} required value={values[field]} onChange={(event) => void pick(field, event.target.value)} disabled={disabled} className="input vehicle-select" aria-describedby={!options[field].length && index > 0 ? `${prefix}-${field}-hint` : undefined}>
                <option value="">{loading === field ? "Loading options…" : `Choose ${field === "fuel" ? "fuel type" : field === "engine" ? "engine size" : field}`}</option>
                {options[field].map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <span className={`vehicle-select-icon ${disabled ? "opacity-40" : ""}`} aria-hidden="true">{loading === field ? <Loader2 size={17} className="animate-spin" /> : <ChevronDown size={18} strokeWidth={1.8} />}</span>
            </div>
            {!options[field].length && index > 0 && <p id={`${prefix}-${field}-hint`} className="mt-1.5 text-xs text-muted">Choose {fields[index - 1]} first</p>}
          </div>;
        })}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}{!options.make.length && <button type="button" onClick={() => { setError(""); setLoading("make"); setRetry((n) => n + 1); }} className="ml-2 font-semibold underline">Retry</button>}</p>}
    </div>
  );
}
