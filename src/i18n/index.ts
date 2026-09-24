/**
 * Five languages, one rule: every key exists in every language (a test enforces it).
 *
 * Messages are plain strings with `{name}` placeholders. A key may have plural
 * forms written as `key.one` / `key.other`; `t(key, { n })` picks the right one.
 */

export const LOCALES = ["fr", "de", "it", "rm", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  rm: "Rumantsch",
  en: "English",
};

/** BCP 47 tags used for calendar names. Numbers do not use Intl (see format/). */
export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-CH",
  de: "de-CH",
  it: "it-CH",
  rm: "rm-CH",
  en: "en-CH",
};

export type Messages = Record<string, string>;
export type Catalog = Record<Locale, Messages>;
export type Vars = Record<string, string | number>;
export type Translate = (key: string, vars?: Vars) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Pick a locale from a list of preferences (e.g. `navigator.languages`), French by default. */
export function pickLocale(preferences: readonly string[] | undefined, fallback: Locale = "fr"): Locale {
  for (const pref of preferences ?? []) {
    const base = pref.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return fallback;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Build `t` over one or more catalogs; later catalogs win (a module can override a shared key).
 * A missing key renders as `⟦key⟧` so it is visible in review instead of silently blank.
 */
export function createT(locale: Locale, ...catalogs: Catalog[]): Translate {
  const merged: Messages = Object.assign({}, ...catalogs.map((c) => c[locale]));
  const plurals = new Intl.PluralRules(LOCALE_TAGS[locale]);
  return (key, vars) => {
    if (vars && typeof vars.n === "number") {
      const form = `${key}.${plurals.select(vars.n)}`;
      const fallback = `${key}.other`;
      const template = merged[form] ?? merged[fallback];
      if (template !== undefined) return interpolate(template, vars);
    }
    const template = merged[key];
    return template === undefined ? `⟦${key}⟧` : interpolate(template, vars);
  };
}

/** The keys a catalog defines in one language, plural forms folded (`a.one`, `a.other` → `a`). */
export function catalogKeys(catalog: Catalog, locale: Locale): string[] {
  return Object.keys(catalog[locale]).sort();
}
