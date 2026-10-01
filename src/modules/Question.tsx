import { useCallback, useMemo, useState } from "react";

import type { Snapshot } from "../contract/snapshot";
import { eventKey } from "../engine/scenario";
import { createFormatters, type Formatters } from "../format";
import { createT, type Locale, type Translate } from "../i18n";
import { shared } from "../i18n/shared";
import { Card, Empty } from "../primitives";
import { NO_FOCUS, type Focus, type Horizon, type ModuleAction, type QuestionModule } from "./types";

export type QuestionProps = {
  module: QuestionModule<any>;
  snapshot: Snapshot;
  locale: Locale;
  horizon?: Horizon;
  /** What the person is looking at, shared with the other modules (see `Focus`). */
  focus?: Focus;
  onAction?: (action: ModuleAction) => void;
};

/** Render one module: select its model, build its translations, show an empty state when it cannot answer. */
export function Question({ module, snapshot, locale, horizon = "cycles", focus = NO_FOCUS, onAction = () => {} }: QuestionProps) {
  const ctx = useMemo(() => ({ locale, horizon, focus }), [locale, horizon, focus]);
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

/**
 * The cockpit grid: tiles in a row of four, then wide/narrow/full modules on a three-column grid.
 * It keeps the shared focus: a module's `focus` intent narrows every module at once, and the
 * focus bar above the grid says what is shown and undoes it. Every intent still reaches the host.
 */
export function Dashboard({ modules, theme = "dark", onAction, ...rest }: DashboardProps) {
  const [focus, setFocus] = useState<Focus>(NO_FOCUS);
  const act = useCallback((a: ModuleAction) => {
    if (a.type === "focus") setFocus((f) => ({ ...f, ...a.focus }));
    onAction?.(a);
  }, [onAction]);
  const tiles = modules.filter((m) => m.size === "tile");
  const others = modules.filter((m) => m.size !== "tile");
  const t = useMemo(() => createT(rest.locale, shared), [rest.locale]);
  const fmt = useMemo(() => createFormatters(rest.locale), [rest.locale]);
  return (
    <div className="bz" data-theme={theme}>
      {tiles.length > 0 && (
        <section className="bz-tiles">
          {tiles.map((m) => <Question key={m.id} module={m} {...rest} focus={focus} onAction={act} />)}
        </section>
      )}
      <FocusBar focus={focus} snapshot={rest.snapshot} t={t} fmt={fmt} onAction={act} />
      <section className="bz-grid">
        {others.map((m) => (
          <div key={m.id} className={`bz-slot bz-slot-${m.size}`} data-module={m.id}>
            <Question module={m} {...rest} focus={focus} onAction={act} />
          </div>
        ))}
      </section>
    </div>
  );
}

/** What every module is narrowed to, each piece removable, and the what-if moves. */
export function FocusBar({ focus, snapshot, t, fmt, onAction }: {
  focus: Focus; snapshot: Snapshot; t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void;
}) {
  const parts: { key: string; text: string; clear: Partial<Focus>; whatIf?: boolean }[] = [];
  if (focus.month) parts.push({ key: "month", text: t("focus.month", { month: fmt.month(`${focus.month}-01`) }), clear: { month: null } });
  if (focus.category) parts.push({ key: "category", text: t("focus.category", { category: focus.category }), clear: { category: null } });
  if (focus.bill) parts.push({ key: "bill", text: t("focus.bill", { bill: focus.bill }), clear: { bill: null } });
  for (const [key, to] of Object.entries(focus.moved)) {
    const e = snapshot.events.find((ev) => eventKey(ev) === key);
    if (!e || to === e.date) continue;
    const { [key]: _gone, ...rest } = focus.moved;
    parts.push({ key: `moved:${key}`, text: t("focus.moved", { bill: e.label, from: fmt.shortDate(e.date), to: fmt.shortDate(to) }), clear: { moved: rest }, whatIf: true });
  }
  if (parts.length === 0) return null;
  return (
    <nav className="bz-focus" aria-label={t("focus.label")}>
      <span className="bz-focus-label">{t("focus.label")}</span>
      {parts.map((p) => (
        <span key={p.key} className={`bz-focus-chip${p.whatIf ? " bz-focus-whatif" : ""}`}>
          {p.text}
          <button type="button" aria-label={t("focus.remove", { what: p.text })} onClick={() => onAction({ type: "focus", focus: p.clear })}>×</button>
        </span>
      ))}
      <button type="button" className="bz-button bz-ghost" onClick={() => onAction({ type: "focus", focus: NO_FOCUS })}>{t("focus.clear")}</button>
      {Object.keys(focus.moved).length > 0 && <span className="bz-note">{t("focus.note")}</span>}
    </nav>
  );
}
