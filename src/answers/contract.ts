import type { Decimal, IsoDate } from "../contract/snapshot";

/**
 * The answers Bazous gives (`GET /api/v1/answers`, and the MCP tool `get_household_answers`),
 * as far as a view needs them. The engine computes everything, including the `visual` block:
 * the kind of picture, the figures to draw and a caption that says the answer from that angle.
 * Published as schema/answers.schema.json.
 */

/** A balance at the end of a day: [iso date, balance]. */
export type BalancePoint = [IsoDate, Decimal];

type Visual<K extends string, T> = { kind: K; caption: string } & T;

/** « Que dois-je payer avant le salaire ? » — a runway from today to payday, bills on the way. */
export type RunwayVisual = Visual<"runway", {
  today: IsoDate;
  payday: IsoDate;
  available: Decimal;
  due: Decimal;
  /** available − due: negative when something is missing. */
  gap: Decimal;
  bills: { label: string; amount: Decimal; date: IsoDate }[];
  /** Days before payday with the balance below zero. */
  short_days: number;
}>;

/** « Jusqu’où puis-je descendre ? » — the valley of the balance. */
export type ValleyVisual = Visual<"valley", {
  series: BalancePoint[];
  low: { date: IsoDate; balance: Decimal };
  days_below_zero: number;
  incomes: IsoDate[];
}>;

/** « Et si je décale un paiement ? » — before and after moving one bill (both curves by the engine). */
export type ShiftVisual = Visual<"shift", {
  before: BalancePoint[];
  after: BalancePoint[];
  move: { label: string; amount: Decimal; from: IsoDate; to: IsoDate };
  low_before: Decimal;
  low_after: Decimal;
}>;

/** « Combien de temps tiendrais-je sans revenu ? » — days of fixed costs covered, out of the advised ones. */
export type DaysVisual = Visual<"days", { covered: number; target: number; balance?: Decimal }>;

/** « Qu’est-ce qui tombe à chaque salaire ? » — what comes in against what goes out in a pay cycle. */
export type BalanceVisual = Visual<"balance", { in: Decimal; out: Decimal; gap: Decimal; start: IsoDate; end: IsoDate }>;

/** « Ma prime d’assurance maladie augmente-t-elle ? » — a countdown to a deadline, and the premium step. */
export type CountdownVisual = Visual<"countdown", {
  deadline: IsoDate;
  days_left: number;
  window_days: number;
  current?: Decimal | null;
  next?: Decimal | null;
  increase_per_year?: Decimal | null;
}>;

/** « Que me restera-t-il ? » — the curve to the end of the period, and where it finishes. */
export type HorizonVisual = Visual<"horizon", {
  series: BalancePoint[];
  end: { date: IsoDate; balance: Decimal };
  /** When the end is below zero: how many days of fixed costs the hole represents. */
  days_of_fixed_costs: number | null;
}>;

/** « Quelle grosse dépense de l’année arrive bientôt ? » — the next 90 days and the yearly bills in them. */
export type CalendarVisual = Visual<"calendar", {
  today: IsoDate;
  until: IsoDate;
  items: { label: string; amount: Decimal; date: IsoDate; days: number; per_month: Decimal }[];
}>;

/** « Est-ce que je paie des frais évitables ? » — what the fees add up to, year after year. */
export type LeakVisual = Visual<"leak", { per_year: Decimal; years: number; total: Decimal; items: { label: string }[] }>;

/** « Ai-je mis de côté pour mes impôts ? » — twelve months to fill before the bill. */
export type JarVisual = Visual<"jar", { bill: Decimal; needed_per_month: Decimal; set_aside_per_month: Decimal; per_day: Decimal }>;

/** « Puis-je encore verser sur mon 3e pilier ? » — paid and still possible, up to the legal limit, until 31.12. */
export type GaugeVisual = Visual<"gauge", {
  year: number; limit: Decimal; paid: Decimal; left: Decimal; deadline: IsoDate; days_left: number;
}>;

/** « Un contrat doit-il être résilié bientôt ? » — today, the day the letter must arrive, the renewal. */
export type DeadlineVisual = Visual<"deadline", {
  today: IsoDate;
  contracts: { name: string; ends_on: IsoDate; cancel_before: IsoDate; days_left: number }[];
}>;

/*
 * The five « Nuit » scenes as still pictures (0.7), for the assistants' card: the same questions as
 * the scenes of bazous.com, drawn without React so they show in Claude and in ChatGPT too.
 */

/** « Quelle pression avant le salaire ? » — the days before payday orbiting what you have. */
export type OrbitVisual = Visual<"orbit", {
  today: IsoDate;
  payday: IsoDate;
  available: Decimal;
  due: Decimal;
  gap: Decimal;
  /** One planet a day: what falls due that day, how many bills, and the heaviest one's name. */
  days: { date: IsoDate; amount: Decimal; count: number; label: string }[];
}>;

/** « Où part mon argent chaque mois ? » — the fixed costs as stars, one a category, sized by its share. */
export type ConstellationVisual = Visual<"constellation", {
  total: Decimal;
  categories: { category: string; amount: Decimal; share: Decimal }[];
}>;

/** « Pourquoi mon solde descend-il ? » — the balance down to its low point, the causes as numbered beads. */
export type RiverVisual = Visual<"river", {
  series: BalancePoint[];
  low: { date: IsoDate; balance: Decimal };
  causes: { date: IsoDate; label: string; amount: Decimal }[];
}>;

/** « Quelles échéances pèsent le plus ? » — the bills as a map sized by amount, the heaviest week lit. */
export type BillMapVisual = Visual<"billmap", {
  from: IsoDate;
  to: IsoDate;
  amount: Decimal;
  outflows: Decimal;
  bills: { label: string; amount: Decimal; date: IsoDate }[];
}>;

/** « Comment se présente chaque mois ? » — one column a month, down to its lowest balance. */
export type WallVisual = Visual<"wall", {
  months: { month: IsoDate; low: Decimal; date: IsoDate }[];
  /** The first day of the tightest month. */
  tightest: IsoDate;
}>;

/**
 * « Mon bien locatif est-il rentable ? » (0.8) — the year's rent falling step by step to what is left:
 * owner costs, loan interest, local tax, then the net gain; with the capital repaid, the cash it costs.
 * Amounts are in the property's own currency (often not the household's). Labels come from the engine.
 */
export type WaterfallVisual = Visual<"waterfall", {
  name: string;
  currency: string;
  year: number | null;
  /** The rent first (positive), then each deduction (negative); zero deductions are left out. */
  steps: { key: "rent" | "costs" | "interest" | "local_tax"; label: string; amount: Decimal }[];
  /** The sum of the steps: what is left after costs, interest and local tax (negative: a loss). */
  result: { key: "net_gain"; label: string; amount: Decimal };
  /** When the loan capital repaid is known: the net gain minus that capital, per year. */
  cash_flow: { key: "cash_flow"; label: string; amount: Decimal; principal: Decimal; principal_label: string } | null;
  /** In percent, one decimal: rent / value, (rent − costs) / value, net gain / equity, interest / debt. */
  yields: { gross: Decimal | null; net: Decimal | null; return_on_equity: Decimal | null; debt_rate: Decimal | null };
  /** For the interactive scene (`<RentalScene>`): every property, the worst first. */
  properties?: RentalProperty[];
  /** All properties added up, when they share a currency (null otherwise, or with one property). */
  total?: RentalTotal | null;
}>;

/** What happens to the year when some levers are pulled: computed by the engine for every combination. */
export type RentalOutcome = {
  rent_per_year: Decimal; costs_per_year: Decimal; interest_per_year: Decimal; local_tax_per_year: Decimal;
  net_gain: Decimal; cash_flow_per_year: Decimal | null; net_yield_percent: Decimal | null; return_on_equity_percent: Decimal | null;
};

export type RentalLeverKey = "rent_up" | "costs_down" | "rate_down" | "vacancy";

/** One property as the scene shows it: the static picture's figures, plus its detail and its what-ifs. */
export type RentalProperty = Omit<WaterfallVisual, "kind" | "caption" | "properties" | "total"> & {
  tone: "risk" | "warn" | "ok";
  value: Decimal;
  loan_balance: Decimal;
  equity: Decimal;
  cost_lines: { label: string; amount: Decimal }[];
  levers: { key: RentalLeverKey; label: string }[];
  /** Keyed by the pulled levers, in the order of `levers`, joined with "+" ("" = none pulled). */
  outcomes: Record<string, RentalOutcome>;
  /** The property's months (kit 0.9), when the host asks for them: the scene's month and rent cursors. */
  calendar?: RentalCalendar;
};

/** One line paid in a month (or the average month): a cost or a local tax, as given or estimated. */
export type RentalCalendarLine = { key: string; group: "costs" | "tax"; label: string; amount: Decimal; estimated: boolean };

/**
 * A property's next months as the engine computed them, every amount monthly in the property's currency. The scene
 * picks a month and a rent level; it never adds: each level's cash, month by month, and its running total are here.
 */
export type RentalCalendar = {
  /** The first month, "YYYY-MM". */
  start: string;
  /** Today's rent excluding charges, and the tenant's provisions for charges. */
  rent: Decimal; provisions: Decimal;
  interest: Decimal; capital: Decimal;
  /** The average month (every line spread over the year); `vacant` = the cash with no tenant (negative). */
  average: { lines: RentalCalendarLine[]; vacant: Decimal };
  months: { month: string; lines: RentalCalendarLine[]; vacant: Decimal; equity: Decimal }[];
  /** Rent levels (excluding charges), today's included, each with its average cash and its cash month by month. */
  grid: { rent: Decimal; average: Decimal; cash: Decimal[]; cumulative: Decimal[] }[];
  /** The rent excluding charges at which the property pays for itself, loan included. */
  breakeven_rent: Decimal;
  /** The household's monthly cash target for this property, and the rent that reaches it. */
  target: Decimal | null; target_rent: Decimal | null;
};

export type RentalTotal = {
  name: string; currency: string;
  rent: Decimal; costs: Decimal; interest: Decimal; local_tax: Decimal; net_gain: Decimal;
  value: Decimal; loan_balance: Decimal; cash_flow: Decimal | null; return_on_equity: Decimal | null;
};

export type AnswerVisual = RunwayVisual | ValleyVisual | ShiftVisual | DaysVisual | BalanceVisual | CountdownVisual
  | HorizonVisual | CalendarVisual | LeakVisual | JarVisual | GaugeVisual | DeadlineVisual
  | OrbitVisual | ConstellationVisual | RiverVisual | BillMapVisual | WallVisual | WaterfallVisual;
export type VisualKind = AnswerVisual["kind"];
export const VISUAL_KINDS = ["runway", "valley", "shift", "days", "balance", "countdown",
  "horizon", "calendar", "leak", "jar", "gauge", "deadline",
  "orbit", "constellation", "river", "billmap", "wall", "waterfall"] as const satisfies readonly VisualKind[];

/** "ok" only for a question asked on its own: its answer is then given in full, picture included. */
export type AnswerTone = "risk" | "warn" | "info" | "ok";

export type Answer = {
  id: string;
  question: string;
  answer: string;
  tone: AnswerTone;
  because: string | null;
  source: "kit" | "expert";
  figures: Record<string, unknown>;
  needs: string[];
  visual?: AnswerVisual;
};

export type Answers = {
  as_of: IsoDate;
  currency: string;
  language: string;
  headline: string;
  answers: Answer[];
  all_clear: { id: string; question: string; short: string }[];
};
