import { describe, expect, it } from "vitest";

import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import tight from "../fixtures/tight.json";
import type { Snapshot } from "../src";
import { toNumber } from "../src/contract/snapshot";
import { baseSeries, buildLevers, computeSeries } from "../src/engine/scenario";
import { MODULES } from "../src/modules/registry";

const fixtures: Snapshot[] = [demo as Snapshot, tight as Snapshot, empty as Snapshot];
const ctx = { locale: "fr" as const, horizon: "cycles" as const };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe("module registry", () => {
  it("ids are unique, kebab-case and stable", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("modules only read fields that exist in the contract", () => {
    for (const m of MODULES) for (const field of m.reads) expect(demo, `${m.id} reads ${String(field)}`).toHaveProperty(String(field));
  });

  it.each(MODULES.map((m) => [m.id, m] as const))("%s: select is pure and never mutates the snapshot", (_id, m) => {
    for (const f of fixtures) {
      const frozen = deepFreeze(structuredClone(f));
      const a = m.select(frozen, ctx);
      const b = m.select(frozen, ctx);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});

describe("the demo household answers the bazous.com example", () => {
  const s = demo as Snapshot;
  it("3’420 now, 2’180 before payday, low point 940", () => {
    expect(toNumber(s.opening_balance)).toBe(3420);
    expect(toNumber(s.due_before_next_income)).toBe(2180);
    expect(Math.round(toNumber(s.low_point.balance))).toBe(940);
  });
});

describe("what-if replay", () => {
  it.each([["demo", demo], ["tight", tight]] as const)("%s: no lever reproduces the engine curve exactly", (_n, f) => {
    const s = f as Snapshot;
    const replay = computeSeries(s, new Set(), buildLevers(s));
    const engine = baseSeries(s);
    expect(replay.points.map((p) => p.balance)).toEqual(engine.points.map((p) => p.balance));
    expect(replay.low.balance).toBe(engine.low.balance);
  });

  it("splitting the biggest bill lifts the low point of the overdraft case", () => {
    const s = tight as Snapshot;
    const levers = buildLevers(s);
    const split = levers.find((l) => l.kind === "split")!;
    const after = computeSeries(s, new Set([split.id]), levers);
    expect(after.low.balance).toBeGreaterThan(toNumber(s.low_point.balance));
  });

  it("levers never create or lose money over the horizon when the target is inside it", () => {
    const s = demo as Snapshot;
    const levers = buildLevers(s).filter((l) => l.target <= s.horizon_end);
    const all = computeSeries(s, new Set(levers.map((l) => l.id)), levers);
    expect(all.end.balance).toBeCloseTo(toNumber(s.end_of_horizon.balance), 2);
  });
});
