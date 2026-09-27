import { describe, expect, it } from "vitest";

import { createFormatters, dateSpan, money, num, shortDate, signed } from "../src/format";
import { LOCALES } from "../src/i18n";

describe("Swiss figures in every language", () => {
  it("groups thousands with ’ and uses a point for decimals", () => {
    expect(num("3420")).toBe("3’420");
    expect(num("1234567.891", 2)).toBe("1’234’567.89");
    expect(num("-2574.51")).toBe("−2’575");
    expect(num("-0.4")).toBe("0");
    expect(money("2419.58", "EUR")).toBe("2’419.58 EUR");
  });

  it("always signs margins", () => {
    expect(signed("1175")).toBe("+1’175");
    expect(signed("-1053.03")).toBe("−1’053");
    expect(signed(0)).toBe("0");
  });

  it("writes short dates as dd.MM and spans compactly", () => {
    expect(shortDate("2026-09-24")).toBe("24.09");
    expect(dateSpan("2026-10-05", "2026-10-10")).toBe("05–10");
    expect(dateSpan("2026-09-30", "2026-10-07")).toBe("30.09–07.10");
  });

  it.each(LOCALES)("formats the same number identically in %s", (locale) => {
    const f = createFormatters(locale);
    expect(f.num("3420.5", 2)).toBe("3’420.50");
    expect(f.longDate("2026-10-01").length).toBeGreaterThan(5);
  });
});

describe("calendar names do not depend on the browser", () => {
  it("writes the long date in each language", () => {
    expect(createFormatters("fr").longDate("2026-10-01")).toBe("Jeudi 1er octobre");
    expect(createFormatters("de").longDate("2026-10-01")).toBe("Donnerstag, 1. Oktober");
    expect(createFormatters("it").longDate("2026-10-01")).toBe("Giovedì 1 ottobre");
    expect(createFormatters("rm").longDate("2026-10-01")).toBe("Gievgia, 1 d’october");
    expect(createFormatters("rm").longDate("2026-09-20")).toBe("Dumengia, 20 da settember");
    expect(createFormatters("en").longDate("2026-10-01")).toBe("Thursday 1 October");
  });
  it("abbreviates weekdays", () => {
    expect(["fr", "de", "it", "rm", "en"].map((l) => createFormatters(l as never).weekday("2026-09-24"))).toEqual(["jeu.", "Do", "gio", "gie", "Thu"]);
  });
});
