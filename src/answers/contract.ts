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

export type AnswerVisual = RunwayVisual | ValleyVisual | ShiftVisual | DaysVisual | BalanceVisual | CountdownVisual
  | HorizonVisual | CalendarVisual | LeakVisual | JarVisual | GaugeVisual | DeadlineVisual;
export type VisualKind = AnswerVisual["kind"];
export const VISUAL_KINDS = ["runway", "valley", "shift", "days", "balance", "countdown",
  "horizon", "calendar", "leak", "jar", "gauge", "deadline"] as const satisfies readonly VisualKind[];

export type AnswerTone = "risk" | "warn" | "info";

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
