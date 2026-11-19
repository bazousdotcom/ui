import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import focus from "../fixtures/answers-focus.json";
import calendarFixture from "../fixtures/rental-calendar.json";
import { RentalScene, buildScene, buildTimeScene, createT, monthCash, monthName, outcomeKey, pour, remainder, rentalMessages, todayLevel, type RentalCalendar, type WaterfallVisual } from "../src";
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

// The same studio with its next 24 months, as the engine computes them (invented: copro quarterly, tax in October).
const cal = calendarFixture as unknown as RentalCalendar;
const withCalendar = () => {
  const v = structuredClone(visual);
  v.properties![0]!.calendar = cal;
  return { ...answer, visual: { ...v, properties: v.properties!.slice(0, 1), total: null } };
};
const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;

describe("the months (kit 0.9)", () => {
  it("a month is the engine's month: what comes in equals what goes out, the pocket closes the gap", () => {
    const sum = (side: { value: number }[]) => side.reduce((a, n) => a + n.value, 0);
    for (const month of [0, 1, 3, 12, 24]) for (const rent of [0, todayLevel(cal), cal.grid.length - 1]) for (const vacant of [false, true]) {
      const s = buildTimeScene(cal, { month, rent, vacant }, t);
      expect(sum(s.left)).toBeCloseTo(sum(s.right), 1);
      expect(sum(s.flows)).toBeCloseTo(sum(s.right), 1);
      const cash = monthCash(cal, { month, rent, vacant });
      expect(s.left.find((n) => n.key === "pocket")!.value).toBeCloseTo(Math.max(-cash, 0), 6);
      expect(s.right.find((n) => n.key === "gain")!.value).toBeCloseTo(Math.max(cash, 0), 6);
    }
  });

  it("every node stays in every month, at zero when the line is not paid, so the months glide", () => {
    const keys = (m: number) => buildTimeScene(cal, { month: m, rent: todayLevel(cal), vacant: false }, t).right.map((n) => n.key);
    expect(keys(1)).toEqual(keys(3));
    const nov = buildTimeScene(cal, { month: 1, rent: todayLevel(cal), vacant: false }, t);
    expect(nov.right.find((n) => n.label === "Copropriété")!.value).toBe(0);
    const jan = buildTimeScene(cal, { month: 3, rent: todayLevel(cal), vacant: false }, t);
    expect(jan.right.find((n) => n.label === "Copropriété")!.value).toBe(225);
    expect(jan.right.find((n) => n.label === "Gestion locative")!.estimated).toBe(true);
  });

  it("today's rent is one of the engine's levels; no tenant empties the rent and the provisions", () => {
    expect(cal.grid[todayLevel(cal)]!.rent).toBe(cal.rent);
    const s = buildTimeScene(cal, { month: 3, rent: todayLevel(cal), vacant: true }, t);
    expect(s.left.find((n) => n.key === "rent")!.value).toBe(0);
    expect(s.left.find((n) => n.key === "pocket")!.value).toBe(-Number(cal.months[2]!.vacant));
  });

  it("writes the month as the locale does", () => {
    expect(monthName("2027-01", "fr")).toBe("janvier 2027");
    expect(monthName("2027-01", "en")).toBe("January 2027");
  });

  it("opens on the average month, walks the months and the rent levels, and empties the flat", () => {
    // Reduced motion: each step lands at once (otherwise the nodes glide over 650 ms).
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    render(<RentalScene answer={withCalendar() as never} locale="fr" />);
    // −241.67 a month on average (−2’900 a year), the same as the yearly scene, now month by month.
    expect(cal.grid[todayLevel(cal)]!.average).toBe("-241.67");
    expect(screen.getByRole("heading").textContent).toBe("Studio Annecy, un mois moyen : 242 EUR sortent de ta poche, crédit compris");
    expect(text()).toContain("−241.67 EUR");
    expect(screen.queryByRole("button", { name: "Taux −0.5 pt" })).toBeNull();   // the calendar replaces the yearly levers
    fireEvent.change(slider("Mois"), { target: { value: "3" } });
    expect(screen.getByRole("heading").textContent).toContain("Studio Annecy, janvier 2027 :");
    expect(text()).toContain("Copropriété");
    expect(text()).toContain("vient de ton salaire");
    expect(scene().querySelectorAll(".bz-rs-hatch").length).toBeGreaterThan(0);
    // The rent cursor at its highest level: the month leaves money in the pocket, on the right, in green.
    fireEvent.change(slider("Loyer hors charges"), { target: { value: String(cal.grid.length - 1) } });
    expect(screen.getByRole("heading").textContent).toContain("dans ta poche");
    expect(text()).toContain("Dans ta poche");
    fireEvent.click(screen.getByRole("button", { name: "Loyer actuel" }));
    expect(slider("Loyer hors charges").value).toBe(String(todayLevel(cal)));
    fireEvent.click(screen.getByRole("button", { name: "Sans locataire" }));
    expect(screen.getByRole("heading").textContent).toContain("janvier 2027, sans locataire");
    expect(slider("Loyer hors charges").disabled).toBe(true);
  });

  it("marks the breakeven and the target on the rent cursor, and shows them in the facts", () => {
    render(<RentalScene answer={withCalendar() as never} locale="fr" />);
    expect(scene().querySelector(".bz-rs-mark-breakeven")).not.toBeNull();
    expect(scene().querySelector(".bz-rs-mark-target")).not.toBeNull();
    expect(text()).toContain("941.67 EUR");
    expect(text()).toContain("objectif 100 / mois : 1’041.67 EUR");
  });

  it("plays the months one after the other and stops on the last", () => {
    vi.useFakeTimers();
    try {
      render(<RentalScene answer={withCalendar() as never} locale="fr" />);
      fireEvent.click(screen.getByRole("button", { name: "Faire défiler les mois" }));
      act(() => { vi.advanceTimersByTime(300); });
      expect(slider("Mois").value).toBe("1");
      act(() => { vi.advanceTimersByTime(1100); });
      expect(slider("Mois").value).toBe("2");
      for (let i = 0; i < 30; i++) act(() => { vi.advanceTimersByTime(1100); });
      expect(slider("Mois").value).toBe(String(cal.months.length));
      expect(screen.getByRole("button", { name: "Faire défiler les mois" }).getAttribute("aria-pressed")).toBe("false");
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(LOCALES)("draws the months in %s with no broken figure", (locale) => {
    const a = withCalendar();
    render(<RentalScene answer={{ ...a, visual: { ...a.visual } } as never} locale={locale} />);
    fireEvent.change(screen.getAllByRole("slider")[0]!, { target: { value: "3" } });
    expect(text()).not.toMatch(/NaN|undefined|⟦|null/);
    for (const el of scene().querySelectorAll("*")) for (const at of el.attributes) expect(at.value, `${el.tagName} ${at.name}`).not.toMatch(/NaN|undefined/);
  });
});
