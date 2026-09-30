import { toNumber } from "../../contract/snapshot";
import { Card } from "../../primitives";
import { defineModule } from "../types";

/**
 * One column per month, like a wall calendar: what comes in, what goes out, how low the
 * balance gets and what the month is like (community proposals "Calendar Wall" and "Mission
 * in three acts", 2026). The month's state comes from the engine's daily balances, never from
 * a judgement written by hand.
 */
type Movement = { date: string; label: string; amount: number; inflow: boolean };
type State = "under" | "tight" | "breathe";
type Month = {
  key: string;
  from: string;
  to: string;
  partial: boolean;
  start: number;
  end: number;
  low: { date: string; balance: number };
  in: number;
  out: number;
  state: State;
  curve: number[];
  movements: Movement[];
};
type Model = { months: Month[]; hardest: Month; currency: string };

const SHOWN = 6;

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
    fr: { title: "{month} est le mois le plus serré : point bas {amount} {cur} le {date}", calm: "Chaque mois reste au-dessus de zéro, le plus bas en {month} ({amount} {cur})", "state.under": "Sous zéro", "state.tight": "Serré", "state.breathe": "Respire", until: "jusqu’au {date}", from: "dès le {date}", in: "Entrées", out: "Sorties", low: "Point bas", end: "Fin du mois", more: "+ {n} autres", none: "Aucun mouvement.", aria: "Solde de {month}, du {from} au {to}." },
    de: { title: "{month} ist der knappste Monat: Tiefpunkt {amount} {cur} am {date}", calm: "Jeder Monat bleibt über null, am tiefsten im {month} ({amount} {cur})", "state.under": "Unter null", "state.tight": "Knapp", "state.breathe": "Luft", until: "bis {date}", from: "ab {date}", in: "Einnahmen", out: "Ausgaben", low: "Tiefpunkt", end: "Monatsende", more: "+ {n} weitere", none: "Keine Bewegung.", aria: "Saldo im {month}, vom {from} bis {to}." },
    it: { title: "{month} è il mese più stretto: minimo {amount} {cur} il {date}", calm: "Ogni mese resta sopra lo zero, il più basso in {month} ({amount} {cur})", "state.under": "Sotto zero", "state.tight": "Stretto", "state.breathe": "Respira", until: "fino al {date}", from: "dal {date}", in: "Entrate", out: "Uscite", low: "Minimo", end: "Fine mese", more: "+ altri {n}", none: "Nessun movimento.", aria: "Saldo di {month}, dal {from} al {to}." },
    rm: { title: "{month} è il mais il pli stretg: punct bass {amount} {cur} ils {date}", calm: "Mintga mais resta sur nulla, il pli bass en {month} ({amount} {cur})", "state.under": "Sut nulla", "state.tight": "Stretg", "state.breathe": "Respira", until: "fin ils {date}", from: "a partir dals {date}", in: "Entradas", out: "Sortidas", low: "Punct bass", end: "Fin dal mais", more: "+ {n} auters", none: "Nagin moviment.", aria: "Saldo da {month}, dals {from} fin ils {to}." },
    en: { title: "{month} is the tightest month: low point {amount} {cur} on {date}", calm: "Every month stays above zero, lowest in {month} ({amount} {cur})", "state.under": "Below zero", "state.tight": "Tight", "state.breathe": "Breathing", until: "to {date}", from: "from {date}", in: "In", out: "Out", low: "Low point", end: "Month end", more: "+ {n} more", none: "No movement.", aria: "{month} balance, from {from} to {to}." },
  },
  select: (s) => {
    if (s.points.length === 0 || s.events.length === 0) return null;
    const keys = [...new Set(s.points.map((p) => p.date.slice(0, 7)))];
    let carried = toNumber(s.opening_balance);
    const months: Month[] = keys.map((key) => {
      const pts = s.points.filter((p) => p.date.slice(0, 7) === key);
      const start = carried;
      const closings = pts.map((p) => toNumber(p.closing_balance));
      const end = closings[closings.length - 1] ?? start;
      carried = end;
      let low = { date: pts[0]!.date, balance: start };
      pts.forEach((p, i) => { if (closings[i]! < low.balance) low = { date: p.date, balance: closings[i]! }; });
      const events = s.events.filter((e) => e.date.slice(0, 7) === key && toNumber(e.amount) > 0);
      const sum = (inflow: boolean) => events.filter((e) => (e.direction === "inflow") === inflow).reduce((acc, e) => acc + toNumber(e.amount), 0);
      const from = pts[0]!.date;
      const to = pts[pts.length - 1]!.date;
      const lastDay = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
      return {
        key, from, to, start, end, low,
        partial: from.slice(8) !== "01" || Number(to.slice(8)) !== lastDay,
        in: sum(true),
        out: sum(false),
        state: low.balance < 0 ? "under" : end < start ? "tight" : "breathe",
        curve: [start, ...closings],
        movements: events
          .map((e) => ({ date: e.date, label: e.label, amount: toNumber(e.amount), inflow: e.direction === "inflow" }))
          .sort((a, b) => a.date.localeCompare(b.date) || Number(b.inflow) - Number(a.inflow)),
      };
    });
    const hardest = months.reduce((a, b) => (b.low.balance < a.low.balance ? b : a));
    return { months, hardest, currency: s.base_currency };
  },
  View: ({ model, t, fmt }) => {
    const cur = model.currency;
    const h = model.hardest;
    const title = h.low.balance < 0
      ? t("title", { month: fmt.month(h.from), amount: fmt.num(h.low.balance), cur, date: fmt.shortDate(h.low.date) })
      : t("calm", { month: fmt.month(h.from), amount: fmt.num(h.low.balance), cur });
    const all = model.months.flatMap((m) => m.curve);
    const lo = Math.min(0, ...all);
    const hi = Math.max(0, ...all);
    return (
      <Card question={t("question")} title={title}>
        <div className="bz-wall">
          {model.months.map((m) => (
            <section key={m.key} className={`bz-month bz-month-${m.state}`}>
              <header className="bz-month-head">
                <div>
                  <h3 className="bz-month-name">{fmt.month(m.from)}</h3>
                  {m.partial && <span className="bz-note">{m.from.slice(8) !== "01" ? t("from", { date: fmt.shortDate(m.from) }) : t("until", { date: fmt.shortDate(m.to) })}</span>}
                </div>
                <span className="bz-month-state">{t(`state.${m.state}`)}</span>
              </header>
              <Spark values={m.curve} lo={lo} hi={hi} label={t("aria", { month: fmt.month(m.from), from: fmt.shortDate(m.from), to: fmt.shortDate(m.to) })} />
              <dl className="bz-month-figures">
                <dt>{t("in")}</dt><dd className={m.in > 0 ? "bz-pos" : ""}>{m.in > 0 ? "+" : ""}{fmt.num(m.in)}</dd>
                <dt>{t("out")}</dt><dd>{m.out > 0 ? "−" : ""}{fmt.num(m.out)}</dd>
                <dt>{t("low")} · {fmt.shortDate(m.low.date)}</dt><dd className={m.low.balance < 0 ? "bz-neg" : ""}>{fmt.num(m.low.balance)}</dd>
                <dt>{t("end")}</dt><dd>{fmt.num(m.end)}</dd>
              </dl>
              <ul className="bz-month-list">
                {shown(m.movements).map((e, i) => (
                  <li key={`${e.date}-${i}`} className={e.inflow ? "bz-in" : ""}>
                    <span className="bz-date">{fmt.shortDate(e.date)}</span>
                    <span className="bz-month-label">{e.label}</span>
                    <strong>{e.inflow ? "+" : "−"}{fmt.num(e.amount)}</strong>
                  </li>
                ))}
                {m.movements.length > SHOWN && <li className="bz-note">{t("more", { n: m.movements.length - SHOWN })}</li>}
                {m.movements.length === 0 && <li className="bz-note">{t("none")}</li>}
              </ul>
            </section>
          ))}
        </div>
      </Card>
    );
  },
});

/** The month's largest movements, salaries included, back in date order. */
function shown(movements: Movement[]): Movement[] {
  if (movements.length <= SHOWN) return movements;
  const keep = new Set([...movements].sort((a, b) => b.amount - a.amount).slice(0, SHOWN));
  return movements.filter((m) => keep.has(m));
}

/** A month's balance as a small step line, on the same scale for every month so they compare. */
function Spark({ values, lo, hi, label }: { values: number[]; lo: number; hi: number; label: string }) {
  const W = 200;
  const H = 48;
  const y = (v: number) => 4 + ((hi - v) / (hi - lo || 1)) * (H - 8);
  const x = (i: number) => (i / Math.max(values.length - 1, 1)) * W;
  let d = `M0,${y(values[0] ?? 0).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) d += ` H${x(i).toFixed(1)} V${y(values[i]!).toFixed(1)}`;
  return (
    <svg className="bz-month-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {lo < 0 && <rect x={0} y={y(0)} width={W} height={H - y(0)} className="bz-chart-danger" />}
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="bz-chart-zero" vectorEffect="non-scaling-stroke" />
      <path d={d} className="bz-month-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
