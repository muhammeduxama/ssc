import { gbp } from "@/lib/format";

export function PriceTable({ title, rows, showNotes }: { title: string; rows: { id: number; make: string; model: string; notes: string; price: number }[]; showNotes?: boolean }) {
  if (!rows.length) return null;
  return (
    <div className="mt-12 border-t border-line pt-8">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">Examples from previous quotes. Your price depends on your vehicle and the work required.</p>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th">Make</th><th className="th">Model</th>{showNotes && <th className="th">Repair</th>}<th className="th text-right">Cost</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-night"><td className="td">{r.make}</td><td className="td">{r.model}</td>{showNotes && <td className="td">{r.notes}</td>}<td className="td text-right font-medium">{gbp(r.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
