import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import before from "../fixtures/before.json";
import type { CashEvent, Snapshot } from "../src";
import { Question } from "../src/modules/Question";
import { findModule } from "../src/modules/registry";

afterEach(cleanup);

// An invented household with six bills on the same day, in cents (live data showed both bugs on 2026-10-01).
const extra: CashEvent[] = [["Impôts, tranche 1", "2565.70"], ["Impôts, tranche 2", "2613.70"], ["Crédit privé", "1544.35"], ["Carte", "775.85"]]
  .map(([label, amount], i) => ({ date: "2026-10-01", label: label!, amount: amount!, direction: "outflow", original_amount: amount!, currency: "CHF", kind: "obligation", ref_id: `x${i}`, status: "open", category: null }));
const base = before as Snapshot;
const before0 = base.cycles.find((c) => c.key === "before_income")!;
const due = (Number(base.due_before_next_income) + extra.reduce((s, e) => s + Number(e.amount), 0)).toFixed(2);
const crowded: Snapshot = {
  ...base,
  events: [...extra, ...base.events],
  cycles: base.cycles.map((c) => (c === before0 ? { ...c, items: [...extra, ...c.items] } : c)),
  due_before_next_income: due,
  gap_before_next_income: (Number(base.opening_balance) - Number(due)).toFixed(2),
};
const ctx = { locale: "fr" as const, horizon: "cycles" as const };

describe("payday orbit on a crowded day", () => {
  it("six bills on one day become one planet, with their total", () => {
    const m = findModule("payday-pressure")!.select(crowded, ctx) as any;
    const day = m.planets.filter((p: any) => p.date === "2026-10-01");
    expect(day).toHaveLength(1);
    expect(day[0].count).toBe(6);
    expect(day[0].amount).toBeCloseTo(1800 + 900 + 2565.7 + 2613.7 + 1544.35 + 775.85, 2);
    for (const date of new Set(m.planets.map((p: any) => p.date))) expect(m.planets.filter((p: any) => p.date === date).length).toBeLessThanOrEqual(2);
  });

  it("without a move it never says « était … avant ton « et si » », even with cents", () => {
    const { container } = render(<div className="bz"><Question module={findModule("payday-pressure")!} snapshot={crowded} locale="fr" /></div>);
    expect(container.textContent).not.toContain("avant ton « et si »");
    expect(container.textContent).toContain("6 factures");
  });

  it("every planet stays inside the drawing", () => {
    const { container } = render(<div className="bz"><Question module={findModule("payday-pressure")!} snapshot={crowded} locale="fr" /></div>);
    for (const g of container.querySelectorAll("g.bz-n-hit")) {
      const c = g.querySelector("circle")!;
      const [x, y, r] = ["cx", "cy", "r"].map((a) => Number(c.getAttribute(a))) as [number, number, number];
      expect(x - r).toBeGreaterThanOrEqual(-90);
      expect(x + r).toBeLessThanOrEqual(730);
      expect(y - r).toBeGreaterThanOrEqual(-40);
      expect(y + r).toBeLessThanOrEqual(680);
    }
  });
});
