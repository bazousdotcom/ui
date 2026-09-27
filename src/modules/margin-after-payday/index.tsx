import { tone } from "../../format";
import { Tile } from "../../primitives";
import { defineModule } from "../types";

type Model = { balance: string; date: string; twoIncomes: boolean; currency: string; missing: number };

export default defineModule<Model>({
  id: "margin-after-payday",
  size: "tile",
  question: {
    fr: "Que me restera-t-il ?",
    de: "Was bleibt mir?",
    it: "Cosa mi resterà?",
    rm: "Tge ma resta?",
    en: "What will be left?",
  },
  reads: ["end_of_horizon", "second_income_date", "data_quality", "base_currency"],
  messages: {
    fr: { label: "Marge au {date}", labelTwo: "Marge au {date} · 2 salaires", ok: "Après toutes les échéances connues", "missing.one": "{n} récurrence encore sans montant", "missing.other": "{n} récurrences encore sans montant" },
    de: { label: "Spielraum am {date}", labelTwo: "Spielraum am {date} · 2 Löhne", ok: "Nach allen bekannten Fälligkeiten", "missing.one": "{n} wiederkehrender Posten noch ohne Betrag", "missing.other": "{n} wiederkehrende Posten noch ohne Betrag" },
    it: { label: "Margine al {date}", labelTwo: "Margine al {date} · 2 stipendi", ok: "Dopo tutte le scadenze note", "missing.one": "{n} ricorrenza ancora senza importo", "missing.other": "{n} ricorrenze ancora senza importo" },
    rm: { label: "Margin ils {date}", labelTwo: "Margin ils {date} · 2 salaris", ok: "Suenter tut ils termins enconuschents", "missing.one": "{n} repetiziun anc senza summa", "missing.other": "{n} repetiziuns anc senza summa" },
    en: { label: "Margin on {date}", labelTwo: "Margin on {date} · 2 paydays", ok: "After every known bill", "missing.one": "{n} recurring item still without an amount", "missing.other": "{n} recurring items still without an amount" },
  },
  select: (s) => ({
    balance: s.end_of_horizon.balance,
    date: s.end_of_horizon.date,
    twoIncomes: !!s.second_income_date,
    currency: s.base_currency,
    missing: s.data_quality.rules_without_amount.length,
  }),
  View: ({ model, t, fmt }) => (
    <Tile
      question={t("question")}
      label={t(model.twoIncomes ? "labelTwo" : "label", { date: fmt.shortDate(model.date) })}
      value={fmt.signed(model.balance)}
      unit={model.currency}
      tone={tone(model.balance)}
      note={model.missing > 0 ? t("missing", { n: model.missing }) : t("ok")}
    />
  ),
});
