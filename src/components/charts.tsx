"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = {
  contentStyle: { background: "var(--raised)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink)" },
  labelStyle: { color: "var(--muted)" },
};

export function OrdersArea({ data }: { data: { month: string; orders: number; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <Tooltip {...tip} />
        <Area type="monotone" dataKey="orders" name="Orders" stroke="var(--brand)" strokeWidth={2} fill="url(#g)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ValueBars({ data }: { data: { month: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `£${v}`} />
        <Tooltip {...tip} formatter={(v) => [`£${Number(v).toLocaleString("en-GB")}`, "Order value"]} cursor={{ fill: "var(--sunken)" }} />
        <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const SLICE: Record<string, string> = {
  completed: "var(--ok)",
  assigned: "var(--brand)",
  pending: "var(--accent)",
  rejected: "var(--danger)",
};

export function StatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="var(--raised)" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.status} fill={SLICE[d.status] ?? "var(--line-strong)"} />
              ))}
            </Pie>
            <Tooltip {...tip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-3xl font-medium leading-none">{total}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">orders</div>
          </div>
        </div>
      </div>
      <ul className="min-w-[8rem] flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLICE[d.status] ?? "var(--line-strong)" }} />
            <span className="flex-1 capitalize">{d.status}</span>
            <span className="font-mono text-muted">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
