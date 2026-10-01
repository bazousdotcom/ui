import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

import overdrawn from "../fixtures/answers-overdrawn.json";
import after from "../fixtures/answers-after.json";
import before from "../fixtures/answers-before.json";
import focus from "../fixtures/answers-focus.json";
import schema from "../schema/answers.schema.json";
import { VISUAL_KINDS, answerMessages, drawVisual, shorten, type AnswerVisual, type Answers } from "../src/answers";
import { LOCALES } from "../src/i18n";
import type { Answer as RootAnswer, AnswerVisual as RootVisual, Answers as RootAnswers } from "../src";

// The answer types are reachable from the package root (a compile-time check).
export type RootTypes = [RootAnswer, RootVisual, RootAnswers];

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
// One question asked on its own (as the assistants ask it): { language: { question: answers } }.
const FOCUS = Object.fromEntries(Object.keys((focus as Record<string, object>).fr!).map((q) =>
  [`focus ${q}`, Object.fromEntries(Object.entries(focus as unknown as Record<string, Record<string, Answers>>).map(([l, byQ]) => [l, byQ[q]!]))]));
const FIXTURES = { before, after, overdrawn, ...FOCUS } as unknown as Record<string, Record<string, Answers>>;
const pictures = (answers: Answers) => answers.answers.filter((a) => a.visual).map((a) => a.visual as AnswerVisual);

describe("answers contract", () => {
  it.each(Object.entries(FIXTURES).flatMap(([name, byLang]) => LOCALES.map((l) => [name, l, byLang[l]!] as const)))(
    "fixture %s (%s) matches the schema", (_name, _locale, answers) => {
      const ok = validate(answers);
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });

  it("rejects a picture with a float amount (amounts are decimal strings)", () => {
    const answers = structuredClone(FIXTURES.before!.fr!);
    const days = answers.answers.find((a) => a.visual?.kind === "runway")!;
    (days.visual as unknown as Record<string, unknown>).due = 3000.5;
    expect(validate(answers)).toBe(false);
  });

  it("the « before » household shows every kind of picture (the « Nuit » ones when asked alone)", () => {
    const kinds = new Set([FIXTURES.before!, ...Object.values(FOCUS)].flatMap((byLang) => pictures(byLang.fr!).map((v) => v.kind)));
    expect([...kinds].sort()).toEqual([...VISUAL_KINDS].sort());
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
    const runway = pictures(FIXTURES.before!.fr!).find((v) => v.kind === "runway")!;
    expect(drawVisual(runway, "fr")!.textContent).toContain("7 factures · 6’000.00");
    expect(drawVisual(runway, "fr")!.textContent).toContain("manque 3’800.00");
    const over = pictures(FIXTURES.overdrawn!.fr!).find((v) => v.kind === "runway")!;
    const text = drawVisual(over, "fr")!.textContent;
    expect(text).toContain("4 factures · 5’250.80");
    expect(text).toContain("dispo −1’250.40");
    expect(drawVisual(over, "de")!.textContent).toContain("4 Rechnungen · 5’250.80");
    const days = pictures(FIXTURES.after!.fr!).find((v) => v.kind === "days")!;
    expect(drawVisual(days, "fr")!.textContent).toContain("18 / 90 jours");
  });

  it("a label is text, never markup, and long labels are shortened", () => {
    const visual = structuredClone(pictures(FIXTURES.before!.fr!).find((v) => v.kind === "shift")!) as Extract<AnswerVisual, { kind: "shift" }>;
    visual.move.label = '<img src=x onerror="alert(1)">';
    const svg = drawVisual(visual, "fr")!;
    expect(svg.querySelector("img")).toBeNull();
    expect(svg.textContent).toContain(shorten(visual.move.label, 24)); // as much of the name as half the picture holds
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

describe("pictures on a phone", () => {
  const all = Object.values(FIXTURES).flatMap((byLang) => pictures(byLang.fr!));
  const coords = (svg: SVGSVGElement) => [...svg.querySelectorAll("*")].flatMap((el) =>
    ["x", "x1", "x2", "cx"].map((a) => el.getAttribute(a)).filter((v): v is string => v !== null).map(Number));

  it.each([260, 281, 300, 320])("at %ipx the picture is laid out one unit per pixel, and stays inside", (width) => {
    for (const visual of all) {
      const svg = drawVisual(visual, "fr", document, { width })!;
      expect(svg.getAttribute("viewBox"), visual.kind).toBe(`0 0 ${width} 130`);
      for (const x of coords(svg)) expect(x, `${visual.kind} at ${width}px`).toBeLessThanOrEqual(width);
    }
  });

  it("narrower than 260px or wider than 320px, the picture is scaled", () => {
    const visual = all[0]!;
    expect(drawVisual(visual, "fr", document, { width: 200 })!.getAttribute("viewBox")).toBe("0 0 260 130");
    expect(drawVisual(visual, "fr", document, { width: 900 })!.getAttribute("viewBox")).toBe("0 0 320 130");
  });
});

describe("the « before » pictures", () => {
  const drawn = (kind: string, locale: "fr" | "de" = "fr") =>
    drawVisual(pictures(FIXTURES.before![locale]!).find((v) => v.kind === kind)!, locale)!.textContent;

  it("say the engine figures in the kit's words", () => {
    expect(drawn("valley")).toContain("−6’000.00 · 28.11");
    expect(drawn("horizon")).toContain("0.00 · 07.12");
    const short = pictures(FIXTURES.overdrawn!.fr!).find((v) => v.kind === "horizon")!;
    expect(drawVisual(short, "fr")!.textContent).toContain("= 2 j de charges fixes");
    expect(drawn("calendar")).toContain("Assurance voiture · 1’200.00");
    expect(drawn("calendar")).toContain("dans 61 j");
    expect(drawn("leak")).toContain("2’400.00");
    expect(drawn("leak")).toContain("10 ans");
    expect(drawn("jar")).toContain("bordereau 6’000.00");
    expect(drawn("jar")).toContain("16.44 / jour");
    expect(drawn("gauge")).toContain("reste 7’258.00");
    expect(drawn("gauge")).toContain("91 j → 31.12");
    expect(drawn("deadline")).toContain("lettre avant le 31.10");
    expect(drawn("deadline", "de")).toContain("Brief vor dem 31.10");
  });

  it("the jar shows twelve months, filled as far as the provision goes", () => {
    const visual = pictures(FIXTURES.before!.fr!).find((v) => v.kind === "jar")!;
    const svg = drawVisual(visual, "fr")!;
    expect(svg.querySelectorAll('rect[fill="none"]').length).toBe(12);
    expect(svg.querySelectorAll('rect[fill="var(--bz-accent)"]').length).toBe(0); // nothing set aside yet
  });
});

describe("the fees picture", () => {
  it("keeps its labels above or below the bars, never across them", () => {
    const leak = pictures(FIXTURES.before!.fr!).find((v) => v.kind === "leak")!;
    for (const width of [260, 320]) {
      const svg = drawVisual(leak, "fr", document, { width })!;
      const barsTop = Math.min(...[...svg.querySelectorAll("rect")].map((r) => Number(r.getAttribute("y"))));
      const barsBottom = Math.max(...[...svg.querySelectorAll("rect")].map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))));
      for (const label of svg.querySelectorAll("text")) {
        const baseline = Number(label.getAttribute("y")), size = Number(label.getAttribute("font-size"));
        const above = baseline <= barsTop - 2, below = baseline - size >= barsBottom + 2;
        expect(above || below, `« ${label.textContent} » at ${width}px`).toBe(true);
      }
    }
  });
});


describe("the « Nuit » scenes as still pictures (0.7)", () => {
  const night = (q: string, locale: "fr" | "de" = "fr") => pictures(FOCUS[`focus ${q}`]![locale]!)[0]!;
  const box = (el: Element) => ({ x: Number(el.getAttribute("x")), y: Number(el.getAttribute("y")),
    w: Number(el.getAttribute("width")), h: Number(el.getAttribute("height")) });

  it("each of the five questions asked alone has its picture", () => {
    expect(Object.keys(FOCUS).map((q) => [q, night(q.slice(6)).kind])).toEqual([
      ["focus payday-pressure", "orbit"], ["focus cost-constellation", "constellation"], ["focus balance-river", "river"],
      ["focus bill-map", "billmap"], ["focus month-wall", "wall"]]);
  });

  it("the orbit counts every bill, and says what is missing", () => {
    const o = night("payday-pressure") as Extract<AnswerVisual, { kind: "orbit" }>;
    const text = drawVisual(o, "fr")!.textContent!;
    expect(text).toContain(`${o.days.reduce((s, d) => s + d.count, 0)} factures`);
    expect(text).toMatch(/manque|reste/);
    const busiest = [...o.days].sort((a, b) => Number(b.amount) - Number(a.amount))[0]!;
    if (busiest.count > 1) expect(text, "a day of several bills is not named after one").toContain(`+${busiest.count - 1} · `);
  });

  it("the bill map tiles never overlap and stay inside, the heaviest week lit", () => {
    for (const width of [260, 320]) {
      const svg = drawVisual(night("bill-map"), "fr", document, { width })!;
      const tiles = [...svg.querySelectorAll("rect")].map(box);
      for (const [i, a] of tiles.entries()) {
        expect(a.x + a.w, "inside").toBeLessThanOrEqual(width - 7);
        expect(a.y + a.h, "inside").toBeLessThanOrEqual(130 - 7);
        for (const b of tiles.slice(i + 1))
          expect(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01).toBe(true);
      }
      expect(svg.querySelectorAll('rect[fill="var(--bz-negative)"]').length).toBeGreaterThan(0);
    }
  });

  it("river beads on the same day are stacked, never on top of each other", () => {
    const r = structuredClone(night("balance-river")) as Extract<AnswerVisual, { kind: "river" }>;
    r.causes = [0, 1, 2].map((i) => ({ date: r.series[3]![0], label: `Facture ${i + 1}`, amount: "100.00" }));
    const beads = [...drawVisual(r, "fr")!.querySelectorAll('circle[r="7"]')].map((c) => [c.getAttribute("cx"), c.getAttribute("cy")].join());
    expect(new Set(beads).size).toBe(3);
  });

  it("the wall lights the tightest month, in the household's language", () => {
    const w = night("month-wall", "de") as Extract<AnswerVisual, { kind: "wall" }>;
    const svg = drawVisual(w, "de")!;
    expect(svg.textContent).toMatch(/Okt|Oktober/);
    expect(svg.querySelectorAll('rect[fill-opacity="1"]').length).toBe(1);
  });

  it("the constellation names its brightest category with its share", () => {
    const c = night("cost-constellation") as Extract<AnswerVisual, { kind: "constellation" }>;
    expect(drawVisual(c, "fr")!.textContent).toContain(`${c.categories[0]!.category} ${Math.round(Number(c.categories[0]!.share))} %`);
  });
});

describe("labels the community saw cut or crossed (0.7)", () => {
  it("the valley's low point has a ring of the card's colour, so the curve never crosses it", () => {
    const valley = pictures(FIXTURES.before!.fr!).find((v) => v.kind === "valley")!;
    const label = [...drawVisual(valley, "fr")!.querySelectorAll("text")].find((t) => t.textContent!.includes("·"))!;
    expect(label.getAttribute("stroke")).toBe("var(--bz-surface)");
    expect(label.getAttribute("paint-order")).toBe("stroke");
  });

  it("the moved bill keeps a 20-letter name whole (« Steueramt Regensdorf »)", () => {
    const shift = structuredClone(pictures(FIXTURES.before!.fr!).find((v) => v.kind === "shift")!) as Extract<AnswerVisual, { kind: "shift" }>;
    shift.move.label = "Steueramt Regensdorf";
    expect(drawVisual(shift, "fr")!.textContent).toContain("Steueramt Regensdorf");
  });
});
