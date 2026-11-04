"use client";
import { ArrowRight, Check, ChevronDown, Loader2, Plus, Search, Trash2, Wrench, X, ShieldCheck, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
    if (busy) return;
    setBusy(key);
    start(async () => {
      try {
        const r = await fn();
        if (r.cart && r.ids) { setCart(r.cart); setIds(r.ids); }
        if (!r.ok) toast(r.message, false);
      } catch { toast("We couldn't update your basket. Please try again.", false); }
      finally { setBusy(null); }
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
    <div className="booking-columns booking-service-layout">
      <div>
        <div className="booking-service-tabs" aria-label="Service categories">
          {p.tabs.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === tab} onClick={() => { setTab(t.id); router.replace(`/choose-service/${t.id}`, { scroll: false }); }} className={t.id === tab ? "is-active" : ""}>
              {t.title}
            </button>
          ))}
        </div>

        {current?.kind === "repairs" && (
          <div className="mt-5 space-y-4">
            <RepairSearch ctl={ctl} />
            <p className="booking-list-title">Browse repair categories</p>
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
          <ul className="booking-service-list mt-5">
            {p.mot && <Row ctl={ctl} it={{ id: MOT_ID, name: "MOT", price: p.mot.price, quote: 0, description: null }} label={`MOT — only ${money(p.mot.discounted)} when booked with a service`} price={p.mot.price} />}
            {p.servicing.map((it) => <ServicePackage key={it.id} it={it} ctl={ctl} mot={p.mot} onMotChange={(enabled) => act(`${it.id}option`, () => enabled ? basketAdd(it.id, true) : basketRemove(MOT_ID))} />)}
          </ul>
        )}

        {current?.kind === "diagnose" && (
          <ul className="booking-service-list mt-5">{p.diagnostics.map((it) => <Row key={it.id} it={it} ctl={ctl} />)}</ul>
        )}
      </div>

      <aside className="booking-sidebar" id="booking-basket">
        <section className="booking-summary"><div className="booking-summary-heading"><h2>Your booking</h2><span>{items.length} service{items.length===1?"":"s"}</span></div>
          {p.car}
          {!items.length && <div className="booking-basket-empty"><Wrench size={24}/><p>Your booking starts here</p><span>Choose a service to see your total.</span></div>}
          <ul className="booking-basket-items">{items.map(([id,it])=><li key={id}><div><strong>{it.item.name}</strong><span>{money(it.price)}</span><button type="button" disabled={!!busy} onClick={()=>act(`${id}x`,()=>basketRemove(Number(id)))} aria-label={`Remove ${it.item.name}`} className="booking-remove">{busy===`${id}x`?<Loader2 size={15} className="animate-spin"/>:<Trash2 size={15}/>}</button></div></li>)}</ul>
          <div className="booking-total" aria-live="polite"><span>Booking total</span><strong>{money(cart.totalPrice)}</strong></div>
          <div className="booking-summary-continue"><button type="button" disabled={!items.length || cart.totalPrice<=0 || !!busy} onClick={()=>router.push("/place/order")} className="btn btn-primary w-full">Choose date & time <ArrowRight size={16}/></button><p><CalendarClock size={14}/>Select your preferred arrival windows next.</p></div>
          <p className="booking-summary-note"><ShieldCheck size={15}/>Review everything before you confirm.</p>
        </section>
      </aside>
      <div className="booking-mobile-bar"><a href="#booking-basket" aria-label="Review your selected services" aria-live="polite"><span>{items.length} service{items.length===1?"":"s"} · Review booking</span><strong>{money(cart.totalPrice)}</strong></a><button type="button" disabled={!items.length || cart.totalPrice<=0 || !!busy} onClick={()=>router.push("/place/order")} className="btn btn-primary">Continue <ArrowRight size={16}/></button></div>
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
    <button onClick={() => ctl.toggle(it, withMot)} disabled={!!ctl.busy} aria-pressed={on} aria-label={`${on ? "Remove" : "Add"} ${it.name}${withMot ? " with MOT" : ""}`} className={`booking-add-button ${on ? "is-selected" : ""}`}>
      {ctl.busy === key ? <Loader2 size={16} className="animate-spin" /> : on ? <Check size={16} /> : <Plus size={16} />}<span>{on ? "Selected" : "Add"}</span>
    </button>
  );
}

function Row({ it, label, price, withMot, ctl }: { it: Item; label?: React.ReactNode; price?: number; withMot?: boolean; ctl: Ctl }) {
  const selected = ctl.ids.includes(it.id) && (!withMot || ctl.ids.includes(MOT_ID));
  const description = it.description?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g," ").trim();
  return <li className={`booking-service-row ${selected ? "is-selected" : ""}`}>
    <div className="min-w-0 flex-1"><h3>{label ?? it.name}</h3><p className="booking-service-price">{it.quote === 1 ? "Tailored quote" : money(price ?? it.price)}{withMot && <span>Combined price</span>}</p>
      {description && <details className="booking-service-details"><summary>Service details</summary><p>{description}</p></details>}
    </div><AddButton it={it} withMot={withMot} ctl={ctl}/>
  </li>;
}

function ServicePackage({ it, ctl, mot, onMotChange }: { it: Item; ctl: Ctl; mot: { price: number; discounted: number } | null; onMotChange: (enabled: boolean) => void }) {
  const [preferredMot, setPreferredMot] = useState(false);
  const selected = ctl.ids.includes(it.id);
  const withMot = selected ? ctl.ids.includes(MOT_ID) : preferredMot;
  const choose = (enabled: boolean) => { setPreferredMot(enabled); if (selected && enabled !== withMot) onMotChange(enabled); };
  return <li className="booking-package">
    {mot && <div className="booking-package-options" role="group" aria-label={`${it.name} options`}><button type="button" aria-pressed={!withMot} disabled={!!ctl.busy} onClick={()=>choose(false)}>Service only</button><button type="button" aria-pressed={withMot} disabled={!!ctl.busy} onClick={()=>choose(true)}>With MOT · +{money(mot.discounted)}</button></div>}
    <ul><Row it={it} ctl={ctl} label={it.name} withMot={withMot} price={it.price + (withMot && mot ? mot.discounted : 0)}/></ul>
  </li>;
}

function RepairSearch({ ctl }: { ctl: Ctl }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; rows: Item[]; error?: string }>({ q: "", rows: [] });
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try { const rows = await searchRepairs(term); if (!cancelled) setFound({ q: term, rows }); }
      catch { if (!cancelled) setFound({ q: term, rows: [], error: "Search is unavailable. Browse the categories below or try again." }); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
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
          {!loading && !rows.length && <li className="px-4 py-3 text-sm text-muted">{found.error || `No repairs match “${term}”.`}</li>}
        </ul>
      )}
    </div>
  );
}
