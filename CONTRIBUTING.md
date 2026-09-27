# Contributing to Bazous UI

Thank you! The most useful contribution is **a question**: something a household wonders about its money, which the snapshot can already answer.

## Adding a module in five steps

1. **Pick the question.** It must be answerable from the fields of `schema/snapshot.schema.json`. If a figure is missing, open a "New question" issue first: the contract evolves on the server, not in the kit.
2. **Create the folder** `src/modules/<id>/index.tsx`. The `id` is English kebab-case and becomes public API: it never changes.
3. **Write the module** with `defineModule`:

```tsx
import { Tile } from "../../primitives";
import { defineModule } from "../types";

type Model = { amount: string; currency: string };

export default defineModule<Model>({
  id: "debt-total",
  size: "tile",
  question: {
    fr: "Combien dois-je en tout ?",
    de: "Wie viel schulde ich insgesamt?",
    it: "Quanto devo in totale?",
    rm: "Quant stoss jau en tut?",
    en: "How much do I owe in total?",
  },
  reads: ["debts", "base_currency"],
  messages: {
    fr: { label: "Dettes court terme" },
    de: { label: "Kurzfristige Schulden" },
    it: { label: "Debiti a breve termine" },
    rm: { label: "Debits a curta vista" },
    en: { label: "Short-term debt" },
  },
  select: (s) => (s.debts.items.length ? { amount: s.debts.total_base, currency: s.base_currency } : null),
  View: ({ model, t, fmt }) => <Tile question={t("question")} label={t("label")} value={fmt.num(model.amount)} unit={model.currency} />,
});
```

4. **Register it** in `src/modules/registry.ts` (one line, where it should appear in the cockpit).
5. **Check it**: `npm run check`, then `npm run dev` and look at your module in the five languages, both themes and every household (`before`, `after`, `demo`, `empty`).

## Adding an answer picture

1. **Pick a question without a picture** in the [matrix](docs/matrix.md) and open an issue with your angle: what the person will understand at a glance that they did not see before.
2. **Start from the contract's figures** (`figures` and the `visual` block). If a figure is missing, ask for it in the issue: the engine adds it, the picture never computes it.
3. **Draw in SVG, without network**, in `src/answers/draw.ts` and `src/answers/contract.ts`: colours from the `--bz-*` tokens, light and dark, readable from 320 to 390 px, no text on top of another.
4. **Check it in the gallery** (`npm run dev`, "Answers" and "Matrix" views) with the households of `fixtures/answers-*.json`, in five languages and both themes.

## What CI rejects

- a translation key missing in one language, or a render containing `⟦key⟧`, `NaN` or `undefined`;
- a `select` that mutates the snapshot or does not return the same result twice;
- `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `document.cookie`, `eval` or a URL in `src/`;
- a field in `reads` that does not exist in the contract;
- a Capture canvas class without a style, or an out-of-date `schema/canvas.json`.

## Style

- Use the primitives (`Card`, `Tile`, `Row`, `Button`, `CashflowChart`) and the `bz-*` classes; no hard-coded colours, no `style` attribute except for a proportional width.
- Numbers through `fmt.num` / `fmt.signed` / `fmt.money`, dates through `fmt.shortDate` / `fmt.longDate`.
- The module's question is the eyebrow; the title says what is shown, the value answers.
- A module that cannot answer returns `null`: the host shows "not enough data yet".
- The French, German, Italian and Romansh texts address the person informally (« tu », « du », « tu », « ti »).

## Developer Certificate of Origin (DCO)

Every commit carries a `Signed-off-by` line (`git commit -s`), certifying you have the right to publish the code under the MIT license ([developercertificate.org](https://developercertificate.org)).

## Invented data only

Fixtures, screenshots and examples use invented households only. Never paste real balances, bills, names or bank details, yours or anyone else's.

## Translations

Translation fixes are contributions in their own right. For Romansh, say which idiom you write if it is not Rumantsch Grischun.
