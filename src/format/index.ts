import type { Decimal, IsoDate } from "../contract/snapshot";
import { toNumber } from "../contract/snapshot";
import type { Locale } from "../i18n";

/**
 * Swiss figures in every language: 3’420.50 — typographic apostrophe for thousands,
 * point for decimals, true minus sign. Browsers disagree on fr-CH / it-CH grouping
 * (narrow space, none under 10’000, comma decimals), so numbers never go through Intl.
 */
export const THOUSANDS = "’";
export const MINUS = "−";

export function num(value: Decimal | number | null | undefined, digits = 0): string {
  const n = toNumber(value);
  const fixed = Math.abs(n).toFixed(digits);
  const [int = "0", frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
  const body = frac ? `${grouped}.${frac}` : grouped;
  const rounded = Number(fixed);
  return n < 0 && rounded !== 0 ? `${MINUS}${body}` : body;
}

/** Always shows the sign: +1’175, −1’053, 0. */
export function signed(value: Decimal | number | null | undefined, digits = 0): string {
  const n = toNumber(value);
  const body = num(Math.abs(n), digits);
  if (Number(Math.abs(n).toFixed(digits)) === 0) return body;
  return n < 0 ? `${MINUS}${body}` : `+${body}`;
}

/** Amount with its ISO code after it: 2’419.58 EUR. */
export function money(value: Decimal | number | null | undefined, currency: string, digits = 2): string {
  return `${num(value, digits)} ${currency}`;
}

export function parseDate(iso: IsoDate): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isoDate(date: Date): IsoDate {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

/** 24.09 — the Swiss short date, identical in all five languages. */
export function shortDate(iso: IsoDate | null | undefined): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}`;
}

/** "05–10" inside one month, "30.09–07.10" across two. */
export function dateSpan(from: IsoDate, to: IsoDate): string {
  if (from === to) return shortDate(from);
  const [, ma, da] = from.split("-");
  const [, mb, db] = to.split("-");
  return ma === mb ? `${da}–${db}` : `${da}.${ma}–${db}.${mb}`;
}

export type Formatters = {
  locale: Locale;
  num: typeof num;
  signed: typeof signed;
  money: typeof money;
  shortDate: typeof shortDate;
  dateSpan: typeof dateSpan;
  /** "jeudi 1 octobre", "Donnerstag, 1. Oktober"… */
  longDate: (iso: IsoDate) => string;
  /** "jeu.", "Do", "gio"… */
  weekday: (iso: IsoDate) => string;
};

/**
 * Calendar names are written out here rather than taken from Intl: browsers ship
 * uneven data for Romansh (Chromium falls back to English), and the cockpit header
 * must read the same everywhere.
 */
const WEEKDAYS: Record<Locale, { short: string[]; long: string[] }> = {
  fr: { short: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."], long: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] },
  de: { short: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], long: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] },
  it: { short: ["dom", "lun", "mar", "mer", "gio", "ven", "sab"], long: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] },
  rm: { short: ["du", "gli", "ma", "me", "gie", "ve", "so"], long: ["dumengia", "glindesdi", "mardi", "mesemna", "gievgia", "venderdi", "sonda"] },
  en: { short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
};
const MONTHS: Record<Locale, string[]> = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  rm: ["schaner", "favrer", "mars", "avrigl", "matg", "zercladur", "fanadur", "avust", "settember", "october", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function writeLongDate(locale: Locale, date: Date): string {
  const wd = WEEKDAYS[locale].long[date.getDay()] ?? "";
  const month = MONTHS[locale][date.getMonth()] ?? "";
  const d = date.getDate();
  switch (locale) {
    case "fr":
      return `${wd} ${d === 1 ? "1er" : d} ${month}`;
    case "de":
      return `${wd}, ${d}. ${month}`;
    case "it":
      return `${wd} ${d} ${month}`;
    case "rm":
      return `${wd}, ${d} ${/^[aeiou]/.test(month) ? "d’" : "da "}${month}`;
    case "en":
      return `${wd} ${d} ${month}`;
  }
}

export function createFormatters(locale: Locale): Formatters {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    locale,
    num,
    signed,
    money,
    shortDate,
    dateSpan,
    longDate: (iso) => cap(writeLongDate(locale, parseDate(iso))),
    weekday: (iso) => WEEKDAYS[locale].short[parseDate(iso).getDay()] ?? "",
  };
}

export type Tone = "neg" | "pos" | "flat";
export function tone(value: Decimal | number | null | undefined): Tone {
  const n = toNumber(value);
  return n < 0 ? "neg" : n > 0 ? "pos" : "flat";
}
