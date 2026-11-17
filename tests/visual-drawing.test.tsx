import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import after from "../fixtures/after.json";
import before from "../fixtures/before.json";
import demo from "../fixtures/demo.json";
import type { Snapshot } from "../src";
import { Question } from "../src/modules/Question";
import { layout as flowLayout } from "../src/modules/money-flow";
import { findModule } from "../src/modules/registry";

const households: [string, Snapshot][] = [["demo", demo as Snapshot], ["before", before as Snapshot], ["after", after as Snapshot]];

function circles(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll<SVGCircleElement>(selector)].map((c) => ({ x: Number(c.getAttribute("cx")), y: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")) }));
}

describe("bubbles stay readable", () => {
  it.each(households)("bill-map · %s: every bill is inside the frame and none covers another", (_n, s) => {
    const { container } = render(<div className="bz"><Question module={findModule("bill-map")!} snapshot={s} locale="fr" /></div>);
    const svg = container.querySelector(".bz-night svg")!;
    const [, , W, H] = svg.getAttribute("viewBox")!.split(" ").map(Number) as [number, number, number, number];
    const stars = [...svg.querySelectorAll<SVGGElement>("g.bz-n-hit")].map((g) => {
      const c = g.querySelector("circle")!;
      return { x: Number(c.getAttribute("cx")), y: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")) };
    });
    expect(stars.length).toBe(s.events.filter((e) => e.direction === "outflow" && e.date >= s.as_of && e.date <= s.horizon_end && Number(e.amount) > 0).length);
    for (const b of stars) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(W);
      expect(b.y - b.r).toBeGreaterThanOrEqual(40 - 0.01);
      expect(b.y + b.r).toBeLessThanOrEqual(H - 30 + 0.01);
    }
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
      const [a, b] = [stars[i]!, stars[j]!];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r);
    }
  });

  it.each(households)("cost-constellation · %s: the stars never touch", (_n, s) => {
    const { container } = render(<div className="bz"><Question module={findModule("cost-constellation")!} snapshot={s} locale="fr" /></div>);
    const stars = circles(container, ".bz-constellation-star");
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
      const [a, b] = [stars[i]!, stars[j]!];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    }
  });

  const flowCtx = { locale: "fr" as const, horizon: "cycles" as const };
  const short = { ...(demo as Snapshot), structure: { ...(demo as Snapshot).structure, income_monthly: "900.00", structural_margin: "-2560.00" } };
  const crowded = { ...(demo as Snapshot), structure: { ...(demo as Snapshot).structure, by_category: Array.from({ length: 11 }, (_, i) => ({ category: `Catégorie ${i}`, amount: String(i === 0 ? 2400 : 12 + i) })) } };
  const flows: [string, Snapshot][] = [...households, ["short", short as Snapshot], ["crowded", crowded as Snapshot]];

  it.each(flows)("money-flow · %s: the ribbons tile the source, and no label covers another, down to a phone", (_n, s) => {
    const model = findModule("money-flow")!.select(s, flowCtx) as any;
    for (const width of [300, 320, 390, 880, 1200]) {
      const g = flowLayout(model, width);
      const top = Math.min(g.income.y, g.short.y);
      let cursor = top;
      for (const t of g.targets) {
        expect(t.from, `${width}`).toBeCloseTo(cursor, 6);
        cursor += t.thickness;
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.y + t.h).toBeLessThanOrEqual(g.height);
      }
      expect(cursor).toBeCloseTo(top + g.income.h + g.short.h, 6);
      // each label is two lines around the middle of its node: 12 px above, 14 px below
      const mids = g.targets.map((t) => t.y + t.h / 2);
      for (let i = 1; i < mids.length; i++) expect(mids[i]! - mids[i - 1]!).toBeGreaterThanOrEqual(28);
      expect(mids[0]! - 14).toBeGreaterThanOrEqual(0);
      expect(mids.at(-1)! + 14).toBeLessThanOrEqual(g.height);
      expect(g.short.h > 0 ? g.short.y + g.short.h + 28 : 0).toBeLessThanOrEqual(g.height);
      expect(g.x1 - (g.x0 + 12)).toBeGreaterThanOrEqual(60);
    }
  });

  it.each(flows)("money-flow · %s: every ribbon and node is drawn, with a verdict in words", (_n, s) => {
    const { container } = render(<div className="bz"><Question module={findModule("money-flow")!} snapshot={s} locale="fr" /></div>);
    const model = findModule("money-flow")!.select(s, flowCtx) as any;
    expect(container.querySelectorAll(".bz-flow-band").length).toBe(model.targets.length);
    expect(container.querySelectorAll(".bz-flow-target[role=button]").length).toBe(model.targets.filter((x: any) => x.kind === "category").length);
    expect(container.textContent).toMatch(model.short > 0 ? /dépassent tes revenus/ : /il reste/);
    expect(container.innerHTML).not.toMatch(/NaN|undefined|⟦/);
  });
});
