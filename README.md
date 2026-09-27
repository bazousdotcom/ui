# Bazous UI

**The open-source interface kit of [Bazous](https://bazous.com).** Every money question (*how much do I have now? what do I owe before payday? how low might I go?*) is a self-contained module, rendered in five languages from a public data contract. Anyone can add, improve or translate one without ever touching an account, a key or real data.

[![npm](https://img.shields.io/npm/v/@bazous/ui)](https://www.npmjs.com/package/@bazous/ui) [Live gallery](https://bazousdotcom.github.io/ui/) · [Question matrix](docs/matrix.md) · [Contributing](CONTRIBUTING.md) · [Français](README.fr.md)

## What is inside

| Folder | Role |
| --- | --- |
| `schema/snapshot.schema.json` | The contract: the Bazous API response (`GET /api/v1/cockpit`), the only thing the kit knows about. |
| `schema/canvas.json` | The Capture canvas contract: the tags, classes and intents an AI is allowed to write. |
| `src/modules/<id>/` | One module = one question. A pure `select(snapshot)` function and a React view. |
| `src/primitives/` | Card, tile, row, button, cash-flow chart. |
| `src/i18n/`, `src/format/` | Five languages (FR, DE, IT, RM, EN) and Swiss number formatting: `3’420.50` everywhere. |
| `src/engine/scenario.ts` | The kit's only computation: replaying the bills when a "what if" lever is switched on. |
| `src/canvas/` | The CSS and bridge of the Capture canvas (sandboxed iframe, no network request). |
| `fixtures/` | Invented households computed by the real Bazous engine: Léa and Sam "before" (`before.json`) and "after" the diagnosis (`after.json`), a demo household and an empty one, with their answers (`answers-*.json`). |
| `src/answers/` | The answer pictures: a `drawVisual()` function without React, and the `<AnswerPicture>` component. |
| `schema/answers.schema.json` | The contract of the answers and their `visual` block. |
| `gallery/` | The public gallery: every module, the drawn answers and the matrix, in five languages and two themes. |
| `docs/matrix.md` | The matrix: the 16 questions, their module, their picture, and the ones still waiting for one. |

## The modules

**One question, one expert answer.** Nobody should have to know what to ask: each module arrives with the answer. A good module reads as one sentence: a verdict, its tone (fine, watch out, risk) and, when useful, the reason.

| id | Question | Size | Reads from the contract | Shows today | Intents emitted | Expert answer? | What is missing | Target verdict (fictional example) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `available-now` | How much do I have now? | tile | `opening_balance`, `accounts`, `data_quality` | What is available, and "N accounts without a balance" | — | ✅ yes | How fresh the figure is | "3’420.50 CHF available · 1 account without a balance, figure incomplete" |
| `due-before-payday` | What do I owe before payday? | tile | `due_before_next_income`, `gap_before_next_income`, `opening_balance`, `next_income_date` | "Covered · X left" or "X short before income" | — | ✅ yes, the model to follow | — | already there |
| `low-point` | How low might I go? | tile | `low_point`, `next_income_date`, `second_income_date` | Projected low point and its date, "N days before income" | — | ✅ mostly | A tone: +50 and −1’200 look alike | "Low point −1’240 on 20.10 · overdrawn 4 days before payday" |
| `margin-after-payday` | What will be left? | tile | `end_of_horizon`, `second_income_date`, `data_quality` | The margin at a date, flagged when recurring items have no amount | — | ✅ yes | — | already there |
| `monthly-structure` | What does a month cost me? | narrow | `structure`, `debts`, `data_quality` | Fixed costs / income, ratio, structural margin, debts | — | ⚠️ mostly figures | A judgement: is this ratio healthy? | "Your fixed costs take 76 % of income: about 2’200 CHF a month is left" |
| `next-actions` | What next? | wide | `actions`, `next_income_date` | "N decisions · M min", grouped, each with advice | `mark_paid`, `reschedule`, `classify_transaction`, `review_obligation`, `open` | ✅ yes, the most "expert" | — | already there |
| `pay-cycles` | What falls due each pay cycle? | full width | `cycles`, `events`, `next_income_date`, `horizon_end` | The bills of each pay cycle | `mark_paid`, `open` | ⚠️ a list, no conclusion | Which cycle is tight | "The 24.10 → 24.11 cycle is the tightest: 5’600 out for 4’800 in" |
| `what-if` | What if I move a payment? | full width | `points`, `events`, `main_cycle`, `low_point`, `end_of_horizon`… (11 fields) | Curve, horizon, "Why?", levers to switch on, "Save as scenario" | `set_horizon`, `save_scenario` | ❌ asks the person to explore | Lead with the best lever | "Best move: pay the rent on 24.10 → no day below zero" |

**Where 0.1 stood:** 5 modules answer, 2 show data, 1 asks the person to explore. No module returns `null`: with incomplete data they answer in part and say so.

**Next:** make the answer part of the contract (each module gives a one-sentence verdict with its tone, tested in all five languages), then give `monthly-structure` and `pay-cycles` a verdict, and turn `what-if` into "the best move", recommendation first. Contributions on these three modules are welcome.

## Answers with pictures

Bazous also answers in sentences (`GET /api/v1/answers`, and the MCP tool `get_household_answers` for Claude and ChatGPT). An answer may carry a `visual` block: the kind of picture, the figures to draw and a caption that says the same answer from another angle. The engine computes everything; the kit draws it.

| `kind` | Question | What the picture shows |
| --- | --- | --- |
| `runway` | What do I owe before payday? | The runway to payday, the bills on the way, what is available against what is due |
| `valley` | How low might I go? | The balance valley, the zone below zero, the low point |
| `shift` | What if I move a payment? | Before / after: the bill moved to payday, both curves replayed by the engine |
| `days` | How long could I last without income? | The days of fixed costs covered, out of the recommended 90 |
| `balance` | What falls due each pay cycle? | What comes in against what goes out, and the gap |
| `countdown` | Is my health insurance premium going up? | The countdown to the deadline, the premium step |
| `horizon` | What will be left? | The curve to the end of the period, the finish line and what it means in days of fixed costs |
| `calendar` | Which big yearly expense is coming soon? | The next 90 days and the yearly bills that fall in them |
| `leak` | Am I paying avoidable fees? | What the fees add up to over 10 years |
| `jar` | Have I set aside enough for my taxes? | Twelve months to fill against the tax bill, and what it means per day |
| `gauge` | Can I still pay into my pillar 3a? | Paid and still possible up to the limit, and the days until 31.12 |
| `deadline` | Does a contract need cancelling soon? | Today, the day the letter must arrive, the renewal |

```tsx
import { AnswerPicture, type Answers } from "@bazous/ui";

function Answer({ answer, locale }: { answer: Answers["answers"][number]; locale: "en" }) {
  return (
    <article>
      <p>{answer.question}</p>
      <AnswerPicture visual={answer.visual} locale={locale} />
      {answer.visual && <p>{answer.visual.caption}</p>}
      <p>{answer.answer}</p>
    </article>
  );
}
```

Without React (a static page, the assistants' card): `import { drawVisual } from "@bazous/ui/answers"` returns an `SVGSVGElement`, or `null` when there is nothing to draw. The picture follows the theme through the `--bz-*` tokens.

The questions without a picture yet ("How much do I have now?", "What next?", "What does a month cost me?", "What if one of the incomes stopped?") are open for contributions: open an issue with your angle. The [matrix](docs/matrix.md) (and its [live version](https://bazousdotcom.github.io/ui/#view=matrix)) shows where each question stands.

## The rules that do not move

1. **No network.** A module makes no request, stores nothing and sets no cookie. It emits an intent (`mark_paid`, `reschedule`, `open`…) that the app executes. A test scans `src/` and fails otherwise.
2. **The engine computes, the kit shows.** Modules select and format figures the server already computed. One deliberate exception: replaying levers, which with no lever reproduces the engine's curve to the cent (tested).
3. **Five languages or nothing.** Every key exists in all five languages; every module renders in all five languages and every test household without a missing key, `NaN` or `undefined`.
4. **Swiss numbers.** `3’420.50` in every language, a true minus sign, short dates `24.09`. Numbers never go through `Intl` (browsers disagree on fr-CH and it-CH).
5. **Invented data only** in this repository.

## Using the kit

```bash
npm install @bazous/ui
```

```tsx
import "@bazous/ui/styles.css";
import { Dashboard, MODULES, type ModuleAction, type Snapshot } from "@bazous/ui";

function Cockpit({ snapshot }: { snapshot: Snapshot }) {
  const onAction = (action: ModuleAction) => {
    // the app calls its API with the user's token, then reloads the snapshot
  };
  return <Dashboard modules={MODULES} snapshot={snapshot} locale="en" theme="dark" onAction={onAction} />;
}
```

Fonts are not bundled: load Playfair Display (500, 600) and Montserrat (400, 500, 600).

## Developing

```bash
npm install
npm run dev        # gallery on http://localhost:5173
npm run check      # types, tests, build
```

Publishing a GitHub release `vX.Y.Z` (matching `package.json`) runs the tests and publishes the package on npm with provenance.

## Translations

Romansh follows Rumantsch Grischun; a review by a native speaker is welcome (label `lang:rm`).

## License

MIT. The kit is free; the Bazous name, its logo and the Bazous Cloud service are not covered by this license.
