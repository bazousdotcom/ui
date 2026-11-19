import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import focus from "../fixtures/answers-focus.json";
import { RentalScene, buildScene, createT, outcomeKey, pour, remainder, rentalMessages, type WaterfallVisual } from "../src";
import type { Answers } from "../src";
import { LOCALES, type Locale } from "../src/i18n";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Léa and Sam's studio and garage in Annecy (invented), asked on its own, as the engine answers it.
const answerIn = (locale: Locale) => (focus as unknown as Record<Locale, Record<string, Answers>>)[locale]["rental-yield"]!.answers[0]!;
const answer = answerIn("fr");
const visual = answer.visual as WaterfallVisual;
const t = createT("fr", rentalMessages);
const scene = () => screen.getByRole("article");
const text = () => scene().textContent ?? "";

describe("the flow, from the engine's figures", () => {
  it("pours every unit of a source into a sink, nothing created or lost", () => {
    const flows = pour([{ key: "rent", value: 100 }, { key: "pocket", value: 20 }],
      [{ key: "costs", value: 70, cls: "" }, { key: "interest", value: 50, cls: "" }]);
    expect(flows.map((f) => [f.from, f.to, f.value])).toEqual([["rent", "costs", 70], ["rent", "interest", 30], ["pocket", "interest", 20]]);
  });

  it("the portfolio adds the sinks of every property up; what comes from the pocket is its own source", () => {
    const s = buildScene(visual, { kind: "portfolio" }, new Set(), t)!;
    const rents = s.left.filter((n) => n.drill?.kind === "property");
    expect(rents.map((n) => n.label)).toEqual(visual.properties!.map((p) => p.name));
    expect(s.left.filter((n) => !n.drill).every((n) => n.key === "pocket")).toBe(true);
    const sum = (side: { value: number }[]) => side.reduce((a, n) => a + n.value, 0);
    expect(sum(s.flows)).toBeCloseTo(sum(s.right), 6);
    expect(sum(s.left)).toBeCloseTo(sum(s.right), 6);
  });

  it("with the loan payments known, the capital repaid flows out and the year ends on the cash, loan included", () => {
    const studio = visual.properties!.find((p) => p.name === "Studio Annecy")!;
    const o = studio.outcomes[""]!;
    const s = buildScene(visual, { kind: "property", i: visual.properties!.indexOf(studio) }, new Set(), t)!;
    const r = remainder(o);
    expect(r.cash).toBe(true);
    expect(s.right.find((n) => n.key === "capital")!.value).toBeCloseTo(Number(o.net_gain) - Number(o.cash_flow_per_year), 6);
    expect(s.left.find((n) => n.key === "pocket")?.value ?? 0).toBeCloseTo(Math.max(-Number(o.cash_flow_per_year), 0), 6);
  });

  it("without the loan payments, the flow ends on the net gain, as before", () => {
    const plain = structuredClone(visual);
    for (const p of plain.properties!) for (const k of Object.keys(p.outcomes)) p.outcomes[k]!.cash_flow_per_year = null;
    const studio = plain.properties!.find((p) => p.name === "Studio Annecy")!;
    const s = buildScene(plain, { kind: "property", i: plain.properties!.indexOf(studio) }, new Set(), t)!;
    expect(s.right.some((n) => n.key === "capital")).toBe(false);
    expect(s.right.find((n) => n.key === "gain")!.value).toBe(Number(studio.outcomes[""]!.net_gain));
  });

  it("a lever picks the engine's outcome for that combination, in the order of the levers", () => {
    const studio = visual.properties!.find((p) => p.name === "Studio Annecy")!;
    expect(outcomeKey(studio.levers, new Set(["vacancy", "rent_up"]))).toBe("rent_up+vacancy");
    expect(Object.keys(studio.outcomes)).toHaveLength(2 ** studio.levers.length);
    const i = visual.properties!.indexOf(studio);
    const s = buildScene(visual, { kind: "property", i }, new Set(["rate_down"]), t)!;
    const r = remainder(studio.outcomes.rate_down!);
    expect(s.right.find((n) => n.key === "gain")?.value ?? -(s.left.find((n) => n.key === "pocket")?.value ?? 0))
      .toBeCloseTo(r.left, 6);
  });
});

describe("the scene", () => {
  it.each(LOCALES)("draws in %s with every word and no broken figure", (locale) => {
    render(<RentalScene answer={answerIn(locale) as never} locale={locale} />);
    expect(text()).not.toMatch(/NaN|undefined|⟦|null/);
    for (const el of scene().querySelectorAll("*")) for (const a of el.attributes) expect(a.value, `${el.tagName} ${a.name}`).not.toMatch(/NaN|undefined/);
  });

  it("every message exists in every language", () => {
    const keys = Object.keys(rentalMessages.fr!).sort();
    for (const l of LOCALES) expect(Object.keys(rentalMessages[l]!).sort()).toEqual(keys);
  });

  it("drills down from all the properties to one, then to its costs, and the breadcrumb rolls back up", () => {
    render(<RentalScene answer={answer as never} locale="fr" />);
    expect(screen.getByRole("heading").textContent).toBe("2 biens : 3’850 EUR de gain net par an");
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir Studio Annecy" }));
    expect(screen.getByRole("heading").textContent).toBe("Studio Annecy : te coûte 2’900 EUR par an, crédit compris");
    expect(within(screen.getByRole("navigation")).getByText("Studio Annecy").getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir Charges" }));
    expect(screen.getByRole("heading").textContent).toBe("Où partent les 2’400 EUR de charges de Studio Annecy");
    for (const line of ["Gestion locative", "Copropriété", "Taxe foncière", "Petits travaux"]) expect(text()).toContain(line);
    fireEvent.click(screen.getByRole("button", { name: "Studio Annecy" }));
    expect(screen.getByRole("heading").textContent).toContain("Studio Annecy");
    fireEvent.click(screen.getByRole("button", { name: "Tous les biens" }));
    expect(screen.getByRole("heading").textContent).toContain("2 biens");
  });

  it("a drill is a keyboard button too", () => {
    render(<RentalScene answer={answer as never} locale="fr" />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Ouvrir Garage Annecy" }), { key: "Enter" });
    expect(screen.getByRole("heading").textContent).toBe("Garage Annecy : 750 EUR de gain net par an");
  });

  it("levers show the engine's year for the combination, and « Comme l’année réelle » brings it back", () => {
    render(<RentalScene answer={answer as never} locale="fr" />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir Studio Annecy" }));
    const rate = screen.getByRole("button", { name: "Taux −0.5 pt" });
    fireEvent.click(rate);
    fireEvent.click(screen.getByRole("button", { name: "Charges −10 %" }));
    expect(rate.getAttribute("aria-pressed")).toBe("true");
    const studio = visual.properties!.find((p) => p.name === "Studio Annecy")!;
    expect(Number(studio.outcomes["costs_down+rate_down"]!.net_gain)).toBe(3940);
    expect(screen.getByRole("heading").textContent).toBe("Avec tes « et si » : te coûte 2’060 EUR par an, crédit compris");
    expect(text()).toContain("réel 2’400");   // the real year stays in view (the costs before the lever)
    fireEvent.click(screen.getByRole("button", { name: "Comme l’année réelle" }));
    expect(screen.getByRole("heading").textContent).toBe("Studio Annecy : te coûte 2’900 EUR par an, crédit compris");
    expect(text()).not.toContain("réel ");
  });

  it("rolls the unit up: per month, per 100 of rent", () => {
    render(<RentalScene answer={answer as never} locale="fr" />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir Studio Annecy" }));
    fireEvent.click(screen.getByRole("button", { name: "/ mois" }));
    expect(text()).toContain("800 EUR");   // 9’600 a year
    fireEvent.click(screen.getByRole("button", { name: "pour 100 de loyer" }));
    expect(text()).toContain("100.0");
    expect(text()).toContain("62.5");     // the capital repaid: 6’000 of 9’600
    expect(text()).not.toContain("du loyer reste");  // the year takes money from the pocket
  });

  it("flows with particles, unless motion is reduced", () => {
    const { unmount } = render(<RentalScene answer={answer as never} locale="fr" />);
    expect(scene().querySelectorAll("animateMotion").length).toBeGreaterThan(0);
    unmount();
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    render(<RentalScene answer={answer as never} locale="fr" />);
    expect(scene().querySelectorAll("animateMotion")).toHaveLength(0);
  });

  it("one property opens on it; properties in two currencies are planets, not a sum", () => {
    const one = { ...answer, visual: { ...visual, properties: visual.properties!.slice(0, 1), total: null } };
    const { unmount } = render(<RentalScene answer={one as never} locale="fr" />);
    expect(screen.queryByRole("button", { name: "Tous les biens" })).toBeNull();
    expect(screen.getByRole("heading").textContent).toContain(visual.properties![0]!.name);
    unmount();
    const mixed = { ...answer, visual: { ...visual, total: null, properties: visual.properties!.map((p, i) => (i ? { ...p, currency: "CHF" } : p)) } };
    render(<RentalScene answer={mixed as never} locale="fr" />);
    expect(scene().querySelectorAll(".bz-rs-planet")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir Studio Annecy" }));
    expect(screen.getByRole("heading").textContent).toContain("Studio Annecy");
  });

  it("asks the host to open the profile, and nothing else", () => {
    const onEdit = vi.fn();
    render(<RentalScene answer={answer as never} locale="fr" onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: "Corriger les chiffres" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
