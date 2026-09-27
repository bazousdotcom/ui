# The question matrix

**The money questions nobody thinks of asking.** For each household, Bazous answers the questions the community and experts consider important, before anyone thinks of asking them. The engine computes the figures; this kit shows them, on [bazous.com](https://bazous.com) as well as inside Claude and ChatGPT. Every question is a module: one question, one answer, one picture.

[Live matrix in the gallery](https://bazousdotcom.github.io/ui/#view=matrix) · [The before / after story](https://bazousdotcom.github.io/ui/#view=answers&data=before) · [Contributing](../CONTRIBUTING.md) · [Français](matrix.fr.md)

## The engine computes, the kit shows

```
Bazous engine (private)  ──►  public JSON contract  ──►  @bazous/ui (MIT)  ──►  bazous.com · Claude · ChatGPT
forecasts, low point,         snapshot.schema.json       React modules,         the same answer,
best postponement,            answers.schema.json        SVG pictures,          the same picture,
captions in 5 languages                                  no network call        everywhere
```

- **bazous.com** imports the kit: the "Today" page draws the answers with `<AnswerPicture>`.
- **The Claude and ChatGPT card** (MCP App, server `https://bazous.com/mcp`) bundles `@bazous/ui/answers` at build time; it loads nothing from the network.
- A contribution merged here therefore reaches the site and the assistants at the same time.

## The 16 questions

The answers quoted are those of **Léa and Sam**, an invented family the gallery tells in two acts:

- **Before**, 1 October (dark theme): 2’200 in the account, but the rent and the health insurance fall due that very day and the salary only lands on the 30th. The result: 58 days out of 68 below zero, a low point of −6’000, fixed costs at 95 % of income, 240 a year in fees (2’400 over 10 years), a health premium that costs 900 more a year. Bazous flags 15 points.
- **After**, three months later (light theme): rent paid on payday, card and loan cleared, a cheaper health insurer, a free bank account, 500 a month set aside for taxes. 4 points are left; 9 answers are all clear.

The figures always come from the engine; a module or a picture never recomputes them.

| id | Question | Source | What Bazous answers (example) | Figures provided | Picture | In the kit |
| --- | --- | --- | --- | --- | --- | --- |
| `available-now` | How much do I have now? | community | “2’200.00 CHF available” | `amount`, `accounts_without_balance` | 🎨 wanted | [module](../src/modules/available-now) |
| `due-before-payday` | What do I owe before payday? | community | “You are 3’800.00 CHF short for 29 day(s), until payday on 30.10.” | `due`, `available`, `gap`, `next_income_date` | `runway` | [module](../src/modules/due-before-payday) |
| `low-point` | How low might I go? | community | “58 day(s) below zero in the next 68 days; the bottom: −6’000.00 CHF on 28.11.” | `balance`, `date`, `days_from_now` | `valley` | [module](../src/modules/low-point) |
| `margin-after-payday` | What will be left? | community | “You will have 0.00 CHF left on 07.12, but 1 recurring item(s) without an amount will bring it down.” | `balance`, `date` | `horizon` | [module](../src/modules/margin-after-payday) |
| `what-if` | What if I move a payment? | community | “Move Facture dentiste to 30.11: your low point rises by 2’000.00 CHF.” | `label`, `amount`, `from`, `target`, `low_before`, `low_after` | `shift` | [module](../src/modules/what-if) |
| `next-actions` | What next? | community | “18 decision(s): Loyer (1’800.00 CHF) due today; Assurance maladie (900.00 CHF) due today; Carte de crédit (300.00 CHF) to pay by 10.10; and 15 more.” | `count`, `overdue` | 🎨 wanted | [module](../src/modules/next-actions) |
| `monthly-structure` | What does a month cost me? | community | “Your fixed costs take 95 % of your income: about 300.00 CHF a month is left.” | `fixed_monthly`, `income_monthly`, `ratio` | 🎨 wanted | [module](../src/modules/monthly-structure) |
| `pay-cycles` | What falls due each pay cycle? | community | “This cycle leaves a 2’200.00 CHF hole: 8’200.00 CHF goes out for 6’000.00 CHF coming in.” | `start`, `end`, `total_out`, `total_in` | `balance` | [module](../src/modules/pay-cycles) |
| `annual-bills` | Which big yearly expense is coming soon? | expert | “In 61 day(s): Assurance voiture, 1’200.00 CHF. Setting 600.00 CHF aside each month until then is enough.” | `items: label, amount, next_date` | `calendar` | engine answer |
| `safety-cushion` | How long could I last without income? | expert | “Without a salary, your money pays your fixed costs for 11 day(s) out of the 90 advised.” | `months`, `fixed_monthly`, `target_months`, `gap` | `days` | engine answer |
| `income-loss` | What if one of the incomes stopped? | expert | “Without “Salaire Léa”, your low point would go from −6’000.00 CHF to −10’000.00 CHF.” | `income`, `low_point_before`, `low_point` | 🎨 wanted | engine answer |
| `avoidable-fees` | Am I paying avoidable fees? | expert | “These fees cost you 240.00 CHF a year, that is 2’400.00 CHF in 10 years.” | `per_year`, `items` | `leak` | engine answer |
| `health-insurance` | Is my health insurance premium going up, and can I switch? | expert | “You have 60 day(s) left to switch insurer; the increase costs you 900.00 CHF a year.” | `deadline`, `monthly_premium`, `next_year_monthly_premium`, `increase_per_year` | `countdown` | engine answer |
| `tax-provision` | Have I set aside enough for my taxes? | expert | “For the next tax bill (6’000.00 CHF), set 500.00 CHF aside every month: 16.44 CHF a day.” | `last_annual_bill`, `needed_per_month`, `set_aside_per_month` | `jar` | engine answer |
| `pillar-3a` | Can I still pay into my pillar 3a this year? | expert | “You can still pay 7’258.00 CHF into your pillar 3a by 31.12, in 91 day(s).” | `left`, `limit`, `year` | `gauge` | engine answer |
| `contract-notice` | Does a contract need cancelling soon? | expert | “You have 30 day(s) left for your cancellation of “Salle de sport” to arrive before 31.10; otherwise the contract renews after 31.12.” | `contracts: name, ends_on, deadline` | `deadline` | engine answer |

**Status:** 16 questions, 12 drawn on bazous.com, in Claude and in ChatGPT, 4 open for contributions.

## The 12 pictures

All in [`src/answers/draw.ts`](../src/answers/draw.ts), contract in [`schema/answers.schema.json`](../schema/answers.schema.json).

| `kind` | For | Data of the `visual` block |
| --- | --- | --- |
| `runway` | before payday | `today`, `payday`, `available`, `due`, `gap`, `bills[]`, `short_days` |
| `valley` | low point | `series[[date, balance]]`, `low`, `days_below_zero`, `incomes[]` |
| `shift` | before / after | `before[]`, `after[]`, `move{label, amount, from, to}`, `low_before`, `low_after` |
| `days` | safety cushion | `covered`, `target`, `balance` |
| `balance` | pay cycle | `in`, `out`, `gap`, `start`, `end` |
| `countdown` | health insurance | `deadline`, `days_left`, `window_days`, `current`, `next`, `increase_per_year` |
| `horizon` | end of period | the curve, the finish line, what it is worth in days of fixed costs |
| `calendar` | yearly bills | the next 90 days and the bills that fall in them |
| `leak` | avoidable fees | what the fees cost per year and over 10 years |
| `jar` | taxes | twelve months to fill against the tax bill |
| `gauge` | pillar 3a | paid, still possible, days until 31.12 |
| `deadline` | cancellation | today, the day the letter must arrive, the renewal |

An answer with its picture:

```json
{
  "id": "safety-cushion",
  "question": "How long could I last without income?",
  "answer": "Your available money covers 0.4 months of fixed costs (5’700.00 CHF a month). Reaching 3 months takes 14’900.00 CHF more, that is 1’241.67 CHF a month for a year.",
  "tone": "risk",
  "source": "expert",
  "figures": {
    "months": "0.4",
    "fixed_monthly": "5700",
    "target_months": 3,
    "gap": "14900.00"
  },
  "visual": {
    "kind": "days",
    "covered": 11,
    "target": 90,
    "balance": "2200.00",
    "caption": "Without a salary, your money pays your fixed costs for 11 day(s) out of the 90 advised."
  }
}
```

## Adding a picture

1. **Pick a question without a picture** (🎨 above) and open an [issue](https://github.com/bazousdotcom/ui/issues/new) with your angle: what the person will understand at a glance that they did not see before.
   - `available-now`: what is available, and what it means against the next bill.
   - `next-actions`: today's decisions, sorted by urgency, in one picture.
   - `monthly-structure`: where each franc of income goes, fixed costs and margin.
   - `income-loss`: the curve with and without that income, the day it tips over.
2. **Start from the contract's figures.** If a figure is missing, ask for it in the issue: the engine adds it, the picture never computes it.
3. **Draw in SVG, without network**, in `src/answers/draw.ts` and `src/answers/contract.ts`: colours from the `--bz-*` tokens, light and dark, readable from 320 to 390 px, no text on top of another.
4. **Check it in the gallery** (`npm run dev`, "Answers" and "Matrix" views), with the invented households of `fixtures/answers-*.json`, in five languages and both themes. `npm run check` must pass.

## Install

```bash
npm install @bazous/ui
```
