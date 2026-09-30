import { toNumber } from "../../contract/snapshot";
import { addDays, daysBetween, type Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { Card, clip, useWidth } from "../../primitives";
import { defineModule } from "../types";

/**
 * Every bill as a bubble on the calendar: position = due date, area = weight in the base
 * currency, colour = the bill's own currency (community proposal "Deadline Galaxy", 2026).
 * The heaviest seven days are shaded, and the answer names them.
 */
type Bubble = { date: string; label: string; amount: number; original: number; currency: string; foreign: boolean };
type Week = { from: string; to: string; amount: number; count: number; share: number };
type Model = {
  bubbles: Bubble[];
  start: string;
  end: string;
  incomes: string[];
  total: number;
  week: Week;
  currency: string;
  foreign: string[];
};

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
    fr: { title: "Du {from} au {to}, {amount} {cur} sortent : {share} % de la période", meta: "{n} sorties · {amount} {cur} au total", base: "En {cur}", other: "En {list}, converti", heaviest: "Les 7 jours les plus lourds", aria: "Carte des échéances : chaque bulle est une facture, sa taille suit son montant." },
    de: { title: "Vom {from} bis {to} gehen {amount} {cur} weg: {share} % des Zeitraums", meta: "{n} Ausgaben · {amount} {cur} insgesamt", base: "In {cur}", other: "In {list}, umgerechnet", heaviest: "Die 7 schwersten Tage", aria: "Karte der Fälligkeiten: jede Blase ist eine Rechnung, ihre Grösse folgt dem Betrag." },
    it: { title: "Dal {from} al {to} escono {amount} {cur}: il {share} % del periodo", meta: "{n} uscite · {amount} {cur} in totale", base: "In {cur}", other: "In {list}, convertito", heaviest: "I 7 giorni più pesanti", aria: "Mappa delle scadenze: ogni bolla è una fattura, la sua dimensione segue l’importo." },
    rm: { title: "Dals {from} fin ils {to} sortan {amount} {cur}: {share} % da la perioda", meta: "{n} sortidas · {amount} {cur} en total", base: "En {cur}", other: "En {list}, convertì", heaviest: "Ils 7 dis ils pli grevs", aria: "Charta dals termins: mintga bulla è in quint, sia grondezza suonda la summa." },
    en: { title: "From {from} to {to}, {amount} {cur} goes out: {share}% of the period", meta: "{n} outflows · {amount} {cur} in total", base: "In {cur}", other: "In {list}, converted", heaviest: "The 7 heaviest days", aria: "Bill map: each bubble is a bill, its size follows the amount." },
  },
  select: (s) => {
    const bubbles = s.events
      .filter((e) => e.direction === "outflow" && e.date >= s.as_of && e.date <= s.horizon_end && toNumber(e.amount) > 0)
      .map((e) => ({ date: e.date, label: e.label, amount: toNumber(e.amount), original: toNumber(e.original_amount), currency: e.currency, foreign: e.currency !== s.base_currency }))
      .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
    if (bubbles.length === 0) return null;
    const total = bubbles.reduce((sum, b) => sum + b.amount, 0);
    // The seven-day window, starting on a due date, that carries the most.
    let week: Week = { from: bubbles[0]!.date, to: bubbles[0]!.date, amount: 0, count: 0, share: 0 };
    for (const first of bubbles) {
      const to = addDays(first.date, 6);
      const inside = bubbles.filter((b) => b.date >= first.date && b.date <= to);
      const amount = inside.reduce((sum, b) => sum + b.amount, 0);
      if (amount > week.amount) week = { from: first.date, to: inside[inside.length - 1]!.date, amount, count: inside.length, share: (amount / total) * 100 };
    }
    return {
      bubbles, total, week,
      start: s.as_of,
      end: s.horizon_end,
      incomes: [s.next_income_date, s.second_income_date].filter((d): d is string => !!d && d >= s.as_of && d <= s.horizon_end),
      currency: s.base_currency,
      foreign: [...new Set(bubbles.filter((b) => b.foreign).map((b) => b.currency))].sort(),
    };
  },
  View: ({ model, t, fmt }) => (
    <Card
      question={t("question")}
      title={t("title", { from: fmt.shortDate(model.week.from), to: fmt.shortDate(model.week.to), amount: fmt.num(model.week.amount), cur: model.currency, share: fmt.num(model.week.share) })}
      meta={t("meta", { n: model.bubbles.length, amount: fmt.num(model.total), cur: model.currency })}
    >
      <Map model={model} t={t} fmt={fmt} />
      <div className="bz-legend">
        <span><i className="bz-sw bz-sw-bubble" />{t("base", { cur: model.currency })}</span>
        {model.foreign.length > 0 && <span><i className="bz-sw bz-sw-bubble-foreign" />{t("other", { list: model.foreign.join(", ") })}</span>}
        <span><i className="bz-sw bz-sw-week" />{t("heaviest")}</span>
      </div>
    </Card>
  ),
});

const PAD = { top: 26, bottom: 28 };

type Placed = { b: Bubble; cx: number; cy: number; r: number };

/**
 * Biggest bubble first, each at its own date and on the free spot nearest the axis. When a
 * crowded week leaves no room, every bubble shrinks a little and the packing starts again,
 * so nothing is ever drawn outside the frame or on top of another bill.
 */
function pack(bubbles: Bubble[], x: (date: string) => number, top: number, bottom: number, maxR: number): Placed[] {
  const mid = (top + bottom) / 2;
  const biggest = Math.max(...bubbles.map((b) => b.amount));
  for (let scale = 1; ; scale *= 0.85) {
    const placed: Placed[] = [];
    let fits = true;
    for (const b of [...bubbles].sort((p, q) => q.amount - p.amount)) {
      const r = (5 + Math.sqrt(b.amount / biggest) * (maxR - 5)) * scale;
      const cx = x(b.date);
      const room = (cy: number) => cy - r >= top && cy + r <= bottom && placed.every((p) => Math.hypot(p.cx - cx, p.cy - cy) >= p.r + r + 2);
      let cy = mid;
      for (let k = 1; !room(cy) && k < 80; k++) cy = mid + Math.ceil(k / 2) * 4 * (k % 2 ? -1 : 1);
      if (!room(cy)) fits = false;
      placed.push({ b, cx, cy, r });
    }
    if (fits || scale < 0.2) return placed;
  }
}

function Map({ model, t, fmt }: { model: Model; t: Translate; fmt: Formatters }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const compact = W < 560;
  const H = compact ? 230 : 280;
  const maxR = compact ? 26 : 40;
  const side = maxR + 4;
  const span = Math.max(daysBetween(model.start, model.end), 1);
  const x = (date: string) => side + (daysBetween(model.start, date) / span) * (W - 2 * side);
  const mid = PAD.top + (H - PAD.top - PAD.bottom) / 2;
  const placed = pack(model.bubbles, x, PAD.top, H - PAD.bottom, maxR);
  const months = monthStarts(model.start, model.end);
  return (
    <div ref={ref} className="bz-chart-box">
      <svg className="bz-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("aria")}>
        <rect x={x(model.week.from) - 6} y={PAD.top - 6} width={Math.max(x(model.week.to) - x(model.week.from) + 12, 12)} height={H - PAD.top - PAD.bottom + 12} rx={10} className="bz-map-week" />
        <line x1={side} x2={W - side} y1={mid} y2={mid} className="bz-chart-grid" />
        {months.map((m, i) => {
          // A month name needs ~80 px: next to the previous one it is left out, its line stays.
          const roomy = i === 0 || x(m) - x(months[i - 1]!) >= 80;
          const flip = x(m) > W - 80;
          return (
            <g key={m}>
              <line x1={x(m)} x2={x(m)} y1={PAD.top} y2={H - PAD.bottom} className="bz-chart-grid" />
              {roomy && <text x={x(m) + (flip ? -4 : 4)} y={H - 8} textAnchor={flip ? "end" : "start"} className="bz-chart-tick">{fmt.month(m)}</text>}
            </g>
          );
        })}
        {model.incomes.map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={PAD.top} y2={H - PAD.bottom} className="bz-chart-income" />
            {/* On a phone the dashed green line already says "payday": the date is enough. */}
            <text x={x(d) + (x(d) > W - 90 ? -4 : 4)} y={PAD.top - 10} textAnchor={x(d) > W - 90 ? "end" : "start"} className="bz-chart-label bz-income">{compact ? fmt.shortDate(d) : t("payday", { date: fmt.shortDate(d) })}</text>
          </g>
        ))}
        {placed.map(({ b, cx, cy, r }) => (
          <g key={`${b.date}-${b.label}-${b.amount}`}>
            <title>{`${fmt.shortDate(b.date)} · ${b.label} · ${fmt.money(b.original, b.currency)}${b.foreign ? ` ≈ ${fmt.num(b.amount)} ${model.currency}` : ""}`}</title>
            <circle cx={cx} cy={cy} r={r} className={b.foreign ? "bz-map-bubble bz-map-foreign" : "bz-map-bubble"} />
            {r >= 26 && (
              <>
                <text x={cx} y={cy - 3} textAnchor="middle" className="bz-map-text bz-strong">{fmt.num(b.amount)}</text>
                <text x={cx} y={cy + 11} textAnchor="middle" className="bz-map-text">{clip(b.label, Math.floor(r / 3.4))}</text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function monthStarts(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number) as [number, number];
  for (;;) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    const iso = `${y}-${String(m).padStart(2, "0")}-01`;
    if (iso > end) return out;
    out.push(iso);
  }
}
