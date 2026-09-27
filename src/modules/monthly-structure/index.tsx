import { toNumber } from "../../contract/snapshot";
import { tone } from "../../format";
import { Card, Empty, SHADES } from "../../primitives";
import { defineModule } from "../types";

type Slice = { category: string; amount: number; others?: string[] };
type Model = {
  fixed: string;
  income: string;
  ratio: string | null;
  margin: string | null;
  slices: Slice[];
  currency: string;
  missing: number;
  debts: { total: string; items: { name: string; principal: string }[] } | null;
  target: string | null;
};

export default defineModule<Model>({
  id: "monthly-structure",
  size: "narrow",
  question: {
    fr: "Combien me coûte un mois ?",
    de: "Was kostet mich ein Monat?",
    it: "Quanto mi costa un mese?",
    rm: "Quant ma custa in mais?",
    en: "What does a month cost me?",
  },
  reads: ["structure", "debts", "data_quality", "second_income_date", "base_currency"],
  messages: {
    fr: { title: "Structure mensuelle", fixedOf: "{cur} de charges fixes / {income} de revenus", others: "Autres ({names})", marginTitle: "Marge structurelle", margin: "≈ {amount} {cur} / mois", noIncome: "Revenus récurrents non définis", ratio: "Taux de charges fixes : {p} %.", "missing.one": "{n} récurrence sans montant non comptée.", "missing.other": "{n} récurrences sans montant non comptées.", debts: "Dettes court terme", target: "objectif zéro au {date}", empty: "Aucune récurrence active." },
    de: { title: "Monatliche Struktur", fixedOf: "{cur} Fixkosten / {income} Einkommen", others: "Übrige ({names})", marginTitle: "Struktureller Spielraum", margin: "≈ {amount} {cur} / Monat", noIncome: "Wiederkehrendes Einkommen fehlt", ratio: "Fixkostenquote: {p} %.", "missing.one": "{n} Posten ohne Betrag nicht eingerechnet.", "missing.other": "{n} Posten ohne Betrag nicht eingerechnet.", debts: "Kurzfristige Schulden", target: "Ziel null bis {date}", empty: "Keine wiederkehrenden Posten." },
    it: { title: "Struttura mensile", fixedOf: "{cur} di costi fissi / {income} di reddito", others: "Altro ({names})", marginTitle: "Margine strutturale", margin: "≈ {amount} {cur} / mese", noIncome: "Reddito ricorrente non definito", ratio: "Quota di costi fissi: {p} %.", "missing.one": "{n} ricorrenza senza importo non conteggiata.", "missing.other": "{n} ricorrenze senza importo non conteggiate.", debts: "Debiti a breve termine", target: "obiettivo zero entro il {date}", empty: "Nessuna ricorrenza attiva." },
    rm: { title: "Structura mensila", fixedOf: "{cur} custs fixs / {income} entradas", others: "Auters ({names})", marginTitle: "Margin structural", margin: "≈ {amount} {cur} / mais", noIncome: "Entradas regularas betg definidas", ratio: "Quota da custs fixs: {p} %.", "missing.one": "{n} repetiziun senza summa betg quintada.", "missing.other": "{n} repetiziuns senza summa betg quintadas.", debts: "Debits a curta vista", target: "finamira nulla fin ils {date}", empty: "Naginas repetiziuns activas." },
    en: { title: "Monthly structure", fixedOf: "{cur} fixed costs / {income} income", others: "Other ({names})", marginTitle: "Structural margin", margin: "≈ {amount} {cur} / month", noIncome: "No recurring income set", ratio: "Fixed-cost ratio: {p}%.", "missing.one": "{n} item without an amount not counted.", "missing.other": "{n} items without an amount not counted.", debts: "Short-term debt", target: "target zero by {date}", empty: "No active recurring items." },
  },
  select: (s) => {
    const cats = s.structure.by_category.map((c) => ({ category: c.category, amount: toNumber(c.amount) }));
    const slices: Slice[] =
      cats.length <= 4
        ? cats
        : [...cats.slice(0, 3), { category: "", amount: cats.slice(3).reduce((sum, c) => sum + c.amount, 0), others: cats.slice(3).map((c) => c.category) }];
    return {
      fixed: s.structure.fixed_monthly,
      income: s.structure.income_monthly,
      ratio: s.structure.fixed_ratio_percent,
      margin: s.structure.structural_margin,
      slices,
      currency: s.base_currency,
      missing: s.data_quality.rules_without_amount.length,
      debts: s.debts.items.length ? { total: s.debts.total_base, items: s.debts.items.map((d) => ({ name: d.name, principal: d.principal })) } : null,
      target: s.second_income_date,
    };
  },
  View: ({ model, t, fmt }) => {
    const income = toNumber(model.income);
    const name = (sl: Slice) => (sl.others ? t("others", { names: sl.others.join(", ") }) : sl.category);
    return (
      <Card question={t("question")} title={t("title")}>
        <div className="bz-inline">
          <strong className="bz-figure">{fmt.num(model.fixed)}</strong>
          <span className="bz-note">{t("fixedOf", { cur: model.currency, income: fmt.num(model.income) })}</span>
        </div>
        <div className="bz-stack" role="img" aria-label={model.slices.map((sl) => `${name(sl)} ${fmt.num(sl.amount)}`).join(", ")}>
          {model.slices.map((sl, i) => (
            <i key={name(sl)} className={SHADES[i]} style={{ width: `${income > 0 ? (sl.amount / income) * 100 : 0}%` }} />
          ))}
        </div>
        <div className="bz-cats">
          {model.slices.map((sl, i) => (
            <div key={name(sl)}><i className={SHADES[i]} /><span>{name(sl)}</span><strong>{fmt.num(sl.amount)}</strong></div>
          ))}
          {model.slices.length === 0 && <Empty>{t("empty")}</Empty>}
        </div>
        <hr className="bz-rule" />
        <p className="bz-eyebrow">{t("marginTitle")}</p>
        <strong className={`bz-figure-s bz-${tone(model.margin ?? 0)}`}>
          {model.margin ? t("margin", { amount: fmt.num(model.margin), cur: model.currency }) : t("noIncome")}
        </strong>
        <p className="bz-note">
          {model.ratio ? t("ratio", { p: fmt.num(model.ratio) }) : ""}
          {model.missing > 0 ? ` ${t("missing", { n: model.missing })}` : ""}
        </p>
        {model.debts && (
          <>
            <hr className="bz-rule" />
            <p className="bz-eyebrow">{t("debts")}</p>
            <strong className="bz-figure-s">{fmt.num(model.debts.total)} {model.currency}</strong>
            <p className="bz-note">
              {model.debts.items.map((d) => `${d.name} ${fmt.num(d.principal)}`).join(" · ")}
              {model.target ? ` · ${t("target", { date: fmt.shortDate(model.target) })}` : ""}
            </p>
          </>
        )}
      </Card>
    );
  },
});
