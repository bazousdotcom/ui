/**
 * The snapshot contract: the only thing this kit knows about a household.
 *
 * It is the JSON returned by the Bazous API (`GET /api/v1/cockpit`), described
 * formally in `schema/snapshot.schema.json`. Amounts are decimal strings in the
 * household base currency unless a field says otherwise; dates are ISO `YYYY-MM-DD`.
 * Nothing in this kit fetches it, stores it or recomputes the forecast from it.
 */

export type Decimal = string;
export type IsoDate = string;
export type Direction = "inflow" | "outflow";

export type CashEvent = {
  date: IsoDate;
  label: string;
  /** Amount in the base currency. */
  amount: Decimal;
  direction: Direction;
  /** Amount in the currency of the bill itself. */
  original_amount: Decimal;
  currency: string;
  kind: "obligation" | "recurrence" | string;
  ref_id: string | null;
  status: string | null;
};

export type DailyPoint = {
  date: IsoDate;
  inflows: Decimal;
  outflows: Decimal;
  closing_balance: Decimal;
};

export type Cycle = {
  /** `before_income`, then `cycle_1`, `cycle_2`… */
  key: string;
  start: IsoDate;
  end: IsoDate;
  total_out: Decimal;
  total_in: Decimal;
  items: CashEvent[];
};

export type Driver = { label: string; date: IsoDate; amount: Decimal; share: Decimal };

export type Action =
  | {
      type: "overdue" | "due_today";
      ref_id: string;
      label: string;
      date: IsoDate;
      amount: Decimal;
      currency: string;
      amount_base: Decimal;
    }
  | {
      type: "plan";
      ref_id: string;
      label: string;
      date: IsoDate;
      amount: Decimal;
      currency: string;
      amount_base: Decimal;
      target: IsoDate;
    }
  | {
      type: "needs_review";
      kind: "obligation" | "transaction";
      ref_id: string;
      label: string;
      date: IsoDate | null;
      amount: Decimal;
      currency: string;
      confidence: Decimal | null;
    }
  | { type: "missing_amounts"; label: string; items: string[] };

export type Account = {
  id: string;
  name: string;
  account_type: string;
  currency: string;
  institution: string | null;
  balance: Decimal | null;
  balance_base: Decimal | null;
  observed_at: string | null;
};

export type Snapshot = {
  as_of: IsoDate;
  horizon_end: IsoDate;
  next_income_date: IsoDate | null;
  second_income_date: IsoDate | null;
  base_currency: string;
  fx_rates: Record<string, Decimal>;
  opening_balance: Decimal;
  due_before_next_income: Decimal;
  /** opening_balance − due_before_next_income: negative means short before payday. */
  gap_before_next_income: Decimal;
  low_point: { date: IsoDate; balance: Decimal; days_from_now: number };
  end_of_horizon: { date: IsoDate; balance: Decimal };
  main_cycle: { start: IsoDate; end: IsoDate; total_out: Decimal; total_in: Decimal; drivers: Driver[] };
  cycles: Cycle[];
  points: DailyPoint[];
  events: CashEvent[];
  household: { id: string; name: string };
  accounts: Account[];
  structure: {
    fixed_monthly: Decimal;
    income_monthly: Decimal;
    fixed_ratio_percent: Decimal | null;
    structural_margin: Decimal | null;
    by_category: { category: string; amount: Decimal }[];
  };
  debts: {
    total_base: Decimal;
    items: { id: string; name: string; principal: Decimal; currency: string; due_day: number | null }[];
  };
  actions: Action[];
  data_quality: {
    last_transaction_date: IsoDate | null;
    days_since_last_transaction: number | null;
    accounts_without_balance: string[];
    fx_missing: string[];
    rules_without_amount: string[];
    needs_review_count: number;
  };
};

/** Numbers travel as strings to keep cents exact; the kit only turns them into numbers to draw. */
export const toNumber = (value: Decimal | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};
