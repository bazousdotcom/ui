import { useMemo } from "react";

import type { Snapshot } from "../contract/snapshot";
import { createFormatters } from "../format";
import { createT, type Locale } from "../i18n";
import { shared } from "../i18n/shared";
import { Card, Empty } from "../primitives";
import type { Horizon, ModuleAction, QuestionModule } from "./types";

export type QuestionProps = {
  module: QuestionModule<any>;
  snapshot: Snapshot;
  locale: Locale;
  horizon?: Horizon;
  onAction?: (action: ModuleAction) => void;
};

/** Render one module: select its model, build its translations, show an empty state when it cannot answer. */
export function Question({ module, snapshot, locale, horizon = "cycles", onAction = () => {} }: QuestionProps) {
  const ctx = useMemo(() => ({ locale, horizon }), [locale, horizon]);
  const t = useMemo(
    () =>
      createT(locale, shared, module.messages, {
        fr: { question: module.question.fr },
        de: { question: module.question.de },
        it: { question: module.question.it },
        rm: { question: module.question.rm },
        en: { question: module.question.en },
      }),
    [locale, module],
  );
  const fmt = useMemo(() => createFormatters(locale), [locale]);
  const model = useMemo(() => module.select(snapshot, ctx), [module, snapshot, ctx]);
  if (model === null) {
    return (
      <Card question={t("question")}>
        <Empty>{t("notEnough")}</Empty>
      </Card>
    );
  }
  const View = module.View;
  return <View model={model} t={t} fmt={fmt} ctx={ctx} onAction={onAction} />;
}

export type DashboardProps = Omit<QuestionProps, "module"> & {
  modules: readonly QuestionModule<any>[];
  theme?: "dark" | "light";
};

/** The cockpit grid: tiles in a row of four, then wide/narrow/full modules on a three-column grid. */
export function Dashboard({ modules, theme = "dark", ...rest }: DashboardProps) {
  const tiles = modules.filter((m) => m.size === "tile");
  const others = modules.filter((m) => m.size !== "tile");
  return (
    <div className="bz" data-theme={theme}>
      {tiles.length > 0 && (
        <section className="bz-tiles">
          {tiles.map((m) => <Question key={m.id} module={m} {...rest} />)}
        </section>
      )}
      <section className="bz-grid">
        {others.map((m) => (
          <div key={m.id} className={`bz-slot bz-slot-${m.size}`} data-module={m.id}>
            <Question module={m} {...rest} />
          </div>
        ))}
      </section>
    </div>
  );
}
