"use client";
import { ArrowRight, Check, ChevronDown, Loader2, Plus, Search, Trash2, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, useTransition } from "react";
import { basketAdd, basketRemove, searchRepairs } from "@/app/actions/booking";
import { useToast } from "@/components/Toast";
import type { Cart } from "@/lib/booking/pricing";

export type Item = { id: number; name: string; price: number; quote: 0 | 1; description: string | null };
export type Group = { title: string; groups: { title: string; items: Item[] }[] };
type Tab = { id: number; title: string; kind: "repairs" | "services" | "diagnose" };

const MOT_ID = 1003;
const money = (n: number) => `£${n.toFixed(2)}`;

export function ServiceChooser(p: {
  initialTab: number;
  tabs: Tab[];
  repairs: Group[];
  servicing: Item[];
  mot: { price: number; discounted: number } | null;
  diagnostics: Item[];
  cart: Cart;
  ids: number[];
  car: React.ReactNode;
}) {
  const [tab, setTab] = useState(p.initialTab);
  const [cart, setCart] = useState(p.cart);
  const [ids, setIds] = useState(p.ids);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const act = (key: string, fn: () => ReturnType<typeof basketAdd>) => {
    setBusy(key);
    start(async () => {
      const r = await fn();
      setBusy(null);
      if (r.cart && r.ids) {
        setCart(r.cart);
        setIds(r.ids);
      }
      if (!r.ok) toast(r.message, false);
    });
  };
  const inCart = (id: number) => ids.includes(id);
  const toggle = (it: Item, withMot = false) => {
    const key = `${it.id}${withMot ? "m" : ""}`;
    if (inCart(it.id) && (!withMot || inCart(MOT_ID))) act(key, () => basketRemove(it.id, withMot));
    else act(key, () => basketAdd(it.id, withMot));
  };
  const current = p.tabs.find((t) => t.id === tab) ?? p.tabs[0];
  const items = Object.entries(cart.items ?? {});

  const ctl: Ctl = { ids, busy, toggle };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-raised p-1" role="tablist">
          {p.tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === tab} onClick={() => { setTab(t.id); router.replace(`/choose-service/${t.id}`, { scroll: false }); }} className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold uppercase transition ${t.id === tab ? "bg-brand text-on-brand" : "text-muted hover:bg-sunken"}`}>
              {t.title}
            </button>
          ))}
        </div>

        {current?.kind === "repairs" && (
          <div className="mt-5 space-y-4">
            <RepairSearch ctl={ctl} />
            <p className="font-display text-lg font-semibold">Select from repair categories</p>
            <div className="space-y-2">
              {p.repairs.map((g) => (
                <details key={g.title} className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold">
                    {g.title} <ChevronDown size={18} className="transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-line">
                    {g.groups.map((sg) => (
                      <div key={sg.title}>
                        <p className="bg-sunken px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{sg.title}</p>
                        <ul>{sg.items.map((it) => <Row key={it.id} it={it} ctl={ctl} />)}</ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {current?.kind === "services" && (
          <ul className="card mt-5">
            {p.mot && <Row ctl={ctl} it={{ id: MOT_ID, name: "MOT", price: p.mot.price, quote: 0, description: null }} label={`MOT — only ${money(p.mot.discounted)} when booked with a service`} price={p.mot.price} cut />}
            {p.servicing.map((it) => (
              <Fragment key={it.id}>
                <Row ctl={ctl} it={it} label={`${it.name} only`} price={it.price} cut />
                {p.mot && <Row ctl={ctl} it={it} label={<>{it.name} <span className="text-danger">with MOT</span></>} price={it.price + p.mot.discounted} cut withMot />}
              </Fragment>
            ))}
          </ul>
        )}

        {current?.kind === "diagnose" && (
          <ul className="card mt-5">{p.diagnostics.map((it) => <Row key={it.id} it={it} ctl={ctl} />)}</ul>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-night px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-night-ink">Your basket</div>
          <div className="space-y-4 p-5">
            {p.car}
            <div className="flex items-center justify-between rounded-lg bg-sunken px-4 py-3 font-semibold">
              <span className="uppercase">Total</span>
              <span className="font-display text-xl">{money(cart.totalPrice)}</span>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Selected services · {items.length}</p>
              {items.length === 0 && <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Wrench size={14} /> Add a service to get started.</p>}
              <ul className="mt-2 space-y-1.5">
                {items.map(([id, it]) => (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{it.item.name}</span>
                    <span className="font-medium">{money(it.price)}</span>
                    <button onClick={() => act(`${id}x`, () => basketRemove(Number(id)))} aria-label={`Remove ${it.item.name}`} className="text-muted hover:text-danger">
                      {busy === `${id}x` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => (cart.totalPrice > 0 ? router.push("/place/order") : toast("Please add minimum one item to basket", false))}
              className="btn btn-primary w-full !py-3"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

type Ctl = { ids: number[]; busy: string | null; toggle: (it: Item, withMot?: boolean) => void };

function AddButton({ it, withMot = false, ctl }: { it: Item; withMot?: boolean; ctl: Ctl }) {
  const key = `${it.id}${withMot ? "m" : ""}`;
  if (it.quote === 1)
    return (
      <Link href={`/services/${it.id}/repairs`} className="btn btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Get quote <ArrowRight size={14} /></Link>
    );
  const on = ctl.ids.includes(it.id) && (!withMot || ctl.ids.includes(MOT_ID));
  return (
    <button onClick={() => ctl.toggle(it, withMot)} disabled={ctl.busy === key} aria-pressed={on} aria-label={`${on ? "Remove" : "Add"} ${it.name}${withMot ? " with MOT" : ""}`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${on ? "border-brand bg-brand text-on-brand" : "border-line hover:border-brand hover:text-brand"}`}>
      {ctl.busy === key ? <Loader2 size={16} className="animate-spin" /> : on ? <Check size={16} /> : <Plus size={16} />}
    </button>
  );
}

function Row({ it, label, price, cut, withMot, ctl }: { it: Item; label?: React.ReactNode; price?: number; cut?: boolean; withMot?: boolean; ctl: Ctl }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0">
      <div className="min-w-0">
        <div className="font-medium">{label ?? it.name}</div>
        {price != null && it.quote !== 1 && (
          <div className="mt-0.5 text-sm">
            <span className="font-semibold text-brand">{money(price)}</span>
            {cut && <span className="ml-2 text-muted line-through">{money(price * 1.1)}</span>}
          </div>
        )}
      </div>
      <AddButton it={it} withMot={withMot} ctl={ctl} />
    </li>
  );
}

function RepairSearch({ ctl }: { ctl: Ctl }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; rows: Item[] }>({ q: "", rows: [] });
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const t = setTimeout(async () => setFound({ q: term, rows: await searchRepairs(term) }), 250);
    return () => clearTimeout(t);
  }, [q]);
  const term = q.trim();
  const loading = !!term && found.q !== term;
  const rows = term && found.q === term ? found.rows : [];
  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search service or repair" aria-label="Search service or repair" className="input !h-12 pl-9" />
        {q && <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><X size={16} /></button>}
      </div>
      {(loading || rows.length > 0 || (term && !loading)) && (
        <ul className="card mt-2">
          {loading && <li className="px-4 py-3 text-sm text-muted">Searching…</li>}
          {!loading && rows.map((it) => <Row key={it.id} it={it} ctl={ctl} />)}
          {!loading && !rows.length && <li className="px-4 py-3 text-sm text-muted">No repairs match “{term}”.</li>}
        </ul>
      )}
    </div>
  );
}
