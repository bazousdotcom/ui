import type { KeyboardEvent } from "react";

import { toNumber } from "../../contract/snapshot";
import { Card, clip, useWidth } from "../../primitives";
import { NO_FOCUS, defineModule } from "../types";

/**
 * A month of income as a river that splits: the monthly income on the left, each category of fixed
 * costs on the right, and what is left over, every ribbon as thick as its amount (community proposal
 * "income flow", November 2026). When the fixed costs exceed the income, the missing part enters on
 * the left in red. The drawing only reshapes `structure`: the engine computed every figure.
 */
type Target = { key: string; category: string; amount: number; share: number; kind: "category" | "other" | "left" };
type Model = {
  income: number;
  fixed: number;
  /** What the month leaves once the fixed costs are paid; 0 when they exceed the income. */
  left: number;
  /** What the income does not cover; 0 when it covers the fixed costs. */
  short: number;
  targets: Target[];
  currency: string;
  selected: string | null;
};

const MAX_CATEGORIES = 7;
/** Height of the drawing given to the amounts, in px, before the room each label needs. */
const AMOUNTS = 260;
/** A target never gets less than the two lines of its label. */
const SLOT = 30;
const GAP = 6;
const BAR = 12;
const PAD = 14;
/** Room under the source for « Short » and its amount. */
const SHORT_LABEL = 34;

/** Where every node and ribbon goes; shared by the view and the tests, so what is tested is what is drawn. */
export function layout(model: Model, width: number) {
  const total = model.income + model.short;
  const scale = AMOUNTS / total;
  const leftLabels = Math.round(Math.min(150, width * 0.27));
  const rightLabels = Math.round(Math.min(230, width * 0.44));
  const x0 = leftLabels;
  const x1 = width - rightLabels - BAR;
  let slotY = PAD;
  let sourceY = 0;
  const targets = model.targets.map((target) => {
    const h = Math.max(2, target.amount * scale);
    const slot = Math.max(h, SLOT);
    const y = slotY + (slot - h) / 2;
    const from = sourceY;
    slotY += slot + GAP;
    sourceY += target.amount * scale;
    return { target, y, h, from };
  });
  // A month that is short names what is missing under its source: the drawing keeps room for those two lines.
  const natural = slotY - GAP + PAD;
  const height = Math.max(natural, model.short > 0 ? AMOUNTS + 2 * SHORT_LABEL : 0);
  const shift = (height - natural) / 2;
  const sourceTop = (height - AMOUNTS) / 2;
  const incomeH = model.income * scale;
  return {
    width, height, x0, x1, leftLabels, rightLabels,
    income: { y: sourceTop, h: incomeH },
    short: { y: sourceTop + incomeH, h: model.short * scale },
    targets: targets.map((t) => ({ ...t, y: t.y + shift, from: sourceTop + t.from, thickness: t.target.amount * scale })),
  };
}

/** A ribbon between two vertical spans, as wide at each end as the amount it carries. */
function ribbon(xa: number, ya: number, xb: number, yb: number, ha: number, hb: number): string {
  const mid = (xa + xb) / 2;
  const r = (n: number) => n.toFixed(1);
  return `M${r(xa)},${r(ya)} C${r(mid)},${r(ya)} ${r(mid)},${r(yb)} ${r(xb)},${r(yb)} L${r(xb)},${r(yb + hb)} C${r(mid)},${r(yb + hb)} ${r(mid)},${r(ya + ha)} ${r(xa)},${r(ya + ha)} Z`;
}

export default defineModule<Model>({
  id: "money-flow",
  size: "full",
  question: {
    fr: "Où va mon revenu chaque mois ?",
    de: "Wohin fliesst mein Einkommen jeden Monat?",
    it: "Dove va il mio reddito ogni mese?",
    rm: "Nua van mias entradas mintga mais?",
    en: "Where does my income go each month?",
  },
  reads: ["structure", "base_currency"],
  messages: {
    fr: { left: "Sur {income} {cur} de revenus, {share} % partent en charges fixes : il reste {amount} {cur}", short: "Tes charges fixes dépassent tes revenus de {amount} {cur} par mois", even: "Tes charges fixes prennent tout ton revenu : {income} {cur} par mois", meta: "Premier poste : {category}, {amount} {cur} par mois", income: "Revenus", missing: "Manque", remaining: "Reste", other: "Autres", line: "{amount} {cur} · {share} %", pick: "Filtrer sur {category}", aria: "Revenus de {income} {cur} par mois, répartis en : {list}" },
    de: { left: "Von {income} {cur} Einkommen gehen {share} % in Fixkosten: Es bleiben {amount} {cur}", short: "Deine Fixkosten übersteigen dein Einkommen um {amount} {cur} pro Monat", even: "Deine Fixkosten brauchen dein ganzes Einkommen: {income} {cur} pro Monat", meta: "Grösster Posten: {category}, {amount} {cur} pro Monat", income: "Einkommen", missing: "Fehlt", remaining: "Bleibt", other: "Übrige", line: "{amount} {cur} · {share} %", pick: "Nach {category} filtern", aria: "Einkommen von {income} {cur} pro Monat, aufgeteilt in: {list}" },
    it: { left: "Su {income} {cur} di reddito, il {share} % va in costi fissi: restano {amount} {cur}", short: "I tuoi costi fissi superano il tuo reddito di {amount} {cur} al mese", even: "I tuoi costi fissi prendono tutto il tuo reddito: {income} {cur} al mese", meta: "Prima voce: {category}, {amount} {cur} al mese", income: "Reddito", missing: "Manca", remaining: "Resta", other: "Altro", line: "{amount} {cur} · {share} %", pick: "Filtra su {category}", aria: "Reddito di {income} {cur} al mese, ripartito in: {list}" },
    rm: { left: "Da {income} {cur} entradas van {share} % en custs fixs: i restan {amount} {cur}", short: "Tes custs fixs surpassan tias entradas per {amount} {cur} per mais", even: "Tes custs fixs prendan tut tias entradas: {income} {cur} per mais", meta: "Emprima posiziun: {category}, {amount} {cur} per mais", income: "Entradas", missing: "Manca", remaining: "Resta", other: "Auters", line: "{amount} {cur} · {share} %", pick: "Filtrar tenor {category}", aria: "Entradas da {income} {cur} per mais, repartidas en: {list}" },
    en: { left: "Of {income} {cur} of income, {share}% goes to fixed costs: {amount} {cur} is left", short: "Your fixed costs exceed your income by {amount} {cur} a month", even: "Your fixed costs take all your income: {income} {cur} a month", meta: "Largest item: {category}, {amount} {cur} a month", income: "Income", missing: "Short", remaining: "Left", other: "Other", line: "{amount} {cur} · {share}%", pick: "Filter on {category}", aria: "Income of {income} {cur} a month, split into: {list}" },
  },
  select: (s, ctx) => {
    const cats = s.structure.by_category
      .map((c) => ({ category: c.category, amount: toNumber(c.amount) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
    if (cats.length === 0) return null;
    const income = Math.max(0, toNumber(s.structure.income_monthly));
    const fixed = cats.reduce((sum, c) => sum + c.amount, 0);
    const left = Math.max(0, income - fixed);
    const short = Math.max(0, fixed - income);
    const whole = income + short;
    const head = cats.length <= MAX_CATEGORIES ? cats : cats.slice(0, MAX_CATEGORIES - 1);
    const rest = cats.slice(head.length).reduce((sum, c) => sum + c.amount, 0);
    const share = (amount: number) => (amount / whole) * 100;
    const targets: Target[] = head.map((c) => ({ key: c.category, category: c.category, amount: c.amount, share: share(c.amount), kind: "category" }));
    if (rest > 0) targets.push({ key: "·other", category: "", amount: rest, share: share(rest), kind: "other" });
    if (left > 0) targets.push({ key: "·left", category: "", amount: left, share: share(left), kind: "left" });
    return { income, fixed, left, short, targets, currency: s.base_currency, selected: (ctx.focus ?? NO_FOCUS).category };
  },
  View: ({ model, t, fmt, onAction }) => {
    const [ref, width] = useWidth<HTMLDivElement>(880, 300);
    const g = layout(model, width);
    const cur = model.currency;
    const name = (target: Target) => (target.kind === "left" ? t("remaining") : target.kind === "other" ? t("other") : target.category);
    const pct = (share: number) => (share < 1 ? "<1" : fmt.num(share));
    const pick = (target: Target) => { if (target.kind === "category") onAction({ type: "focus", focus: { category: model.selected === target.category ? null : target.category } }); };
    const onKey = (target: Target) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(target); } };
    const first = model.targets[0]!;
    const title = model.short > 0
      ? t("short", { amount: fmt.num(model.short), cur })
      : model.left > 0
        ? t("left", { income: fmt.num(model.income), share: pct((model.fixed / model.income) * 100), amount: fmt.num(model.left), cur })
        : t("even", { income: fmt.num(model.income), cur });
    const chars = Math.max(8, Math.floor((g.rightLabels - 14) / 6.4));
    const labelX = g.x1 + BAR + 10;
    return (
      <Card question={t("question")} title={title} meta={t("meta", { category: name(first), amount: fmt.num(first.amount), cur })}>
        <div className="bz-night" ref={ref}>
          <svg className="bz-flow" viewBox={`0 0 ${g.width} ${g.height.toFixed(1)}`} role="img"
            aria-label={t("aria", { income: fmt.num(model.income), cur, list: model.targets.map((x) => `${name(x)} ${fmt.num(x.amount)} ${cur}`).join(", ") })}>
            {g.targets.map(({ target, y, h, from, thickness }, i) => {
              const tone = target.kind === "left" ? "bz-n-gold" : `bz-n-f${i % 8}`;
              const faded = model.selected !== null && model.selected !== target.category;
              const hit = target.kind === "category";
              return (
                <g key={target.key} className={`bz-flow-target ${hit ? "bz-n-hit " : ""}${faded ? "bz-n-faded" : ""}`}
                  role={hit ? "button" : undefined} tabIndex={hit ? 0 : undefined} aria-pressed={hit ? model.selected === target.category : undefined}
                  aria-label={hit ? t("pick", { category: target.category }) : undefined} onClick={() => pick(target)} onKeyDown={onKey(target)}>
                  <rect x={g.x1} y={y} width={BAR} height={h} rx={2} className={`bz-flow-node ${tone}`} />
                  <path d={ribbon(g.x0 + BAR, from, g.x1, y, thickness, h)} className={`bz-flow-band ${tone}`} />
                  <text x={labelX} y={y + h / 2 - 2} className="bz-n-ink" fontSize={12}>{clip(name(target), chars)}</text>
                  <text x={labelX} y={y + h / 2 + 12} className="bz-n-mut" fontSize={11}>{t("line", { amount: fmt.num(target.amount), cur, share: pct(target.share) })}</text>
                </g>
              );
            })}
            {g.income.h > 0 && <rect x={g.x0} y={g.income.y} width={BAR} height={g.income.h} rx={2} className="bz-flow-node bz-n-ok" />}
            {g.short.h > 0 && <rect x={g.x0} y={g.short.y} width={BAR} height={g.short.h} rx={2} className="bz-flow-node bz-n-risk" />}
            {g.income.h > 0 && (
              <>
                <text x={g.x0 - 10} y={g.income.y + g.income.h / 2 - 2} textAnchor="end" className="bz-n-ink" fontSize={12}>{t("income")}</text>
                <text x={g.x0 - 10} y={g.income.y + g.income.h / 2 + 12} textAnchor="end" className="bz-n-mut" fontSize={11}>{fmt.num(model.income)} {cur}</text>
              </>
            )}
            {g.short.h > 0 && (
              <>
                <text x={g.x0 - 10} y={g.short.y + g.short.h + 14} textAnchor="end" className="bz-n-risk" fontSize={12}>{t("missing")}</text>
                <text x={g.x0 - 10} y={g.short.y + g.short.h + 28} textAnchor="end" className="bz-n-risk" fontSize={11}>{fmt.num(model.short)} {cur}</text>
              </>
            )}
          </svg>
        </div>
      </Card>
    );
  },
});
