import type { ComponentType } from "react";

import type { Decimal, IsoDate, Snapshot } from "../contract/snapshot";
import type { Formatters } from "../format";
import type { Catalog, Locale, Translate } from "../i18n";

/**
 * What a module may ask the host to do. Modules never call the network: they emit
 * an intent, the app executes it with the user's credentials and sends a fresh snapshot.
 */
export type ModuleAction =
  | { type: "mark_paid"; ref_id: string }
  | { type: "reschedule"; ref_id: string; date: IsoDate }
  | { type: "classify_transaction"; ref_id: string; internal_transfer: boolean }
  | { type: "review_obligation"; ref_id: string; decision: "accept" | "cancel" }
  | { type: "open"; target: "recurrences" | "balances" | "import" | "capture" | "obligations" }
  | { type: "set_horizon"; horizon: Horizon }
  | {
      type: "save_scenario";
      name: string;
      levers: { id: string; kind: "split" | "defer" | "reserve"; label: string; ref_id: string | null; target: IsoDate; amount: Decimal }[];
      low_before: Decimal;
      low_after: Decimal;
    };

export type Horizon = "7" | "30" | "cycles" | "90";

/** Where a module sits in the page grid. */
export type ModuleSize = "tile" | "narrow" | "wide" | "full";

export type ModuleContext = {
  locale: Locale;
  /** Horizon the snapshot was computed for (the host refetches when it changes). */
  horizon: Horizon;
};

export type ViewProps<Model> = {
  model: Model;
  t: Translate;
  fmt: Formatters;
  ctx: ModuleContext;
  onAction: (action: ModuleAction) => void;
};

export type QuestionModule<Model = unknown> = {
  /** Stable kebab-case id: it is part of the public API. */
  id: string;
  /** The money question this module answers, in the five languages. */
  question: Record<Locale, string>;
  size: ModuleSize;
  /** Contract fields the module reads; the host can check them before rendering. */
  reads: readonly (keyof Snapshot)[];
  messages: Catalog;
  /**
   * Pure and deterministic: same snapshot, same model. Returns `null` when the
   * snapshot does not contain enough to answer (the host shows an empty state).
   * It selects and shapes numbers the engine already computed; it never forecasts.
   */
  select: (snapshot: Snapshot, ctx: ModuleContext) => Model | null;
  View: ComponentType<ViewProps<Model>>;
};

/** Identity helper that keeps the Model type flowing from `select` to `View`. */
export function defineModule<Model>(module: QuestionModule<Model>): QuestionModule<Model> {
  return module;
}
