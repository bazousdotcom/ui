import "./styles/bazous.css";

export type * from "./contract/snapshot";
export { toNumber } from "./contract/snapshot";
export { LOCALES, LOCALE_NAMES, LOCALE_TAGS, createT, isLocale, pickLocale } from "./i18n";
export type { Catalog, Locale, Messages, Translate, Vars } from "./i18n";
export { shared as sharedMessages } from "./i18n/shared";
export * from "./format";
export * from "./primitives";
export { CashflowChart, niceTicks } from "./primitives/CashflowChart";
export { baseSeries, buildLevers, computeSeries } from "./engine/scenario";
export type { Lever, Series, SeriesPoint } from "./engine/scenario";
export { defineModule } from "./modules/types";
export type { Horizon, ModuleAction, ModuleContext, ModuleSize, QuestionModule, ViewProps } from "./modules/types";
export { MODULES, findModule } from "./modules/registry";
export { Dashboard, Question } from "./modules/Question";
export type { DashboardProps, QuestionProps } from "./modules/Question";
// `export type *` is not carried through a second `export *`: the answer types are re-exported by name.
export type * from "./answers/contract";
export * from "./answers";
export { AnswerPicture } from "./answers/AnswerPicture";
export type { AnswerPictureProps } from "./answers/AnswerPicture";
