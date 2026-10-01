import { useState, type KeyboardEvent } from "react";

import { toNumber } from "../../contract/snapshot";
import { baseSeries, eventKey, incomeDates, movedDate, replayMoves } from "../../engine/scenario";
import type { Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { Card, NightDefs, Segmented, dayIndex, useNightIds, useWidth } from "../../primitives";
import { NO_FOCUS, defineModule } from "../types";

/**
 * « Nuit » — the balance as a river of light (community proposal "Cash River", 2026). Gold above
 * zero, red below; paydays are beams of green light; the largest outflows down to the low point
 * are numbered beads you can open. A what-if replays the engine's events and keeps the old
 * river as a dotted ghost; a chosen month is lit and the rest dimmed.
 */
type Point = { date: string; balance: number };
type Cause = { n: number; date: string; label: string; amount: number; share: number; balance: number; category: string | null };
type Model = {
  points: Point[]; ghost: Point[] | null; low: Point; baseLow: Point; preLow: number; basePreLow: number;
  causes: Cause[]; outToLow: number; share: number; descends: boolean; narrowed: boolean;
  incomes: { date: string; amount: number }[]; asOf: string; end: string; month: string | null; currency: string;
};

const TOP = 4;

export default defineModule<Model>({
  id: "balance-river",
  size: "full",
  question: {
    fr: "Pourquoi mon solde descend-il ?",
    de: "Warum sinkt mein Saldo?",
    it: "Perché il mio saldo scende?",
    rm: "Pertge sa sbassa mes saldo?",
    en: "Why does my balance go down?",
  },
  reads: ["as_of", "opening_balance", "points", "events", "low_point", "base_currency", "next_income_date", "horizon_end"],
  messages: {
    fr: { "title.one": "{n} facture fait {share} % de la descente jusqu’au point bas", "title.other": "{n} factures font {share} % de la descente jusqu’au point bas", flat: "Ton solde ne descend pas sous son niveau d’aujourd’hui", same: "Ton « et si » relève le creux avant la paie ({before} → {after}), mais le point bas reste {low} {cur} le {date}", moved: "Avec ton « et si », le point bas passe de {before} à {after} {cur}", day: "Jour", week: "Semaine", grain: "Pas de la courbe", zero: "NIVEAU ZÉRO", low: "Point bas {amount} {cur}", on: "le {date}", today: "Aujourd’hui {date}", income: "+{amount} · paie {date}", share: "{p} % de la descente", open: "Voir {label}", aria: "Solde jour par jour du {from} au {to} ; point bas {amount} {cur} le {date}." },
    de: { "title.one": "{n} Rechnung macht {share} % des Rückgangs bis zum Tiefpunkt aus", "title.other": "{n} Rechnungen machen {share} % des Rückgangs bis zum Tiefpunkt aus", flat: "Dein Saldo sinkt nicht unter den heutigen Stand", same: "Dein «Was wäre, wenn» hebt das Tief vor dem Lohn ({before} → {after}), aber der Tiefpunkt bleibt {low} {cur} am {date}", moved: "Mit deinem «Was wäre, wenn» geht der Tiefpunkt von {before} auf {after} {cur}", day: "Tag", week: "Woche", grain: "Schritt der Kurve", zero: "NULLLINIE", low: "Tiefpunkt {amount} {cur}", on: "am {date}", today: "Heute {date}", income: "+{amount} · Lohn {date}", share: "{p} % des Rückgangs", open: "{label} ansehen", aria: "Saldo Tag für Tag vom {from} bis {to}; Tiefpunkt {amount} {cur} am {date}." },
    it: { "title.one": "{n} fattura fa il {share} % della discesa fino al minimo", "title.other": "{n} fatture fanno il {share} % della discesa fino al minimo", flat: "Il tuo saldo non scende sotto il livello di oggi", same: "Il tuo «e se» alza il fondo prima dello stipendio ({before} → {after}), ma il minimo resta {low} {cur} il {date}", moved: "Con il tuo «e se», il minimo passa da {before} a {after} {cur}", day: "Giorno", week: "Settimana", grain: "Passo della curva", zero: "LIVELLO ZERO", low: "Minimo {amount} {cur}", on: "il {date}", today: "Oggi {date}", income: "+{amount} · stipendio {date}", share: "{p} % della discesa", open: "Vedi {label}", aria: "Saldo giorno per giorno dal {from} al {to}; minimo {amount} {cur} il {date}." },
    rm: { "title.one": "{n} quint fa {share} % da la sbassada fin al punct bass", "title.other": "{n} quints fan {share} % da la sbassada fin al punct bass", flat: "Tes saldo na sa sbassa betg sut il nivel dad oz", same: "Tes «e sche» auza il fund avant il salari ({before} → {after}), ma il punct bass resta {low} {cur} ils {date}", moved: "Cun tes «e sche» va il punct bass da {before} a {after} {cur}", day: "Di", week: "Emna", grain: "Pass da la curva", zero: "NIVEL NULLA", low: "Punct bass {amount} {cur}", on: "ils {date}", today: "Oz {date}", income: "+{amount} · salari {date}", share: "{p} % da la sbassada", open: "Mussar {label}", aria: "Saldo di per di dals {from} fin ils {to}; punct bass {amount} {cur} ils {date}." },
    en: { "title.one": "{n} bill makes {share}% of the way down to the low point", "title.other": "{n} bills make {share}% of the way down to the low point", flat: "Your balance never goes below today’s level", same: "Your what-if lifts the dip before payday ({before} → {after}), but the low point stays {low} {cur} on {date}", moved: "With your what-if, the low point goes from {before} to {after} {cur}", day: "Day", week: "Week", grain: "Step of the curve", zero: "ZERO LINE", low: "Low point {amount} {cur}", on: "on {date}", today: "Today {date}", income: "+{amount} · payday {date}", share: "{p}% of the way down", open: "Open {label}", aria: "Balance day by day from {from} to {to}; low point {amount} {cur} on {date}." },
  },
  select: (s, ctx) => {
    if (s.points.length === 0) return null;
    const focus = ctx.focus ?? NO_FOCUS;
    const opening = toNumber(s.opening_balance);
    const whatIf = Object.keys(focus.moved).length > 0;
    const base = baseSeries(s);
    const series = whatIf ? replayMoves(s, focus.moved) : base;
    const line = (pts: { date: string; balance: number }[]): Point[] => [{ date: s.as_of, balance: opening }, ...pts.map((p) => ({ date: p.date, balance: p.balance }))];
    const points = line(series.points);
    const lowOf = (pts: Point[]) => pts.slice(1).reduce((m, p) => (p.balance < m.balance ? p : m), { date: s.as_of, balance: opening });
    const baseLow = { date: s.low_point.date, balance: toNumber(s.low_point.balance) };
    const low = whatIf ? lowOf(points) : baseLow;
    const payday = s.next_income_date ?? s.horizon_end;
    const preLowOf = (pts: Point[]) => Math.min(opening, ...pts.filter((p) => p.date < payday).map((p) => p.balance));
    const descends = low.balance < opening;
    const until = descends ? low.date : s.horizon_end;
    const balanceOn = (date: string) => [...points].reverse().find((p) => p.date <= date)?.balance ?? opening;
    const when = (e: (typeof s.events)[number]) => movedDate(e, focus.moved);
    const out = s.events.filter((e) => e.direction === "outflow" && toNumber(e.amount) > 0 && when(e) >= s.as_of && when(e) <= until);
    if (out.length === 0) return null;
    const outToLow = out.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const narrowed = !!(focus.bill || focus.category || focus.month);
    const pool = narrowed
      ? out.filter((e) => (!focus.bill || e.label === focus.bill) && (!focus.category || e.category === focus.category) && (!focus.month || when(e).startsWith(focus.month)))
      : out;
    const causes = [...pool]
      .sort((a, b) => toNumber(b.amount) - toNumber(a.amount) || when(a).localeCompare(when(b)) || eventKey(a).localeCompare(eventKey(b)))
      .slice(0, TOP)
      .sort((a, b) => when(a).localeCompare(when(b)))
      .map((e, i) => ({ n: i + 1, date: when(e), label: e.label, amount: toNumber(e.amount), share: (toNumber(e.amount) / outToLow) * 100, balance: balanceOn(when(e)), category: e.category ?? null }));
    const byDay = new Map<string, number>();
    for (const e of s.events) if (e.direction === "inflow" && toNumber(e.amount) > 0) byDay.set(e.date, (byDay.get(e.date) ?? 0) + toNumber(e.amount));
    return {
      points, ghost: whatIf ? line(base.points) : null, low, baseLow,
      preLow: preLowOf(points), basePreLow: preLowOf(line(base.points)),
      causes, outToLow, share: causes.reduce((sum, c) => sum + c.share, 0), descends, narrowed,
      incomes: incomeDates(s).map((date) => ({ date, amount: byDay.get(date) ?? 0 })),
      asOf: s.as_of, end: s.horizon_end, month: focus.month, currency: s.base_currency,
    };
  },
  View: ({ model, t, fmt, onAction }) => {
    const [grain, setGrain] = useState<"day" | "week">("day");
    const cur = model.currency;
    const title = model.ghost
      ? model.low.balance === model.baseLow.balance
        ? t("same", { before: fmt.num(model.basePreLow), after: fmt.num(model.preLow), low: fmt.num(model.low.balance), cur, date: fmt.shortDate(model.low.date) })
        : t("moved", { before: fmt.num(model.baseLow.balance), after: fmt.num(model.low.balance), cur })
      : model.descends ? t("title", { n: model.causes.length, share: fmt.num(model.share) }) : t("flat");
    const open = (label: string) => onAction({ type: "focus", focus: { bill: label } });
    return (
      <Card question={t("question")} title={title}>
        <div className="bz-night">
          <div className="bz-n-bar">
            <span />
            <Segmented label={t("grain")} value={grain} onChange={setGrain} options={[{ key: "day", label: t("day") }, { key: "week", label: t("week") }]} />
          </div>
          <River model={model} grain={grain} t={t} fmt={fmt} open={open} />
          <div className="bz-n-causes">
            {model.causes.map((c) => (
              <button type="button" key={`${c.n}-${c.date}`} className="bz-n-cause" onClick={() => open(c.label)} aria-label={t("open", { label: c.label })}>
                <span><b>{c.n}</b>{c.label}</span>
                <strong>−{fmt.num(c.amount)} {cur}</strong>
                <small>{fmt.shortDate(c.date)} · {t("share", { p: fmt.num(c.share) })}{c.category ? ` · ${c.category}` : ""}</small>
              </button>
            ))}
          </div>
        </div>
      </Card>
    );
  },
});

const PAD = { left: 16, right: 16, top: 56, bottom: 34 };

function River({ model, grain, t, fmt, open }: { model: Model; grain: "day" | "week"; t: Translate; fmt: Formatters; open: (label: string) => void }) {
  const ids = useNightIds();
  const [ref, W] = useWidth<HTMLDivElement>();
  const compact = W < 600;
  const H = compact ? 290 : 370;
  const span = dayIndex(model.asOf, model.end) + 1;
  // Roll-up: a week keeps the balance of its last day.
  const roll = (pts: Point[]) => (grain === "day" ? pts : pts.filter((p, i) => i === 0 || i === pts.length - 1 || dayIndex(model.asOf, p.date) % 7 === 6));
  const pts = roll(model.points);
  const ghost = model.ghost ? roll(model.ghost) : null;
  const all = [...pts, ...(ghost ?? [])].map((p) => p.balance);
  const max = Math.max(0, ...all) * 1.15 + 200;
  const min = Math.min(0, ...all) * 1.12 - 1;
  const X = (i: number, date: string) => PAD.left + ((i === 0 ? 0 : dayIndex(model.asOf, date) + 1) / span) * (W - PAD.left - PAD.right);
  const Xd = (date: string) => X(1, date);
  const Y = (v: number) => PAD.top + ((max - v) / (max - min)) * (H - PAD.top - PAD.bottom);
  const path = (list: Point[]) => {
    let d = `M${X(0, list[0]!.date).toFixed(1)},${Y(list[0]!.balance).toFixed(1)}`;
    for (let i = 1; i < list.length; i++) {
      const x = X(i, list[i]!.date);
      const y0 = Y(list[i - 1]!.balance);
      const y1 = Y(list[i]!.balance);
      if (grain === "week" || y0 === y1) { d += ` L${x.toFixed(1)},${y1.toFixed(1)}`; continue; }
      const k = Math.min(6, (W - PAD.left - PAD.right) / span / 2);
      d += ` L${(x - k).toFixed(1)},${y0.toFixed(1)} Q${x.toFixed(1)},${y0.toFixed(1)} ${x.toFixed(1)},${((y0 + y1) / 2).toFixed(1)} Q${x.toFixed(1)},${y1.toFixed(1)} ${(x + Math.min(k, 2)).toFixed(1)},${y1.toFixed(1)}`;
    }
    return d;
  };
  const d = path(pts);
  const zero = Math.min(1, Math.max(0, (Y(0) - PAD.top) / (H - PAD.top - PAD.bottom)));
  const bottom = H - PAD.bottom;
  const lowX = Xd(model.low.date);
  const right = lowX > W * 0.55;
  const monthDays = model.month ? model.points.slice(1).filter((p) => p.date.startsWith(model.month!)) : [];
  const key = (label: string) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(label); } };
  return (
    <div ref={ref} className="bz-chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img"
        aria-label={t("aria", { from: fmt.shortDate(model.asOf), to: fmt.shortDate(model.end), amount: fmt.num(model.low.balance), cur: model.currency, date: fmt.shortDate(model.low.date) })}>
        <NightDefs ids={ids} glow={5} />
        <defs>
          <linearGradient id={`${ids.glow}-water`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD.top} x2="0" y2={bottom}>
            <stop offset="0" className="bz-n-water-gold-0" /><stop offset={zero} className="bz-n-water-gold-1" />
            <stop offset={zero} className="bz-n-water-risk-0" /><stop offset="1" className="bz-n-water-risk-1" />
          </linearGradient>
          <linearGradient id={`${ids.glow}-line`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD.top} x2="0" y2={bottom}>
            <stop offset="0" className="bz-n-line-gold-0" /><stop offset={zero} className="bz-n-line-gold-1" />
            <stop offset={zero} className="bz-n-line-risk-0" /><stop offset="1" className="bz-n-line-risk-1" />
          </linearGradient>
        </defs>
        {monthDays.length > 0 && (
          <g>
            <rect x={PAD.left} y={PAD.top - 10} width={Math.max(0, Xd(monthDays[0]!.date) - 8 - PAD.left)} height={bottom - PAD.top + 10} className="bz-n-dim" />
            <rect x={Xd(monthDays[monthDays.length - 1]!.date) + 2} y={PAD.top - 10} width={Math.max(0, W - PAD.right - Xd(monthDays[monthDays.length - 1]!.date) - 2)} height={bottom - PAD.top + 10} className="bz-n-dim" />
          </g>
        )}
        {model.incomes.map((inc) => {
          const x = Xd(inc.date);
          return (
            <g key={inc.date}>
              <rect x={x - 14} y={PAD.top - 28} width={28} height={bottom - PAD.top + 28} className="bz-n-beam" filter={`url(#${ids.haze})`} />
              <line x1={x} x2={x} y1={PAD.top - 24} y2={bottom} className="bz-n-beam-line" />
              <text x={x} y={PAD.top - 32} textAnchor={x > W - 90 ? "end" : x < 90 ? "start" : "middle"} fontSize={12} fontWeight={700} className="bz-n-ok">
                {compact ? fmt.shortDate(inc.date) : t("income", { amount: fmt.num(inc.amount), date: fmt.shortDate(inc.date) })}
              </text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={Y(0)} y2={Y(0)} className="bz-n-zero" />
        <text x={PAD.left + 4} y={Y(0) - 8} fontSize={11} letterSpacing={2} className="bz-n-mut">{t("zero")}</text>
        <path d={`${d} L${X(pts.length - 1, pts[pts.length - 1]!.date).toFixed(1)},${bottom} L${X(0, pts[0]!.date).toFixed(1)},${bottom} Z`} fill={`url(#${ids.glow}-water)`} />
        {ghost && <path d={path(ghost)} className="bz-n-ghost" />}
        <path d={d} fill="none" stroke={`url(#${ids.glow}-line)`} strokeWidth={3} strokeLinejoin="round" filter={`url(#${ids.glow})`} className="bz-n-river" />
        {model.causes.map((c) => {
          const x = Xd(c.date);
          const y = Y(c.balance);
          return (
            <g key={`${c.n}-${c.date}`} className="bz-n-hit bz-n-rise" role="button" tabIndex={0} aria-label={t("open", { label: c.label })} onClick={() => open(c.label)} onKeyDown={key(c.label)}>
              <circle cx={x} cy={y} r={10} fill={`url(#${ids.risk})`} filter={`url(#${ids.glow})`} />
              <circle cx={x} cy={y} r={14} className="bz-n-halo-risk" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} className="bz-n-dark">{c.n}</text>
            </g>
          );
        })}
        {model.descends && (
          <g>
            <circle cx={lowX} cy={Y(model.low.balance)} r={9} className="bz-n-low-ring bz-n-throb" />
            <circle cx={lowX} cy={Y(model.low.balance)} r={7} className="bz-n-ink" filter={`url(#${ids.glow})`} />
            <text x={lowX + (right ? -12 : 12)} y={Y(model.low.balance) + 30} textAnchor={right ? "end" : "start"} fontSize={13} fontWeight={700} className="bz-n-ink">{t("low", { amount: fmt.num(model.low.balance), cur: model.currency })}</text>
            <text x={lowX + (right ? -12 : 12)} y={Y(model.low.balance) + 46} textAnchor={right ? "end" : "start"} fontSize={11} className="bz-n-mut">{t("on", { date: fmt.shortDate(model.low.date) })}</text>
          </g>
        )}
        <text x={PAD.left} y={H - 8} fontSize={11} className="bz-n-mut">{t("today", { date: fmt.shortDate(model.asOf) })}</text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={11} className="bz-n-mut">{fmt.shortDate(model.end)}</text>
      </svg>
    </div>
  );
}
