import { describe, expect, it } from "vitest";

import after from "../fixtures/after.json";
import before from "../fixtures/before.json";
import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import type { Snapshot } from "../src";
import { toNumber } from "../src/contract/snapshot";
import { findModule } from "../src/modules/registry";

const ctx = { locale: "fr" as const, horizon: "cycles" as const };
const households: [string, Snapshot][] = [["demo", demo as Snapshot], ["before", before as Snapshot], ["after", after as Snapshot]];
const select = (id: string, s: Snapshot) => findModule(id)!.select(s, ctx) as any;

describe("the community's picture modules only reshape the engine's figures", () => {
  it.each(households)("month-wall · %s: each month's in − out is exactly the engine's change in balance", (_n, s) => {
    const model = select("month-wall", s);
    for (const m of model.months) expect(m.in - m.out, m.key).toBeCloseTo(m.end - m.start, 2);
    expect(model.months.at(-1).end).toBeCloseTo(toNumber(s.end_of_horizon.balance), 2);
    expect(Math.min(...model.months.map((m: any) => m.low.balance))).toBeCloseTo(Math.min(toNumber(s.opening_balance), toNumber(s.low_point.balance)), 2);
  });

  it("month-wall: a month that dips below zero says so, a month that ends higher breathes", () => {
    const states = select("month-wall", before as Snapshot).months.map((m: any) => [m.key, m.state, Math.round(m.low.balance)]);
    expect(states.some(([, state, low]: [string, string, number]) => state === "under" && low < 0)).toBe(true);
    const calm = select("month-wall", after as Snapshot);
    expect(calm.hardest.low.balance).toBeGreaterThanOrEqual(0);
  });

  it.each(households)("balance-river · %s: the numbered causes are the largest outflows up to the low point", (_n, s) => {
    const model = select("balance-river", s);
    const until = model.descends ? s.low_point.date : s.horizon_end;
    const outflows = s.events.filter((e) => e.direction === "outflow" && e.date >= s.as_of && e.date <= until).map((e) => toNumber(e.amount));
    expect(model.outToLow).toBeCloseTo(outflows.reduce((a, b) => a + b, 0), 2);
    const top = [...outflows].sort((a, b) => b - a).slice(0, model.causes.length);
    expect(model.causes.map((c: any) => c.amount).sort((a: number, b: number) => b - a)).toEqual(top);
    expect(model.share).toBeCloseTo(top.reduce((a, b) => a + b, 0) / model.outToLow * 100, 6);
    for (const c of model.causes) expect(c.date <= until).toBe(true);
  });

  it("balance-river: the overdraft household sinks to the engine's low point", () => {
    const model = select("balance-river", before as Snapshot);
    expect(model.descends).toBe(true);
    expect(model.low.balance).toBe(-6000);
    expect(model.points.at(-1).balance).toBeCloseTo(toNumber((before as Snapshot).end_of_horizon.balance), 2);
  });

  it.each(households)("bill-map · %s: the heaviest week is really the heaviest", (_n, s) => {
    const model = select("bill-map", s);
    const total = model.bills.reduce((a: number, b: any) => a + b.amount, 0);
    expect(model.total).toBeCloseTo(total, 2);
    // Brute force over every seven-day window of the horizon.
    const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
    let best = 0;
    for (let d = day(s.as_of); d <= day(s.horizon_end); d++) {
      best = Math.max(best, model.bills.filter((b: any) => day(b.date) >= d && day(b.date) <= d + 6).reduce((a: number, b: any) => a + b.amount, 0));
    }
    expect(model.week.amount).toBeCloseTo(best, 2);
  });

  it("bill-map: a bill in euros is drawn apart, and its base amount is the engine's conversion", () => {
    const model = select("bill-map", demo as Snapshot);
    expect(model.foreign).toEqual(["EUR"]);
    const eur = (demo as Snapshot).events.find((e) => e.currency === "EUR" && e.direction === "outflow")!;
    const bill = model.bills.find((b: any) => b.label === eur.label && b.date === eur.date);
    expect(bill.foreign).toBe(true);
    expect(bill.amount).toBe(toNumber(eur.amount));
    expect(bill.original).toBe(toNumber(eur.original_amount));
  });

  it("bill-map: the categories add up to the categorised bills, largest first", () => {
    const model = select("bill-map", before as Snapshot);
    const sum = model.categories.reduce((a: number, c: any) => a + c.amount, 0);
    expect(sum).toBeCloseTo(model.bills.filter((b: any) => b.category).reduce((a: number, b: any) => a + b.amount, 0), 2);
    expect(model.categories.map((c: any) => c.amount)).toEqual([...model.categories.map((c: any) => c.amount)].sort((a: number, b: number) => b - a));
  });

  it.each(households)("payday-pressure · %s: the gap is the engine's and the ribbon ranks the bills", (_n, s) => {
    const model = select("payday-pressure", s);
    expect(model.available - model.due).toBeCloseTo(model.gap, 2);
    expect(model.gap).toBe(toNumber(s.gap_before_next_income));
    if (model.second) expect(model.biggest.amount).toBeGreaterThanOrEqual(model.second.amount);
  });

  it.each(households)("cost-constellation · %s: the stars add up to the whole month", (_n, s) => {
    const model = select("cost-constellation", s);
    expect(model.stars.reduce((a: number, st: any) => a + st.share, 0)).toBeCloseTo(100, 6);
    expect(model.stars.length).toBeLessThanOrEqual(6);
    expect(model.total).toBeCloseTo(s.structure.by_category.reduce((a, c) => a + Math.max(0, toNumber(c.amount)), 0), 2);
  });

  it.each(["balance-river", "bill-map", "payday-pressure", "cost-constellation", "month-wall"])("%s answers “not enough data” for an empty household", (id) => {
    expect(select(id, empty as Snapshot)).toBeNull();
  });
});
