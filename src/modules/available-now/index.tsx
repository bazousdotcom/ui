import { toNumber } from "../../contract/snapshot";
import { Tile } from "../../primitives";
import { defineModule } from "../types";

const LIQUID = new Set(["bank", "prepaid", "cash"]);

type Model = { amount: string; currency: string; known: string[]; missing: number };

export default defineModule<Model>({
  id: "available-now",
  size: "tile",
  question: {
    fr: "Combien ai-je maintenant ?",
    de: "Wie viel habe ich jetzt?",
    it: "Quanto ho adesso?",
    rm: "Quant hai jau ussa?",
    en: "How much do I have now?",
  },
  reads: ["opening_balance", "base_currency", "accounts", "data_quality"],
  messages: {
    fr: { label: "Disponible maintenant", "missing.one": "{n} compte sans solde", "missing.other": "{n} comptes sans solde", none: "Aucun solde renseigné" },
    de: { label: "Jetzt verfügbar", "missing.one": "{n} Konto ohne Saldo", "missing.other": "{n} Konten ohne Saldo", none: "Noch kein Saldo erfasst" },
    it: { label: "Disponibile ora", "missing.one": "{n} conto senza saldo", "missing.other": "{n} conti senza saldo", none: "Nessun saldo inserito" },
    rm: { label: "Disponibel ussa", "missing.one": "{n} conto senza saldo", "missing.other": "{n} contos senza saldo", none: "Anc nagin saldo endatà" },
    en: { label: "Available now", "missing.one": "{n} account without a balance", "missing.other": "{n} accounts without a balance", none: "No balance entered yet" },
  },
  select: (s) => ({
    amount: s.opening_balance,
    currency: s.base_currency,
    known: s.accounts.filter((a) => a.balance !== null && LIQUID.has(a.account_type)).map((a) => a.name),
    missing: s.data_quality.accounts_without_balance.length,
  }),
  View: ({ model, t, fmt }) => {
    const parts = [...(model.known.length ? [model.known.join(", ")] : []), ...(model.missing ? [t("missing", { n: model.missing })] : [])];
    return (
      <Tile
        question={t("question")}
        label={t("label")}
        value={fmt.num(model.amount)}
        unit={model.currency}
        tone={toNumber(model.amount) < 0 ? "neg" : undefined}
        note={parts.join(" · ") || t("none")}
      />
    );
  },
});
