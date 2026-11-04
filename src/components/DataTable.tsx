import type { ReactNode } from "react";

export type DataColumn = { key: string; label: string; align?: "right"; primary?: boolean; mobileWide?: boolean };
export type DataRow = { id: string | number; cells: Record<string, ReactNode>; actions?: ReactNode };

/** Render semantic tables on wide screens and labelled records on phones. */
export function DataTable({ columns, rows, caption, density = "compact" }: { columns: DataColumn[]; rows: DataRow[]; caption: string; density?: "compact" | "comfortable" }) {
  const hasActions = rows.some((r) => r.actions);
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const other = columns.filter((c) => c !== primary);
  return <div className={`data-records data-${density}`}>
    <div className="data-desktop card"><div className="data-scroll" role="region" aria-label={`${caption} table`} tabIndex={0}><table>
      <caption className="sr-only">{caption}</caption><thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === "right" ? "text-right" : ""}>{c.label}</th>)}{hasActions && <th scope="col" className="text-right">Actions</th>}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}>{columns.map((c) => <td key={c.key} className={c.align === "right" ? "text-right" : ""}>{r.cells[c.key] ?? "—"}</td>)}{hasActions && <td><div className="record-actions">{r.actions}</div></td>}</tr>)}</tbody>
    </table></div></div>
    <ul className="data-mobile" aria-label={caption}>{rows.map((r) => <li key={r.id} className="record-card">
      <div className="record-heading">{r.cells[primary.key] ?? `#${r.id}`}</div>
      <dl className="record-fields">{other.slice(0, 4).map((c) => <div key={c.key} className={c.mobileWide ? "record-wide" : undefined}><dt>{c.label}</dt><dd>{r.cells[c.key] ?? "—"}</dd></div>)}</dl>
      {other.length > 4 && <details className="record-more"><summary>More details</summary><dl className="record-fields">{other.slice(4).map((c) => <div key={c.key} className={c.mobileWide ? "record-wide" : undefined}><dt>{c.label}</dt><dd>{r.cells[c.key] ?? "—"}</dd></div>)}</dl></details>}
      {r.actions && <div className="record-actions">{r.actions}</div>}
    </li>)}</ul>
  </div>;
}
