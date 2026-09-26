import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

import overdrawn from "../fixtures/answers-overdrawn.json";
import tight from "../fixtures/answers-tight.json";
import schema from "../schema/answers.schema.json";
import { VISUAL_KINDS, answerMessages, drawVisual, shorten, type AnswerVisual, type Answers } from "../src/answers";
import { LOCALES } from "../src/i18n";

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const FIXTURES = { tight, overdrawn } as unknown as Record<string, Record<string, Answers>>;
const pictures = (answers: Answers) => answers.answers.filter((a) => a.visual).map((a) => a.visual as AnswerVisual);

describe("answers contract", () => {
  it.each(Object.entries(FIXTURES).flatMap(([name, byLang]) => LOCALES.map((l) => [name, l, byLang[l]!] as const)))(
    "fixture %s (%s) matches the schema", (_name, _locale, answers) => {
      const ok = validate(answers);
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });

  it("rejects a picture with a float amount (amounts are decimal strings)", () => {
    const answers = structuredClone(FIXTURES.tight!.fr!);
    const days = answers.answers.find((a) => a.visual?.kind === "runway")!;
    (days.visual as unknown as Record<string, unknown>).due = 561.95;
    expect(validate(answers)).toBe(false);
  });

  it("the tight month has all six kinds of picture", () => {
    expect(pictures(FIXTURES.tight!.fr!).map((v) => v.kind).sort()).toEqual([...VISUAL_KINDS].sort());
  });
});

describe("answer pictures", () => {
  const cases = Object.entries(FIXTURES).flatMap(([name, byLang]) =>
    LOCALES.flatMap((l) => pictures(byLang[l]!).map((v) => [name, l, v.kind, v] as const)));

  it.each(cases)("%s, %s: %s is drawn in full, with its caption as label", (_name, locale, _kind, visual) => {
    const svg = drawVisual(visual, locale)!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("aria-label")).toBe(visual.caption);
    expect(svg.getAttribute("viewBox")).toBe("0 0 320 130");
    const text = [...svg.querySelectorAll("text")].map((t) => t.textContent ?? "");
    expect(text.length).toBeGreaterThan(0);
    for (const t of text) expect(t).not.toMatch(/NaN|undefined|⟦|null/);
    for (const el of svg.querySelectorAll("*")) for (const a of el.attributes) expect(a.value, `${el.tagName} ${a.name}`).not.toMatch(/NaN|undefined/);
  });

  it("figures are written the Swiss way and bills are counted, not piled up", () => {
    const tightRunway = pictures(FIXTURES.tight!.fr!).find((v) => v.kind === "runway")!;
    expect(drawVisual(tightRunway, "fr")!.textContent).toContain("Leasing voiture 22.09");
    const over = pictures(FIXTURES.overdrawn!.fr!).find((v) => v.kind === "runway")!;
    const text = drawVisual(over, "fr")!.textContent;
    expect(text).toContain("4 factures · 5’250.80");
    expect(text).toContain("dispo −1’250.40");
    expect(drawVisual(over, "de")!.textContent).toContain("4 Rechnungen · 5’250.80");
    const days = pictures(FIXTURES.tight!.fr!).find((v) => v.kind === "days")!;
    expect(drawVisual(days, "fr")!.textContent).toContain("1 / 90 jours");
  });

  it("a label is text, never markup, and long labels are shortened", () => {
    const visual = structuredClone(pictures(FIXTURES.tight!.fr!).find((v) => v.kind === "shift")!) as Extract<AnswerVisual, { kind: "shift" }>;
    visual.move.label = '<img src=x onerror="alert(1)">';
    const svg = drawVisual(visual, "fr")!;
    expect(svg.querySelector("img")).toBeNull();
    expect(svg.textContent).toContain("<img src=x oner…");
    expect(shorten("Prime mensuelle d’assurance maladie")).toBe("Prime mensuelle d…");
  });

  it("a picture that cannot be drawn is simply left out", () => {
    expect(drawVisual({ kind: "valley", caption: "x" } as unknown as AnswerVisual, "fr")).toBeNull();
    expect(drawVisual({ kind: "unknown", caption: "x" } as unknown as AnswerVisual, "fr")).toBeNull();
    expect(drawVisual(undefined, "fr")).toBeNull();
  });

  it("every picture word exists in the five languages", () => {
    const keys = Object.keys(answerMessages.fr).sort();
    for (const l of LOCALES) expect(Object.keys(answerMessages[l]).sort()).toEqual(keys);
  });
});
