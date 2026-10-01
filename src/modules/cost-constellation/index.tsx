import { toNumber } from "../../contract/snapshot";
import type { KeyboardEvent } from "react";

import { Card, NightDefs, clip, useNightIds } from "../../primitives";
import { NO_FOCUS, defineModule } from "../types";

/**
 * The fixed monthly costs as a constellation: one star per category around the monthly total,
 * its area proportional to its share (community proposal "Category Constellation", 2026).
 */
type Star = { category: string; amount: number; share: number; other: boolean };
type Model = { stars: Star[]; total: number; currency: string; selected: string | null };

const MAX_STARS = 6;

export default defineModule<Model>({
  id: "cost-constellation",
  size: "narrow",
  question: {
    fr: "Où part mon argent chaque mois ?",
    de: "Wohin geht mein Geld jeden Monat?",
    it: "Dove vanno i miei soldi ogni mese?",
    rm: "Nua van mes daners mintga mais?",
    en: "Where does my money go each month?",
  },
  reads: ["structure", "base_currency"],
  messages: {
    fr: { pick: "Filtrer sur {category}", title: "{category} prend {share} % de tes charges fixes", meta: "{amount} {cur} par mois", other: "Autres", center: "par mois", aria: "Charges fixes par catégorie : {list}." },
    de: { pick: "Nach {category} filtern", title: "{category} nimmt {share} % deiner Fixkosten ein", meta: "{amount} {cur} pro Monat", other: "Übrige", center: "pro Monat", aria: "Fixkosten nach Kategorie: {list}." },
    it: { pick: "Filtra su {category}", title: "{category} prende il {share} % dei tuoi costi fissi", meta: "{amount} {cur} al mese", other: "Altro", center: "al mese", aria: "Costi fissi per categoria: {list}." },
    rm: { pick: "Filtrar tenor {category}", title: "{category} prenda {share} % da tes custs fixs", meta: "{amount} {cur} per mais", other: "Auters", center: "per mais", aria: "Custs fixs per categoria: {list}." },
    en: { pick: "Filter on {category}", title: "{category} takes {share}% of your fixed costs", meta: "{amount} {cur} a month", other: "Other", center: "a month", aria: "Fixed costs by category: {list}." },
  },
  select: (s, ctx) => {
    const cats = s.structure.by_category
      .map((c) => ({ category: c.category, amount: toNumber(c.amount) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
    if (cats.length === 0) return null;
    const total = cats.reduce((sum, c) => sum + c.amount, 0);
    const head = cats.length <= MAX_STARS ? cats : cats.slice(0, MAX_STARS - 1);
    const rest = cats.slice(head.length).reduce((sum, c) => sum + c.amount, 0);
    const stars: Star[] = head.map((c) => ({ ...c, share: (c.amount / total) * 100, other: false }));
    if (rest > 0) stars.push({ category: "", amount: rest, share: (rest / total) * 100, other: true });
    return { stars, total, currency: s.base_currency, selected: (ctx.focus ?? NO_FOCUS).category };
  },
  View: ({ model, t, fmt, onAction }) => {
    const ids = useNightIds();
    const pick = (st: Star) => { if (!st.other) onAction({ type: "focus", focus: { category: model.selected === st.category ? null : st.category } }); };
    const onKey = (st: Star) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(st); } };
    const name = (s: Star) => (s.other ? t("other") : s.category);
    const first = model.stars[0]!;
    const cx = 170;
    const cy = 150;
    const orbit = 104;
    const n = model.stars.length;
    const room = n > 1 ? orbit * Math.sin(Math.PI / n) - 8 : 44;
    const biggest = Math.max(...model.stars.map((s) => s.share));
    return (
      <Card question={t("question")} title={t("title", { category: name(first), share: fmt.num(first.share) })} meta={t("meta", { amount: fmt.num(model.total), cur: model.currency })}>
        <div className="bz-night">
        <svg className="bz-constellation" viewBox="0 0 340 300" role="img" aria-label={t("aria", { list: model.stars.map((s) => `${name(s)} ${fmt.num(s.share)} %`).join(", ") })}>
          <NightDefs ids={ids} glow={6} />
          {model.stars.map((s, i) => {
            const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
            const x = cx + Math.cos(angle) * orbit;
            const y = cy + Math.sin(angle) * orbit;
            const r = Math.max(12, Math.min(room, 44) * Math.sqrt(s.share / biggest));
            const below = y + r + 14 <= 296;
            return (
              <g key={s.other ? "other" : s.category} className={`${s.other ? "" : "bz-n-hit "}${model.selected && model.selected !== s.category ? "bz-n-faded" : ""}`}
                role={s.other ? undefined : "button"} tabIndex={s.other ? undefined : 0} aria-pressed={s.other ? undefined : model.selected === s.category}
                aria-label={s.other ? undefined : t("pick", { category: s.category })} onClick={() => pick(s)} onKeyDown={onKey(s)}>
                <line x1={cx} y1={cy} x2={x} y2={y} className="bz-constellation-link" />
                <circle cx={x} cy={y} r={r} className={`bz-constellation-star bz-n-f${i % 8}`} filter={`url(#${ids.glow})`} />
                <text x={x} y={y + 4} textAnchor="middle" className="bz-constellation-share">{s.share < 1 ? "<1" : fmt.num(s.share)}%</text>
                <text x={x} y={below ? y + r + 13 : y - r - 6} textAnchor="middle" className="bz-n-mut" fontSize={11}>{clip(name(s), 16)}</text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={44} className="bz-constellation-core" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="bz-constellation-total">{fmt.num(model.total)}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" className="bz-constellation-caption">{model.currency}</text>
          <text x={cx} y={cy + 25} textAnchor="middle" className="bz-constellation-caption">{t("center")}</text>
        </svg>
        </div>
        <div className="bz-cats">
          {model.stars.map((s, i) => (
            <div key={s.other ? "other" : s.category}><i className={`bz-n-c${i % 8}`} /><span>{name(s)}</span><strong>{fmt.num(s.amount)}</strong></div>
          ))}
        </div>
      </Card>
    );
  },
});
