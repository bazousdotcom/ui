import type { KeyboardEvent } from "react";

import { toNumber } from "../../contract/snapshot";
import { baseSeries, movedDate, replayMoves } from "../../engine/scenario";
import { Card } from "../../primitives";
import { NO_FOCUS, defineModule } from "../types";

/**
 * « Nuit » — the months as acts (community proposals "Calendar Wall" and "Mission in three
 * acts", 2026). Each month is an orb whose colour is its state, read from the engine's daily
 * balances: below zero (red), tight (amber, ends lower than it began), breathing (green).
 * Choose a month to light it in every scene; a what-if replays the months.
 */
type Movement = { date: string; label: string; amount: number; inflow: boolean; category: string | null };
type State = "under" | "tight" | "breathe";
type Month = {
  key: string; from: string; to: string; partial: boolean; start: number; end: number;
  low: { date: string; balance: number }; in: number; out: number; state: State; curve: number[]; movements: Movement[];
};
type Model = { months: Month[]; hardest: Month; selected: string | null; category: string | null; currency: string };

const SHOWN = 3;
const SHOWN_SELECTED = 8;

export default defineModule<Model>({
  id: "month-wall",
  size: "full",
  question: {
    fr: "Comment se présente chaque mois ?",
    de: "Wie sieht jeder Monat aus?",
    it: "Come si presenta ogni mese?",
    rm: "Co sa preschenta mintga mais?",
    en: "What does each month look like?",
  },
  reads: ["as_of", "horizon_end", "opening_balance", "points", "events", "base_currency"],
  messages: {
    fr: { title: "{month} est le mois le plus serré : point bas {amount} {cur} le {date}", calm: "Chaque mois reste au-dessus de zéro, le plus bas en {month} ({amount} {cur})", "state.under": "Sous zéro", "state.tight": "Serré", "state.breathe": "Respire", until: "jusqu’au {date}", from: "dès le {date}", in: "Entrées", out: "Sorties", low: "Point bas · {date}", end: "Fin du mois", lowShort: "bas {amount}", more: "Clique pour tout voir", open: "Éclairer {month}", close: "Revenir à tous les mois", aria: "Solde de {month}, du {from} au {to}." },
    de: { title: "{month} ist der knappste Monat: Tiefpunkt {amount} {cur} am {date}", calm: "Jeder Monat bleibt über null, am tiefsten im {month} ({amount} {cur})", "state.under": "Unter null", "state.tight": "Knapp", "state.breathe": "Luft", until: "bis {date}", from: "ab {date}", in: "Einnahmen", out: "Ausgaben", low: "Tiefpunkt · {date}", end: "Monatsende", lowShort: "tief {amount}", more: "Klicken, um alles zu sehen", open: "{month} hervorheben", close: "Zurück zu allen Monaten", aria: "Saldo im {month}, vom {from} bis {to}." },
    it: { title: "{month} è il mese più stretto: minimo {amount} {cur} il {date}", calm: "Ogni mese resta sopra lo zero, il più basso a {month} ({amount} {cur})", "state.under": "Sotto zero", "state.tight": "Stretto", "state.breathe": "Respira", until: "fino al {date}", from: "dal {date}", in: "Entrate", out: "Uscite", low: "Minimo · {date}", end: "Fine mese", lowShort: "min. {amount}", more: "Clicca per vedere tutto", open: "Illumina {month}", close: "Torna a tutti i mesi", aria: "Saldo di {month}, dal {from} al {to}." },
    rm: { title: "{month} è il mais il pli stretg: punct bass {amount} {cur} ils {date}", calm: "Mintga mais resta sur nulla, il pli bass en {month} ({amount} {cur})", "state.under": "Sut nulla", "state.tight": "Stretg", "state.breathe": "Respira", until: "fin ils {date}", from: "a partir dals {date}", in: "Entradas", out: "Sortidas", low: "Punct bass · {date}", end: "Fin dal mais", lowShort: "bass {amount}", more: "Clicca per vesair tut", open: "Illuminar {month}", close: "Turnar a tut ils mais", aria: "Saldo da {month}, dals {from} fin ils {to}." },
    en: { title: "{month} is the tightest month: low point {amount} {cur} on {date}", calm: "Every month stays above zero, lowest in {month} ({amount} {cur})", "state.under": "Below zero", "state.tight": "Tight", "state.breathe": "Breathing", until: "to {date}", from: "from {date}", in: "In", out: "Out", low: "Low point · {date}", end: "Month end", lowShort: "low {amount}", more: "Click to see everything", open: "Light up {month}", close: "Back to every month", aria: "{month} balance, from {from} to {to}." },
  },
  select: (s, ctx) => {
    if (s.points.length === 0 || s.events.length === 0) return null;
    const focus = ctx.focus ?? NO_FOCUS;
    const series = Object.keys(focus.moved).length ? replayMoves(s, focus.moved) : baseSeries(s);
    const keys = [...new Set(series.points.map((p) => p.date.slice(0, 7)))];
    let carried = toNumber(s.opening_balance);
    const months: Month[] = keys.map((key) => {
      const pts = series.points.filter((p) => p.date.slice(0, 7) === key);
      const start = carried;
      const closings = pts.map((p) => p.balance);
      const end = closings[closings.length - 1] ?? start;
      carried = end;
      let low = { date: pts[0]!.date, balance: start };
      pts.forEach((p, i) => { if (closings[i]! < low.balance) low = { date: p.date, balance: closings[i]! }; });
      const events = s.events.filter((e) => movedDate(e, focus.moved).slice(0, 7) === key && toNumber(e.amount) > 0);
      const sum = (inflow: boolean) => events.filter((e) => (e.direction === "inflow") === inflow).reduce((acc, e) => acc + toNumber(e.amount), 0);
      const from = pts[0]!.date;
      const to = pts[pts.length - 1]!.date;
      const lastDay = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
      return {
        key, from, to, start, end, low,
        partial: from.slice(8) !== "01" || Number(to.slice(8)) !== lastDay,
        in: sum(true), out: sum(false),
        state: low.balance < 0 ? "under" : end < start ? "tight" : "breathe",
        curve: [start, ...closings],
        movements: events
          .map((e) => ({ date: movedDate(e, focus.moved), label: e.label, amount: toNumber(e.amount), inflow: e.direction === "inflow", category: e.category ?? null }))
          .sort((a, b) => a.date.localeCompare(b.date) || Number(b.inflow) - Number(a.inflow)),
      };
    });
    const hardest = months.reduce((a, b) => (b.low.balance < a.low.balance ? b : a));
    return { months, hardest, selected: focus.month, category: focus.category, currency: s.base_currency };
  },
  View: ({ model, t, fmt, onAction }) => {
    const cur = model.currency;
    const h = model.hardest;
    const title = h.low.balance < 0
      ? t("title", { month: fmt.month(h.from), amount: fmt.num(h.low.balance), cur, date: fmt.shortDate(h.low.date) })
      : t("calm", { month: fmt.month(h.from), amount: fmt.num(h.low.balance), cur });
    const all = model.months.flatMap((m) => m.curve);
    const lo = Math.min(0, ...all);
    const hi = Math.max(0, ...all);
    const pick = (key: string) => onAction({ type: "focus", focus: { month: model.selected === key ? null : key } });
    const onKey = (key: string) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(key); } };
    return (
      <Card question={t("question")} title={title}>
        <div className="bz-night bz-n-acts">
          {model.months.map((m) => {
            const selected = model.selected === m.key;
            const outs = m.movements.filter((e) => !e.inflow && (!model.category || e.category === model.category));
            const list = [...outs].sort((a, b) => b.amount - a.amount).slice(0, selected ? SHOWN_SELECTED : SHOWN).sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div key={m.key} className={`bz-n-act${selected ? " bz-n-sel" : ""}${model.selected && !selected ? " bz-n-off" : ""}`} role="button" tabIndex={0}
                aria-pressed={selected} aria-label={selected ? t("close") : t("open", { month: fmt.month(m.from) })} onClick={() => pick(m.key)} onKeyDown={onKey(m.key)}>
                <div className={`bz-n-orb bz-n-${m.state} bz-n-float`}>
                  <div><strong>{fmt.month(m.from)}</strong><small>{t("lowShort", { amount: fmt.num(m.low.balance) })}</small></div>
                </div>
                <span className={`bz-n-state bz-n-${m.state}`}>
                  {t(`state.${m.state}`)}{m.partial ? ` · ${m.from.slice(8) !== "01" ? t("from", { date: fmt.shortDate(m.from) }) : t("until", { date: fmt.shortDate(m.to) })}` : ""}
                </span>
                <Spark values={m.curve} lo={lo} hi={hi} state={m.state} label={t("aria", { month: fmt.month(m.from), from: fmt.shortDate(m.from), to: fmt.shortDate(m.to) })} />
                <div className="bz-n-figs">
                  <span>{t("in")}</span><b className="bz-n-pos">{m.in > 0 ? `+${fmt.num(m.in)}` : fmt.num(0)}</b>
                  <span>{t("out")}</span><b>{m.out > 0 ? `−${fmt.num(m.out)}` : fmt.num(0)}</b>
                  <span>{t("low", { date: fmt.shortDate(m.low.date) })}</span><b className={m.low.balance < 0 ? "bz-n-neg" : ""}>{fmt.num(m.low.balance)}</b>
                  <span>{t("end")}</span><b>{fmt.num(m.end)}</b>
                </div>
                {list.length > 0 && (
                  <div className="bz-n-list">
                    {list.map((e, i) => <div key={`${e.date}-${i}`}><span>{fmt.shortDate(e.date)} {e.label}</span><b>−{fmt.num(e.amount)}</b></div>)}
                    {!selected && outs.length > SHOWN && <div><span className="bz-n-more">{t("more")}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  },
});

/** A month's balance as a small glowing step line, on the same scale for every month. */
function Spark({ values, lo, hi, state, label }: { values: number[]; lo: number; hi: number; state: State; label: string }) {
  const W = 230;
  const H = 48;
  const y = (v: number) => 4 + ((hi - v) / (hi - lo || 1)) * (H - 8);
  const x = (i: number) => (i / Math.max(values.length - 1, 1)) * W;
  let d = `M0,${y(values[0] ?? 0).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) d += ` H${x(i).toFixed(1)} V${y(values[i]!).toFixed(1)}`;
  return (
    <svg className="bz-n-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="bz-n-zero" vectorEffect="non-scaling-stroke" />
      <path d={d} className={`bz-n-spark-${state}`} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
