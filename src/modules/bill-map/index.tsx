import { useState, type KeyboardEvent } from "react";

import type { Snapshot } from "../../contract/snapshot";
import { toNumber } from "../../contract/snapshot";
import { eventKey, incomeDates, movedDate } from "../../engine/scenario";
import { addDays, type Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { Card, NightDefs, Segmented, clip, dayIndex, useNightIds, useWidth } from "../../primitives";
import { NO_FOCUS, defineModule, type Focus, type ModuleAction } from "../types";

/**
 * « Nuit » — every bill a star (community proposal "Deadline Galaxy", 2026). Position = due date,
 * area = weight in the base currency. Roll the stars up by week, category or month; the band
 * above filters by category; a star opens its bill, with a what-if to pay it on the next payday.
 */
type Bill = { key: string; date: string; was: string; label: string; amount: number; original: number; currency: string; foreign: boolean; category: string | null; moved: boolean; focus: boolean };
type Week = { from: string; to: string; amount: number };
type Model = {
  bills: Bill[]; total: number; week: Week; categories: { name: string; amount: number }[];
  asOf: string; end: string; incomes: string[]; focus: Focus; currency: string; foreign: string[];
  drill: { label: string; category: string | null; total: number; share: number; items: { key: string; date: string; amount: number; movedTo: string | null; payday: string | null }[] } | null;
};
type Grain = "bill" | "week" | "category" | "month";
type Group = { key: string; label: string; date: string; amount: number; items: Bill[]; moved: boolean; foreign: boolean; focus: boolean; slot: number };

export default defineModule<Model>({
  id: "bill-map",
  size: "full",
  question: {
    fr: "Quelles échéances pèsent le plus ?",
    de: "Welche Rechnungen wiegen am meisten?",
    it: "Quali scadenze pesano di più?",
    rm: "Tge termins pesan il pli fitg?",
    en: "Which bills weigh the most?",
  },
  reads: ["as_of", "horizon_end", "events", "next_income_date", "second_income_date", "base_currency"],
  messages: {
    fr: { foreign: "Anneau pointillé : en {list}, converti", title: "Du {from} au {to}, {amount} {cur} sortent : {share} % de la période", focused: "{what} : {amount} {cur}, {share} % des sorties de la période", by: "Regrouper par", bill: "Facture", week: "Semaine", category: "Catégorie", month: "Mois", weekOf: "Sem. du {date}", heaviest: "SEMAINE LA PLUS LOURDE · {amount} {cur}", payday: "paie {date}", star: "Une étoile = une facture ou un regroupement, sa taille suit le montant", nebula: "Nébuleuse : les 7 jours les plus lourds", movedLegend: "Vert : décalée par ton « et si »", filter: "Répartition par catégorie : clique pour filtrer", uncategorised: "Sans catégorie", open: "Voir {label}", occurrences: "{n} échéance(s) · {amount} {cur} · {share} % des sorties", payOn: "Et si je la paie le {date} ?", undo: "Annuler", aria: "{n} étoiles du {from} au {to}." },
    de: { foreign: "Gestrichelter Ring: in {list}, umgerechnet", title: "Vom {from} bis {to} gehen {amount} {cur} weg: {share} % des Zeitraums", focused: "{what}: {amount} {cur}, {share} % der Ausgaben des Zeitraums", by: "Gruppieren nach", bill: "Rechnung", week: "Woche", category: "Kategorie", month: "Monat", weekOf: "Woche ab {date}", heaviest: "SCHWERSTE WOCHE · {amount} {cur}", payday: "Lohn {date}", star: "Ein Stern = eine Rechnung oder Gruppe, seine Grösse folgt dem Betrag", nebula: "Nebel: die 7 schwersten Tage", movedLegend: "Grün: von deinem «Was wäre, wenn» verschoben", filter: "Aufteilung nach Kategorie: zum Filtern klicken", uncategorised: "Ohne Kategorie", open: "{label} ansehen", occurrences: "{n} Fälligkeit(en) · {amount} {cur} · {share} % der Ausgaben", payOn: "Und wenn ich sie am {date} zahle?", undo: "Rückgängig", aria: "{n} Sterne vom {from} bis {to}." },
    it: { foreign: "Anello tratteggiato: in {list}, convertito", title: "Dal {from} al {to} escono {amount} {cur}: il {share} % del periodo", focused: "{what}: {amount} {cur}, il {share} % delle uscite del periodo", by: "Raggruppa per", bill: "Fattura", week: "Settimana", category: "Categoria", month: "Mese", weekOf: "Sett. del {date}", heaviest: "SETTIMANA PIÙ PESANTE · {amount} {cur}", payday: "stipendio {date}", star: "Una stella = una fattura o un gruppo, la sua dimensione segue l’importo", nebula: "Nebulosa: i 7 giorni più pesanti", movedLegend: "Verde: spostata dal tuo «e se»", filter: "Ripartizione per categoria: clicca per filtrare", uncategorised: "Senza categoria", open: "Vedi {label}", occurrences: "{n} scadenza/e · {amount} {cur} · {share} % delle uscite", payOn: "E se la pago il {date}?", undo: "Annulla", aria: "{n} stelle dal {from} al {to}." },
    rm: { foreign: "Anè punctà: en {list}, convertì", title: "Dals {from} fin ils {to} sortan {amount} {cur}: {share} % da la perioda", focused: "{what}: {amount} {cur}, {share} % da las sortidas da la perioda", by: "Gruppar tenor", bill: "Quint", week: "Emna", category: "Categoria", month: "Mais", weekOf: "Emna dals {date}", heaviest: "L’EMNA LA PLI GREVA · {amount} {cur}", payday: "salari {date}", star: "Ina staila = in quint u ina gruppa, sia grondezza suonda la summa", nebula: "Nebla: ils 7 dis ils pli grevs", movedLegend: "Verd: spustà da tes «e sche»", filter: "Repartiziun tenor categoria: clicca per filtrar", uncategorised: "Senza categoria", open: "Mussar {label}", occurrences: "{n} termin(s) · {amount} {cur} · {share} % da las sortidas", payOn: "E sche jau al pai ils {date}?", undo: "Annullar", aria: "{n} stailas dals {from} fin ils {to}." },
    en: { foreign: "Dotted ring: in {list}, converted", title: "From {from} to {to}, {amount} {cur} goes out: {share}% of the period", focused: "{what}: {amount} {cur}, {share}% of the period’s outflows", by: "Group by", bill: "Bill", week: "Week", category: "Category", month: "Month", weekOf: "Week of {date}", heaviest: "HEAVIEST WEEK · {amount} {cur}", payday: "payday {date}", star: "A star = a bill or a group, its size follows the amount", nebula: "Nebula: the 7 heaviest days", movedLegend: "Green: moved by your what-if", filter: "Split by category: click to filter", uncategorised: "Uncategorised", open: "Open {label}", occurrences: "{n} bill(s) · {amount} {cur} · {share}% of outflows", payOn: "What if I pay it on {date}?", undo: "Undo", aria: "{n} stars from {from} to {to}." },
  },
  select: (s, ctx) => selectBills(s, ctx.focus ?? NO_FOCUS),
  View: ({ model, t, fmt, onAction }) => {
    const [grain, setGrain] = useState<Grain>("bill");
    const cur = model.currency;
    const f = model.focus;
    const inFocus = model.bills.filter((b) => b.focus);
    const focusSum = inFocus.reduce((sum, b) => sum + b.amount, 0);
    const what = [f.bill, f.category, f.month && fmt.month(`${f.month}-01`)].filter(Boolean).join(" · ");
    const title = what
      ? t("focused", { what, amount: fmt.num(focusSum), cur, share: fmt.num((focusSum / model.total) * 100) })
      : t("title", { from: fmt.shortDate(model.week.from), to: fmt.shortDate(model.week.to), amount: fmt.num(model.week.amount), cur, share: fmt.num((model.week.amount / model.total) * 100) });
    const focus = (patch: Partial<Focus>) => onAction({ type: "focus", focus: patch });
    return (
      <Card question={t("question")} title={title}>
        <div className="bz-night">
          <div className="bz-n-bar">
            <span className="bz-n-mut bz-eyebrow">{t("by")}</span>
            <Segmented label={t("by")} value={grain} onChange={setGrain}
              options={[{ key: "bill", label: t("bill") }, { key: "week", label: t("week") }, { key: "category", label: t("category") }, { key: "month", label: t("month") }]} />
          </div>
          {model.categories.length > 0 && (
            <div className="bz-n-roll" role="group" aria-label={t("filter")}>
              {model.categories.map((c, i) => (
                <button type="button" key={c.name} className={`bz-n-c${i % 8}${f.category && f.category !== c.name ? " bz-n-off" : ""}`} style={{ flexGrow: c.amount }}
                  aria-pressed={f.category === c.name} title={`${c.name} · ${fmt.num(c.amount)} ${cur}`}
                  onClick={() => focus({ category: f.category === c.name ? null : c.name })}>
                  {c.name} {fmt.num((c.amount / model.total) * 100)} %
                </button>
              ))}
            </div>
          )}
          <Galaxy model={model} grain={grain} t={t} fmt={fmt} onPick={(g) => {
            if (grain === "category") focus({ category: g.label === t("uncategorised") ? null : g.label });
            else if (grain === "month") focus({ month: g.items[0]!.date.slice(0, 7) });
            else if (grain === "week") setGrain("bill");
            else focus({ bill: g.label });
          }} />
          {model.drill && <Drill model={model} t={t} fmt={fmt} onAction={onAction} />}
          <div className="bz-n-legend">
            <span><i className="bz-n-sw-star" />{t("star")}</span>
            <span><i className="bz-n-sw-neb" />{t("nebula")}</span>
            <span><i className="bz-n-sw-ok" />{t("movedLegend")}</span>
            {model.foreign.length > 0 && <span><i className="bz-n-sw-foreign" />{t("foreign", { list: model.foreign.join(", ") })}</span>}
          </div>
        </div>
      </Card>
    );
  },
});

/** Pure: the bills of the horizon at their (possibly moved) dates, the heaviest week, the split by category, the opened bill. */
export function selectBills(s: Snapshot, focus: Focus): Model | null {
  const out = s.events.filter((e) => e.direction === "outflow" && toNumber(e.amount) > 0);
  const bills: Bill[] = out
    .map((e) => {
      const date = movedDate(e, focus.moved);
      return {
        key: eventKey(e), date, was: e.date, label: e.label, amount: toNumber(e.amount), original: toNumber(e.original_amount),
        currency: e.currency, foreign: e.currency !== s.base_currency, category: e.category ?? null, moved: date !== e.date,
        focus: (!focus.bill || e.label === focus.bill) && (!focus.category || e.category === focus.category) && (!focus.month || date.startsWith(focus.month)),
      };
    })
    .filter((b) => b.date >= s.as_of && b.date <= s.horizon_end)
    .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount || a.key.localeCompare(b.key));
  if (bills.length === 0) return null;
  const total = bills.reduce((sum, b) => sum + b.amount, 0);
  let week: Week = { from: bills[0]!.date, to: bills[0]!.date, amount: 0 };
  for (const first of bills) {
    const to = addDays(first.date, 6);
    const inside = bills.filter((b) => b.date >= first.date && b.date <= to);
    const amount = inside.reduce((sum, b) => sum + b.amount, 0);
    if (amount > week.amount) week = { from: first.date, to: inside[inside.length - 1]!.date, amount };
  }
  const byCat = new Map<string, number>();
  for (const b of bills) if (b.category) byCat.set(b.category, (byCat.get(b.category) ?? 0) + b.amount);
  const categories = [...byCat].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const paydays = incomeDates(s);
  let drill: Model["drill"] = null;
  if (focus.bill) {
    const items = out.filter((e) => e.label === focus.bill).sort((a, b) => a.date.localeCompare(b.date));
    if (items.length) {
      const sum = items.reduce((acc, e) => acc + toNumber(e.amount), 0);
      drill = {
        label: focus.bill, category: items[0]!.category ?? null, total: sum, share: (sum / total) * 100,
        items: items.map((e) => ({ key: eventKey(e), date: e.date, amount: toNumber(e.amount), movedTo: focus.moved[eventKey(e)] ?? null, payday: paydays.find((p) => p > e.date) ?? null })),
      };
    }
  }
  const foreign = [...new Set(bills.filter((b) => b.foreign).map((b) => b.currency))].sort();
  return { bills, total, week, categories, asOf: s.as_of, end: s.horizon_end, incomes: paydays, focus, currency: s.base_currency, foreign, drill };
}

function groups(model: Model, grain: Grain, t: Translate, fmt: Formatters): Group[] {
  const keyOf = (b: Bill) =>
    grain === "bill" ? b.key : grain === "week" ? `w${Math.floor(dayIndex(model.asOf, b.date) / 7)}` : grain === "category" ? `c${b.category ?? ""}` : `m${b.date.slice(0, 7)}`;
  const map = new Map<string, { items: Bill[]; weighted: number; amount: number }>();
  for (const b of model.bills) {
    const k = keyOf(b);
    const g = map.get(k) ?? { items: [], weighted: 0, amount: 0 };
    g.items.push(b); g.amount += b.amount; g.weighted += b.amount * dayIndex(model.asOf, b.date);
    map.set(k, g);
  }
  return [...map].map(([key, g], slot) => {
    const first = g.items[0]!;
    const label = grain === "bill" ? first.label
      : grain === "category" ? first.category ?? t("uncategorised")
      : grain === "month" ? fmt.month(first.date)
      : t("weekOf", { date: fmt.shortDate(addDays(model.asOf, Math.floor(dayIndex(model.asOf, first.date) / 7) * 7)) });
    return { key, label, date: addDays(model.asOf, Math.round(g.weighted / g.amount)), amount: g.amount, items: g.items, moved: g.items.some((b) => b.moved), foreign: g.items.every((b) => b.foreign), focus: g.items.some((b) => b.focus), slot };
  });
}

type Placed = { g: Group; cx: number; cy: number; r: number };

/** Biggest first, each at its own date on the free spot nearest the axis; shrink and retry when a crowded week leaves no room. */
export function pack(gs: Group[], x: (date: string) => number, top: number, bottom: number, maxR: number): Placed[] {
  const mid = (top + bottom) / 2;
  const biggest = Math.max(...gs.map((g) => g.amount));
  for (let scale = 1; ; scale *= 0.88) {
    const placed: Placed[] = [];
    let fits = true;
    for (const g of [...gs].sort((p, q) => q.amount - p.amount || p.key.localeCompare(q.key))) {
      const r = (6 + Math.sqrt(g.amount / biggest) * (maxR - 6)) * scale;
      const cx = x(g.date);
      const room = (cy: number) => cy - r >= top && cy + r <= bottom && placed.every((p) => Math.hypot(p.cx - cx, p.cy - cy) >= p.r + r + 3);
      let cy = mid;
      for (let k = 1; !room(cy) && k < 90; k++) cy = mid + Math.ceil(k / 2) * 4 * (k % 2 ? -1 : 1);
      if (!room(cy)) fits = false;
      placed.push({ g, cx, cy, r });
    }
    if (fits || scale < 0.2) return placed;
  }
}

function Galaxy({ model, grain, t, fmt, onPick }: { model: Model; grain: Grain; t: Translate; fmt: Formatters; onPick: (g: Group) => void }) {
  const ids = useNightIds();
  const [ref, W] = useWidth<HTMLDivElement>();
  const compact = W < 600;
  const H = compact ? 290 : 350;
  const gs = groups(model, grain, t, fmt);
  const maxR = (compact ? 30 : 46) * (grain === "bill" ? 1 : 1.2);
  const side = maxR + 6;
  const top = 40;
  const bottom = H - 30;
  const span = Math.max(dayIndex(model.asOf, model.end), 1);
  const x = (date: string) => side + (dayIndex(model.asOf, date) / span) * (W - 2 * side);
  const placed = pack(gs, x, top, bottom, maxR);
  const mid = (top + bottom) / 2;
  const showNebula = grain === "bill" || grain === "week";
  const nx = (x(model.week.from) + x(model.week.to)) / 2;
  const nw = Math.max(x(model.week.to) - x(model.week.from) + maxR * 3, maxR * 3);
  const catIndex = new Map(model.categories.map((c, i) => [c.name, i % 8]));
  const key = (g: Group) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(g); } };
  return (
    <div ref={ref} className="bz-chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label={t("aria", { n: gs.length, from: fmt.shortDate(model.asOf), to: fmt.shortDate(model.end) })}>
        <NightDefs ids={ids} glow={8} />
        {showNebula && (
          <g>
            <ellipse cx={nx} cy={mid} rx={nw / 2} ry={(bottom - top) / 2 + 20} className="bz-n-nebula" filter={`url(#${ids.haze})`} />
            <text x={Math.min(Math.max(nx, 150), W - 150)} y={top - 18} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing={1} className="bz-n-gold">
              {t("heaviest", { amount: fmt.num(model.week.amount), cur: model.currency })}
            </text>
          </g>
        )}
        {model.incomes.filter((d) => d >= model.asOf && d <= model.end).map((d) => (
          <g key={d}>
            <rect x={x(d) - 5} y={top - 6} width={10} height={bottom - top + 12} className="bz-n-beam" filter={`url(#${ids.haze})`} />
            <line x1={x(d)} x2={x(d)} y1={top - 4} y2={bottom + 4} className="bz-n-beam-line" />
            <text x={x(d)} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={700} className="bz-n-ok">{t("payday", { date: fmt.shortDate(d) })}</text>
          </g>
        ))}
        {placed.map(({ g, cx, cy, r }) => {
          const cat = grain === "category" ? catIndex.get(g.label) : undefined;
          return (
            <g key={g.key} className={`bz-n-hit bz-n-rise${g.focus ? "" : " bz-n-faded"}`} role="button" tabIndex={0}
              aria-label={`${t("open", { label: g.label })} · ${fmt.num(g.amount)} ${model.currency}`} onClick={() => onPick(g)} onKeyDown={key(g)}>
              <title>{`${g.label} · ${fmt.num(g.amount)} ${model.currency}${g.foreign && g.items.length === 1 ? ` (${fmt.money(g.items[0]!.original, g.items[0]!.currency)})` : ""}`}</title>
              <circle cx={cx} cy={cy} r={r} fill={cat === undefined ? `url(#${g.moved ? ids.moved : ids.star})` : undefined} className={cat === undefined ? undefined : `bz-n-f${cat}`} filter={`url(#${ids.glow})`} />
              {g.moved && <circle cx={cx} cy={cy} r={r + 3} className="bz-n-moved-ring" />}
              {g.foreign && !g.moved && <circle cx={cx} cy={cy} r={r + 3} className="bz-n-foreign-ring" />}
              {r >= 26 && (
                <>
                  <text x={cx} y={cy + 1} textAnchor="middle" fontSize={r > 38 ? 14 : 12} fontWeight={800} className="bz-n-dark">{fmt.num(g.amount)}</text>
                  <text x={cx} y={cy + 15} textAnchor="middle" fontSize={10} fontWeight={600} className="bz-n-dark">{clip(g.label, Math.floor(r / 3.6))}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Drill({ model, t, fmt, onAction }: { model: Model; t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void }) {
  const d = model.drill!;
  const moved = model.focus.moved;
  const move = (key: string, to: string | null) => {
    const next = { ...moved };
    if (to) next[key] = to; else delete next[key];
    onAction({ type: "focus", focus: { moved: next } });
  };
  return (
    <section className="bz-n-drill" aria-label={d.label}>
      <header>
        <strong>{d.label}</strong>
        <span>{t("occurrences", { n: d.items.length, amount: fmt.num(d.total), cur: model.currency, share: fmt.num(d.share) })}{d.category ? ` · ${d.category}` : ""}</span>
      </header>
      <ul>
        {d.items.map((i) => (
          <li key={i.key}>
            <span>{fmt.shortDate(i.date)}{i.movedTo ? ` → ${fmt.shortDate(i.movedTo)}` : ""} · −{fmt.num(i.amount)} {model.currency}</span>
            {i.movedTo
              ? <button type="button" className="bz-n-quiet" onClick={() => move(i.key, null)}>{t("undo")}</button>
              : i.payday && <button type="button" onClick={() => move(i.key, i.payday)}>{t("payOn", { date: fmt.shortDate(i.payday) })}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
