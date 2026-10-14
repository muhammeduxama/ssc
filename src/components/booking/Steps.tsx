const STEPS = ["Car & location", "Services", "Date & time", "Payment details"];

export function Steps({ at }: { at: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n < at ? "done" : n === at ? "current" : "todo";
        return (
          <li key={s} aria-current={state === "current" ? "step" : undefined} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${state === "current" ? "border-brand bg-brand text-on-brand" : state === "done" ? "border-brand text-brand" : "border-line text-muted"}`}>
            <span className="font-mono">{n}</span> {s}
          </li>
        );
      })}
    </ol>
  );
}

export function CarSummary({ reg, car }: { reg: string | null; car: { make: string; model: string; fuel: string; engine: string; year: string } }) {
  return (
    <div>
      <div className="inline-block rounded-md border-2 border-ink bg-accent px-3 py-1 font-mono text-lg font-bold uppercase tracking-widest text-on-accent">{reg ?? "No registration"}</div>
      <div className="mt-2 text-sm text-muted">{[car.make, car.model, car.fuel, car.engine, car.year].filter(Boolean).join("  |  ")}</div>
    </div>
  );
}
