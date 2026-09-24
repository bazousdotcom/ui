import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import tight from "../fixtures/tight.json";
import type { Snapshot } from "../src";
import { LOCALES, createT, pickLocale } from "../src/i18n";
import { shared } from "../src/i18n/shared";
import { MODULES } from "../src/modules/registry";
import { Question } from "../src/modules/Question";

const catalogs = [["shared", shared], ...MODULES.map((m) => [m.id, m.messages] as const)] as const;

describe("five languages, same keys", () => {
  it.each(catalogs)("%s has the same keys in every language", (_id, catalog) => {
    const reference = Object.keys(catalog.fr).sort();
    for (const locale of LOCALES) expect(Object.keys(catalog[locale]).sort(), locale).toEqual(reference);
  });

  it.each(MODULES.map((m) => [m.id, m] as const))("%s states its question in every language", (_id, m) => {
    for (const locale of LOCALES) expect(m.question[locale].trim().length, locale).toBeGreaterThan(3);
  });

  it("plural forms and placeholders", () => {
    const t = createT("de", shared);
    expect(t("inDays", { n: 1 })).toBe("In 1 Tag");
    expect(t("inDays", { n: 12 })).toBe("In 12 Tagen");
    expect(t("nope")).toBe("⟦nope⟧");
  });

  it("picks a supported language from browser preferences", () => {
    expect(pickLocale(["rm-CH", "de"])).toBe("rm");
    expect(pickLocale(["es-ES"])).toBe("fr");
  });
});

const fixtures: [string, Snapshot][] = [["demo", demo as Snapshot], ["tight", tight as Snapshot], ["empty", empty as Snapshot]];

describe("every module renders in every language without a missing key", () => {
  for (const [name, snapshot] of fixtures) {
    for (const m of MODULES) {
      it.each(LOCALES)(`${m.id} · ${name} · %s`, (locale) => {
        const { container, unmount } = render(<div className="bz"><Question module={m} snapshot={snapshot} locale={locale} /></div>);
        expect(container.textContent).not.toContain("⟦");
        expect(container.textContent).not.toContain("NaN");
        expect(container.textContent).not.toContain("undefined");
        unmount();
      });
    }
  }
});
