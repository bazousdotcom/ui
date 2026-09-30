import { toNumber } from "../../contract/snapshot";
import { niceTicks } from "../../primitives/CashflowChart";
import { Card, Row, clip, useWidth } from "../../primitives";
import type { Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { defineModule } from "../types";

/**
 * The balance as a river that sinks at each bill (community proposal "Cash River", 2026).
 * Every drop is numbered and explained below the drawing: the causes are the engine's own
 * events, ranked by how much of the way down to the low point they account for.
 */
type Point = { date: string; balance: number };
type Cause = { n: number; date: string; label: string; amount: number; share: number; balance: number };
type Income = { date: string; amount: number; balance: number };
type Model = {
  points: Point[];
  causes: Cause[];
  incomes: Income[];
  low: Point;
  outToLow: number;
  share: number;
  descends: boolean;
  currency: string;
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
  reads: ["as_of", "opening_balance", "points", "events", "low_point", "base_currency"],
  messages: {
    fr: { "title.one": "{n} facture fait {share} % des sorties jusqu’au point bas", "title.other": "{n} factures font {share} % des sorties jusqu’au point bas", flat: "Ton solde ne descend pas sous son niveau d’aujourd’hui", meta: "{amount} {cur} sortent d’ici au {date}", start: "Aujourd’hui", low: "Point bas", share: "{p} % des sorties", after: "solde après : {amount}", income: "Revenu", aria: "Solde jour par jour, avec les {n} plus grosses sorties numérotées." },
    de: { "title.one": "{n} Rechnung macht {share} % der Ausgaben bis zum Tiefpunkt aus", "title.other": "{n} Rechnungen machen {share} % der Ausgaben bis zum Tiefpunkt aus", flat: "Dein Saldo sinkt nicht unter den heutigen Stand", meta: "{amount} {cur} fliessen bis {date} ab", start: "Heute", low: "Tiefpunkt", share: "{p} % der Ausgaben", after: "Saldo danach: {amount}", income: "Einkommen", aria: "Saldo Tag für Tag, mit den {n} grössten nummerierten Ausgaben." },
    it: { "title.one": "{n} fattura pesa il {share} % delle uscite fino al minimo", "title.other": "{n} fatture pesano il {share} % delle uscite fino al minimo", flat: "Il tuo saldo non scende sotto il livello di oggi", meta: "{amount} {cur} escono fino al {date}", start: "Oggi", low: "Minimo", share: "{p} % delle uscite", after: "saldo dopo: {amount}", income: "Reddito", aria: "Saldo giorno per giorno, con le {n} uscite più grandi numerate." },
    rm: { "title.one": "{n} quint fa {share} % da las sortidas fin al punct bass", "title.other": "{n} quints fan {share} % da las sortidas fin al punct bass", flat: "Tes saldo na sa sbassa betg sut il nivel dad oz", meta: "{amount} {cur} sortan fin ils {date}", start: "Oz", low: "Punct bass", share: "{p} % da las sortidas", after: "saldo suenter: {amount}", income: "Entrada", aria: "Saldo di per di, cun las {n} pli grondas sortidas numeradas." },
    en: { "title.one": "{n} bill makes {share}% of the outflows down to the low point", "title.other": "{n} bills make {share}% of the outflows down to the low point", flat: "Your balance never goes below today’s level", meta: "{amount} {cur} goes out by {date}", start: "Today", low: "Low point", share: "{p}% of outflows", after: "balance after: {amount}", income: "Income", aria: "Balance day by day, with the {n} largest outflows numbered." },
  },
  select: (s) => {
    if (s.points.length === 0) return null;
    const opening = toNumber(s.opening_balance);
    const points: Point[] = [{ date: s.as_of, balance: opening }, ...s.points.map((p) => ({ date: p.date, balance: toNumber(p.closing_balance) }))];
    const balanceOn = (date: string) => [...points].reverse().find((p) => p.date <= date)?.balance ?? opening;
    const lowDate = s.low_point.date;
    const low = { date: lowDate, balance: toNumber(s.low_point.balance) };
    const descends = low.balance < opening;
    // Down to the low point when the balance sinks; over the whole horizon otherwise.
    const until = descends ? lowDate : points[points.length - 1]!.date;
    const outflows = s.events.filter((e) => e.direction === "outflow" && e.date >= s.as_of && e.date <= until && toNumber(e.amount) > 0);
    if (outflows.length === 0) return null;
    const outToLow = outflows.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const causes = [...outflows]
      .sort((a, b) => toNumber(b.amount) - toNumber(a.amount) || a.date.localeCompare(b.date))
      .slice(0, TOP)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e, i) => ({ n: i + 1, date: e.date, label: e.label, amount: toNumber(e.amount), share: (toNumber(e.amount) / outToLow) * 100, balance: balanceOn(e.date) }));
    // Two salaries on the same day are one line on the drawing.
    const byDay = new Map<string, number>();
    for (const e of s.events) if (e.direction === "inflow" && toNumber(e.amount) > 0) byDay.set(e.date, (byDay.get(e.date) ?? 0) + toNumber(e.amount));
    const incomes = [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount, balance: balanceOn(date) }));
    return {
      points, causes, incomes, low, outToLow, descends,
      share: causes.reduce((sum, c) => sum + c.share, 0),
      currency: s.base_currency,
    };
  },
  View: ({ model, t, fmt }) => {
    const title = model.descends ? t("title", { n: model.causes.length, share: fmt.num(model.share) }) : t("flat");
    return (
      <Card
        question={t("question")}
        title={title}
        meta={t("meta", { amount: fmt.num(model.outToLow), cur: model.currency, date: fmt.shortDate(model.descends ? model.low.date : model.points[model.points.length - 1]!.date) })}
      >
        <River model={model} t={t} fmt={fmt} />
        <div>
          {model.causes.map((c) => (
            <Row
              key={`${c.n}-${c.date}`}
              date={fmt.shortDate(c.date)}
              title={<><span className="bz-river-num" aria-hidden="true">{c.n}</span> {c.label}</>}
              sub={`${t("share", { p: fmt.num(c.share) })} · ${t("after", { amount: fmt.num(c.balance) })}`}
              amount={`−${fmt.num(c.amount)}`}
            />
          ))}
        </div>
      </Card>
    );
  },
});

const PAD = { left: 52, right: 16, top: 34, bottom: 30 };

function River({ model, t, fmt }: { model: Model; t: Translate; fmt: Formatters }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const compact = W < 560;
  const H = compact ? 240 : 300;
  const { points } = model;
  const n = points.length;
  const ticks = niceTicks(Math.min(0, ...points.map((p) => p.balance)), Math.max(0, ...points.map((p) => p.balance)), 4);
  const min = ticks[0] ?? 0;
  const max = ticks[ticks.length - 1] ?? 1;
  const x = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  const at = (date: string) => Math.max(0, points.findIndex((p) => p.date === date));
  const bottom = H - PAD.bottom;
  // A step line: the balance holds all day and moves at the next movement.
  let line = `M${x(0).toFixed(1)},${y(points[0]!.balance).toFixed(1)}`;
  for (let i = 1; i < n; i++) line += ` H${x(i).toFixed(1)} V${y(points[i]!.balance).toFixed(1)}`;
  const area = `${line} V${bottom} H${x(0).toFixed(1)} Z`;
  const lowI = at(model.low.date);
  // Badges on the same day stack; a text label is drawn only where it has room (the list below names them all).
  let lastLabel = -Infinity;
  const badges = model.causes.map((c, k) => {
    const i = at(c.date);
    const cy = y(c.balance);
    const stack = model.causes.slice(0, k).filter((o) => o.date === c.date).length;
    const above = cy > PAD.top + 30 + stack * 22;
    const label = !compact && stack === 0 && x(i) - lastLabel > 190 && x(i) < W - 170;
    if (label) lastLabel = x(i);
    return { c, i, cy, above, stack, label };
  });
  return (
    <div ref={ref} className="bz-chart-box">
      <svg className="bz-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("aria", { n: model.causes.length })}>
        {y(0) < bottom && <rect x={PAD.left} y={y(0)} width={W - PAD.left - PAD.right} height={bottom - y(0)} className="bz-chart-danger" />}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? "bz-chart-zero" : "bz-chart-grid"} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className={v === 0 ? "bz-chart-tick bz-strong" : "bz-chart-tick"}>{fmt.num(v)}</text>
          </g>
        ))}
        <path d={area} className="bz-river-water" />
        <path d={line} className="bz-river-line" />
        {model.incomes.map((inc) => {
          const i = at(inc.date);
          return (
            <g key={`in-${inc.date}`}>
              <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={bottom} className="bz-chart-income" />
              {!compact && <text x={x(i) + 4} y={PAD.top - 12} className="bz-chart-label bz-income">+{fmt.num(inc.amount)}</text>}
            </g>
          );
        })}
        {badges.map(({ c, i, cy, above, stack, label }) => {
          const by = above ? cy - 24 - stack * 22 : cy + 24 + stack * 22;
          return (
            <g key={`c-${c.n}`}>
              <title>{`${fmt.shortDate(c.date)} · ${c.label} · −${fmt.num(c.amount)}`}</title>
              <line x1={x(i)} x2={x(i)} y1={cy} y2={above ? by + 9 : by - 9} className="bz-river-stem" />
              <circle cx={x(i)} cy={by} r={9} className="bz-river-badge" />
              <text x={x(i)} y={by + 4} textAnchor="middle" className="bz-river-badge-text">{c.n}</text>
              {label && <text x={x(i) + 13} y={by + 4} className="bz-chart-label">{clip(c.label, 18)} −{fmt.num(c.amount)}</text>}
            </g>
          );
        })}
        {model.descends && (
          <g>
            <circle cx={x(lowI)} cy={y(model.low.balance)} r={6} className="bz-chart-low" />
            <text x={x(lowI)} y={H - 8} textAnchor={x(lowI) > W - 70 ? "end" : x(lowI) < PAD.left + 70 ? "start" : "middle"} className="bz-chart-label bz-low">
              {t("low")} {fmt.shortDate(model.low.date)} · {fmt.num(model.low.balance)}
            </text>
          </g>
        )}
        {(!model.descends || x(lowI) - x(0) > 140) && <text x={x(0)} y={H - 8} className="bz-chart-tick">{t("start")}</text>}
      </svg>
    </div>
  );
}
