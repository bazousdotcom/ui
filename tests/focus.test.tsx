import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import after from "../fixtures/after.json";
import before from "../fixtures/before.json";
import demo from "../fixtures/demo.json";
import type { Snapshot } from "../src";
import { toNumber } from "../src/contract/snapshot";
import { baseSeries, eventKey, replayMoves } from "../src/engine/scenario";
import { Dashboard } from "../src/modules/Question";
import { MODULES, findModule } from "../src/modules/registry";
import { NO_FOCUS, type Focus } from "../src/modules/types";

afterEach(cleanup);

const s = before as Snapshot;
const ctx = (focus: Partial<Focus> = {}) => ({ locale: "fr" as const, horizon: "cycles" as const, focus: { ...NO_FOCUS, ...focus } });
const select = (id: string, focus: Partial<Focus> = {}, snap: Snapshot = s) => findModule(id)!.select(snap, ctx(focus)) as any;
// Léa and Sam « Avant »: the crèche (1’800, 20.10) is the bill to move to the 30.10 payday.
const creche = s.events.find((e) => e.label === "Crèche" && e.date === "2026-10-20")!;
const moveCreche = { [eventKey(creche)]: "2026-10-30" };

describe("what-if replay", () => {
  it.each([["demo", demo], ["before", before], ["after", after]] as const)("%s: with nothing moved it is the engine's curve", (_n, f) => {
    const snap = f as Snapshot;
    expect(replayMoves(snap, {}).points).toEqual(baseSeries(snap).points);
  });

  it("moving a bill inside the horizon changes when money goes, not how much", () => {
    const moved = replayMoves(s, moveCreche);
    expect(moved.end.balance).toBeCloseTo(toNumber(s.end_of_horizon.balance), 2);
    const on = (date: string) => moved.points.find((p) => p.date === date)!.balance;
    expect(on("2026-10-20")).toBe(-1300);   // the crèche no longer falls on the 20th
    expect(on("2026-10-30")).toBe(2200);    // it is paid with the salary instead
  });
});

describe("the scenes follow the what-if", () => {
  it("payday-pressure: the bill moved past payday leaves the amount due, and the gap shrinks by exactly as much", () => {
    const now = select("payday-pressure");
    expect(now.gap).toBe(toNumber(s.gap_before_next_income));
    const moved = select("payday-pressure", { moved: moveCreche });
    expect(moved.due).toBe(now.due - 1800);
    expect(moved.gap).toBe(-2000);
    expect(moved.baseGap).toBe(-3800);
    expect(moved.planets.find((p: any) => p.label === "Crèche").movedTo).toBe("2026-10-30");
  });

  it("balance-river: the dip before payday rises, the November low point does not, and the old river stays as a ghost", () => {
    const m = select("balance-river", { moved: moveCreche });
    expect(m.ghost).not.toBeNull();
    expect([m.basePreLow, m.preLow]).toEqual([-3800, -2000]);
    expect(m.low).toEqual({ date: "2026-11-28", balance: -6000 });
  });

  it("month-wall: a moved month still adds up (in − out = change in balance)", () => {
    const m = select("month-wall", { moved: moveCreche });
    for (const month of m.months) expect(month.in - month.out, month.key).toBeCloseTo(month.end - month.start, 2);
    const october = m.months.find((x: any) => x.key === "2026-10");
    expect(october.low.balance).toBe(-2000);
  });
});

describe("the scenes follow the focus", () => {
  it("balance-river: a category keeps only its bills among the causes", () => {
    const m = select("balance-river", { category: "Santé" });
    expect(m.causes.length).toBeGreaterThan(0);
    for (const c of m.causes) expect(c.category).toBe("Santé");
  });

  it("bill-map: a bill opens every occurrence with the payday it could move to", () => {
    const m = select("bill-map", { bill: "Crèche" });
    expect(m.drill.items.map((i: any) => [i.date, i.payday])).toEqual([["2026-10-20", "2026-10-30"], ["2026-11-20", "2026-11-30"]]);
    expect(m.drill.category).toBe("Enfants");
    expect(m.bills.filter((b: any) => b.focus).every((b: any) => b.label === "Crèche")).toBe(true);
  });

  it("month-wall: the chosen month is marked", () => {
    expect(select("month-wall", { month: "2026-11" }).selected).toBe("2026-11");
  });
});

describe("a dashboard shares one focus between its scenes", () => {
  it("choosing a month, opening a bill and moving it updates every scene, and « Tout effacer » undoes it", () => {
    const { container } = render(<Dashboard modules={MODULES} snapshot={s} locale="fr" />);
    const bar = () => container.querySelector(".bz-focus");
    expect(bar()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Éclairer Novembre" }));
    expect(bar()!.textContent).toContain("Mois : Novembre");
    expect(container.querySelector('[data-module="balance-river"] .bz-n-dim')).not.toBeNull();

    fireEvent.click(within(container.querySelector('[data-module="balance-river"]') as HTMLElement).getAllByRole("button", { name: "Voir Crèche" })[0]!);
    expect(bar()!.textContent).toContain("Facture : Crèche");
    fireEvent.click(screen.getByRole("button", { name: "Et si je la paie le 30.10 ?" }));
    expect(bar()!.textContent).toContain("Et si : Crèche 20.10 → 30.10");
    const orbit = container.querySelector('[data-module="payday-pressure"]')!;
    expect(orbit.textContent).toContain("Il manque 2’000 CHF");
    expect(orbit.textContent).toContain("était −3’800");

    fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
    expect(bar()).toBeNull();
    expect(container.querySelector('[data-module="payday-pressure"]')!.textContent).toContain("Il manque 3’800 CHF");
  });

  it("every intent still reaches the host", () => {
    const seen: string[] = [];
    render(<Dashboard modules={MODULES} snapshot={s} locale="fr" onAction={(a) => seen.push(a.type)} />);
    fireEvent.click(screen.getByRole("button", { name: "Éclairer Octobre" }));
    expect(seen).toContain("focus");
  });
});
