import { toNumber } from "../../contract/snapshot";
import { Card } from "../../primitives";
import { defineModule } from "../types";

/**
 * What is in the account against what must leave it before the next income, drawn as two
 * circles of proportional area (community proposals "Pressure Shockwave" and "Pressure Ribbon",
 * 2026). The ribbon names the bills that make the pressure.
 */
type Bill = { date: string; label: string; amount: number };
type Model = {
  available: number;
  due: number;
  gap: number;
  payday: string;
  count: number;
  biggest: Bill | null;
  second: Bill | null;
  next: Bill | null;
  currency: string;
};

export default defineModule<Model>({
  id: "payday-pressure",
  size: "wide",
  question: {
    fr: "Quelle pression avant le salaire ?",
    de: "Wie viel Druck bis zum Lohn?",
    it: "Quanta pressione prima dello stipendio?",
    rm: "Quant squitsch avant il salari?",
    en: "How much pressure before payday?",
  },
  reads: ["as_of", "opening_balance", "due_before_next_income", "gap_before_next_income", "next_income_date", "cycles", "base_currency"],
  messages: {
    fr: { short: "Il manque {amount} {cur} d’ici au {date}", covered: "Couvert jusqu’au {date}, il reste {amount} {cur}", meta: "{due} {cur} dus pour {available} {cur} disponibles", missing: "Manque", left: "Reste", overdrawn: "Déjà sous zéro", available: "Disponible", due: "Dû avant le salaire", biggest: "Plus grosse échéance", second: "Deuxième", next: "Prochaine échéance", "density.one": "{n} échéance", "density.other": "{n} échéances", average: "≈ {amount} {cur} chacune", none: "—", aria: "Disponible {available}, dû avant le salaire {due}." },
    de: { short: "Bis {date} fehlen {amount} {cur}", covered: "Bis {date} gedeckt, es bleiben {amount} {cur}", meta: "{due} {cur} fällig bei {available} {cur} verfügbar", missing: "Fehlt", left: "Bleibt", overdrawn: "Schon im Minus", available: "Verfügbar", due: "Fällig vor dem Lohn", biggest: "Grösste Rechnung", second: "Zweitgrösste", next: "Nächste Fälligkeit", "density.one": "{n} Fälligkeit", "density.other": "{n} Fälligkeiten", average: "≈ {amount} {cur} pro Stück", none: "—", aria: "Verfügbar {available}, fällig vor dem Lohn {due}." },
    it: { short: "Mancano {amount} {cur} entro il {date}", covered: "Coperto fino al {date}, restano {amount} {cur}", meta: "{due} {cur} dovuti per {available} {cur} disponibili", missing: "Manca", left: "Resta", overdrawn: "Già sotto zero", available: "Disponibile", due: "Dovuto prima dello stipendio", biggest: "Scadenza più grande", second: "Seconda", next: "Prossima scadenza", "density.one": "{n} scadenza", "density.other": "{n} scadenze", average: "≈ {amount} {cur} ciascuna", none: "—", aria: "Disponibile {available}, dovuto prima dello stipendio {due}." },
    rm: { short: "I mancan {amount} {cur} fin ils {date}", covered: "Cuvrì fin ils {date}, i restan {amount} {cur}", meta: "{due} {cur} debitads per {available} {cur} disponibels", missing: "Manca", left: "Resta", overdrawn: "Gia sut nulla", available: "Disponibel", due: "Debità avant il salari", biggest: "Il pli grond termin", second: "Segund", next: "Proxim termin", "density.one": "{n} termin", "density.other": "{n} termins", average: "≈ {amount} {cur} mintgin", none: "—", aria: "Disponibel {available}, debità avant il salari {due}." },
    en: { short: "You are {amount} {cur} short until {date}", covered: "Covered until {date}, {amount} {cur} left", meta: "{due} {cur} due against {available} {cur} available", missing: "Short", left: "Left", overdrawn: "Already below zero", available: "Available", due: "Due before payday", biggest: "Largest bill", second: "Second", next: "Next bill", "density.one": "{n} bill", "density.other": "{n} bills", average: "≈ {amount} {cur} each", none: "—", aria: "Available {available}, due before payday {due}." },
  },
  select: (s) => {
    if (!s.next_income_date) return null;
    const before = s.cycles.find((c) => c.key === "before_income");
    const bills: Bill[] = (before?.items ?? [])
      .filter((e) => e.direction === "outflow" && toNumber(e.amount) > 0)
      .map((e) => ({ date: e.date, label: e.label, amount: toNumber(e.amount) }));
    const bySize = [...bills].sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date));
    const byDate = [...bills].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
    return {
      available: toNumber(s.opening_balance),
      due: toNumber(s.due_before_next_income),
      gap: toNumber(s.gap_before_next_income),
      payday: s.next_income_date,
      count: bills.length,
      biggest: bySize[0] ?? null,
      second: bySize[1] ?? null,
      next: byDate.find((b) => b.date >= s.as_of) ?? null,
      currency: s.base_currency,
    };
  },
  View: ({ model, t, fmt }) => {
    const cur = model.currency;
    const short = model.gap < 0;
    const title = short
      ? t("short", { amount: fmt.num(-model.gap), cur, date: fmt.shortDate(model.payday) })
      : t("covered", { amount: fmt.num(model.gap), cur, date: fmt.shortDate(model.payday) });
    const R = 104;
    const top = Math.max(model.available, model.due, 1);
    const rAvail = model.available > 0 ? R * Math.sqrt(model.available / top) : 0;
    const rDue = model.due > 0 ? R * Math.sqrt(model.due / top) : 0;
    const center = model.available <= 0 ? t("overdrawn") : short ? t("missing") : t("left");
    const bill = (b: Bill | null) => (b ? <><strong>{fmt.num(b.amount)} <span className="bz-unit">{cur}</span></strong><span>{fmt.shortDate(b.date)} · {b.label}</span></> : <strong>{t("none")}</strong>);
    return (
      <Card question={t("question")} title={title} meta={t("meta", { due: fmt.num(model.due), available: fmt.num(model.available), cur })}>
        <div className="bz-pressure">
          <svg className="bz-pressure-rings" viewBox="0 0 240 240" role="img" aria-label={t("aria", { available: fmt.num(model.available), due: fmt.num(model.due) })}>
            <circle cx={120} cy={120} r={R + 12} className="bz-pressure-halo" />
            {[{ key: "due", r: rDue, cls: "bz-pressure-due" }, { key: "available", r: rAvail, cls: "bz-pressure-available" }]
              .filter((c) => c.r > 0)
              .sort((a, b) => b.r - a.r)
              .map((c) => <circle key={c.key} cx={120} cy={120} r={c.r} className={c.cls} />)}
            <text x={120} y={112} textAnchor="middle" className="bz-pressure-label">{center}</text>
            <text x={120} y={138} textAnchor="middle" className={`bz-pressure-value${short ? " bz-neg" : ""}`}>{fmt.num(Math.abs(model.gap))}</text>
          </svg>
          <div className="bz-ribbon">
            <div><span className="bz-eyebrow"><i className="bz-sw bz-sw-available" />{t("available")}</span><strong>{fmt.num(model.available)} <span className="bz-unit">{cur}</span></strong></div>
            <div><span className="bz-eyebrow"><i className="bz-sw bz-sw-due" />{t("due")}</span><strong>{fmt.num(model.due)} <span className="bz-unit">{cur}</span></strong><span>{t("density", { n: model.count })}{model.count > 0 ? ` · ${t("average", { amount: fmt.num(model.due / model.count), cur })}` : ""}</span></div>
            <div><span className="bz-eyebrow">{t("biggest")}</span>{bill(model.biggest)}</div>
            <div><span className="bz-eyebrow">{t("second")}</span>{bill(model.second)}</div>
            <div><span className="bz-eyebrow">{t("next")}</span>{bill(model.next)}</div>
          </div>
        </div>
      </Card>
    );
  },
});
