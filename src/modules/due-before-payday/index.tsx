import { toNumber } from "../../contract/snapshot";
import { Tile } from "../../primitives";
import { defineModule } from "../types";

type Model = { due: string; available: string; gap: string; currency: string; payday: string | null };

export default defineModule<Model>({
  id: "due-before-payday",
  size: "tile",
  question: {
    fr: "Que dois-je payer avant le salaire ?",
    de: "Was muss ich vor dem Lohn bezahlen?",
    it: "Cosa devo pagare prima dello stipendio?",
    rm: "Tge stoss jau pajar avant il salari?",
    en: "What do I owe before payday?",
  },
  reads: ["due_before_next_income", "gap_before_next_income", "opening_balance", "next_income_date", "base_currency"],
  messages: {
    fr: { label: "À payer avant le revenu · {day} {date}", labelNone: "Aucun revenu prévu", covered: "Couvert · il reste {rest}", short: "Il manque {gap} avant le revenu", split: "{due} dus − {available} disponibles" },
    de: { label: "Vor dem Einkommen fällig · {day} {date}", labelNone: "Kein Einkommen geplant", covered: "Gedeckt · es bleiben {rest}", short: "Bis zum Einkommen fehlen {gap}", split: "{due} fällig − {available} verfügbar" },
    it: { label: "Da pagare prima del reddito · {day} {date}", labelNone: "Nessun reddito previsto", covered: "Coperto · restano {rest}", short: "Mancano {gap} prima del reddito", split: "{due} dovuti − {available} disponibili" },
    rm: { label: "Da pajar avant il salari · {day} {date}", labelNone: "Nagin salari previs", covered: "Cuvrì · i restan {rest}", short: "I mancan {gap} avant il salari", split: "{due} da pajar − {available} disponibels" },
    en: { label: "Due before payday · {day} {date}", labelNone: "No income scheduled", covered: "Covered · {rest} left", short: "{gap} short before payday", split: "{due} due − {available} available" },
  },
  select: (s) => ({
    due: s.due_before_next_income,
    available: s.opening_balance,
    gap: s.gap_before_next_income,
    currency: s.base_currency,
    payday: s.next_income_date,
  }),
  View: ({ model, t, fmt }) => {
    const gap = toNumber(model.gap);
    const short = gap < 0;
    return (
      <Tile
        question={t("question")}
        label={model.payday ? t("label", { day: fmt.weekday(model.payday), date: fmt.shortDate(model.payday) }) : t("labelNone")}
        value={fmt.num(model.due)}
        unit={model.currency}
        tone={short ? "neg" : undefined}
        note={
          <>
            {short ? t("short", { gap: fmt.num(Math.abs(gap)) }) : t("covered", { rest: fmt.num(gap) })}
            <br />
            {t("split", { due: fmt.num(model.due), available: fmt.num(model.available) })}
          </>
        }
      />
    );
  },
});
