import { toNumber } from "../../contract/snapshot";
import { daysBetween } from "../../format";
import { Tile } from "../../primitives";
import { defineModule } from "../types";

type Model = { balance: string; date: string; days: number; currency: string; beforeIncome: { days: number; date: string } | null };

export default defineModule<Model>({
  id: "low-point",
  size: "tile",
  question: {
    fr: "Jusqu’où puis-je descendre ?",
    de: "Wie tief sinkt mein Saldo?",
    it: "Quanto scenderà il saldo?",
    rm: "Quant bass vegn il saldo?",
    en: "How low might I go?",
  },
  reads: ["low_point", "next_income_date", "second_income_date", "base_currency"],
  messages: {
    fr: { label: "Point bas prévu · {day} {date}", "before.one": "{n} jour avant le revenu du {date}", "before.other": "{n} jours avant le revenu du {date}" },
    de: { label: "Prognostizierter Tiefpunkt · {day} {date}", "before.one": "{n} Tag vor dem Einkommen am {date}", "before.other": "{n} Tage vor dem Einkommen am {date}" },
    it: { label: "Minimo previsto · {day} {date}", "before.one": "{n} giorno prima del reddito del {date}", "before.other": "{n} giorni prima del reddito del {date}" },
    rm: { label: "Punct bass previs · {day} {date}", "before.one": "{n} di avant il salari dals {date}", "before.other": "{n} dis avant il salari dals {date}" },
    en: { label: "Projected low point · {day} {date}", "before.one": "{n} day before the {date} income", "before.other": "{n} days before the {date} income" },
  },
  select: (s) => {
    // The income that follows the low point, if the horizon contains it.
    const after = [s.next_income_date, s.second_income_date].find((d): d is string => !!d && d > s.low_point.date) ?? null;
    return {
      balance: s.low_point.balance,
      date: s.low_point.date,
      days: s.low_point.days_from_now,
      currency: s.base_currency,
      beforeIncome: after ? { days: daysBetween(s.low_point.date, after), date: after } : null,
    };
  },
  View: ({ model, t, fmt }) => {
    const when = model.days === 0 ? t("today") : t("inDays", { n: model.days });
    const note = model.beforeIncome ? `${when} · ${t("before", { n: model.beforeIncome.days, date: fmt.shortDate(model.beforeIncome.date) })}` : when;
    return (
      <Tile
        emphasis
        question={t("question")}
        label={t("label", { day: fmt.weekday(model.date), date: fmt.shortDate(model.date) })}
        value={fmt.num(model.balance)}
        unit={model.currency}
        tone={toNumber(model.balance) < 0 ? "neg" : undefined}
        note={note}
      />
    );
  },
});
