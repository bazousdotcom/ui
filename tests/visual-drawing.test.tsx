import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import after from "../fixtures/after.json";
import before from "../fixtures/before.json";
import demo from "../fixtures/demo.json";
import type { Snapshot } from "../src";
import { Question } from "../src/modules/Question";
import { findModule } from "../src/modules/registry";

const households: [string, Snapshot][] = [["demo", demo as Snapshot], ["before", before as Snapshot], ["after", after as Snapshot]];

function circles(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll<SVGCircleElement>(selector)].map((c) => ({ x: Number(c.getAttribute("cx")), y: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")) }));
}

describe("bubbles stay readable", () => {
  it.each(households)("bill-map · %s: every bill is inside the frame and none covers another", (_n, s) => {
    const { container } = render(<div className="bz"><Question module={findModule("bill-map")!} snapshot={s} locale="fr" /></div>);
    const svg = container.querySelector(".bz-chart")!;
    const [, , W, H] = svg.getAttribute("viewBox")!.split(" ").map(Number) as [number, number, number, number];
    const bubbles = circles(container, ".bz-map-bubble");
    expect(bubbles.length).toBe(s.events.filter((e) => e.direction === "outflow" && e.date >= s.as_of && e.date <= s.horizon_end && Number(e.amount) > 0).length);
    for (const b of bubbles) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(W);
      expect(b.y - b.r).toBeGreaterThanOrEqual(26 - 0.01);
      expect(b.y + b.r).toBeLessThanOrEqual(H - 28 + 0.01);
    }
    for (let i = 0; i < bubbles.length; i++) for (let j = i + 1; j < bubbles.length; j++) {
      const [a, b] = [bubbles[i]!, bubbles[j]!];
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
});
