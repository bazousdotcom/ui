import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/bazous.css", "utf8");
const night = css.slice(css.indexOf(".bz-night {"), css.indexOf("}", css.indexOf(".bz-night {")));
const day = css.slice(css.indexOf('.bz[data-theme="light"] .bz-night {'), css.indexOf("}", css.indexOf('.bz[data-theme="light"] .bz-night {')));

describe("« Jour »: the night scenes follow the light theme", () => {
  it("every night colour token is redefined by day", () => {
    const tokens = [...night.matchAll(/(--n-[a-z-]+):/g)].map((m) => m[1]);
    expect(tokens.length).toBeGreaterThan(5);
    for (const token of tokens) expect(day, token).toContain(`${token}:`);
  });

  it("every gradient stop of the night has its day colour", () => {
    // Every night stop class (not already prefixed by the light theme).
    const stops = [...css.matchAll(/(?<!"\] )\.(bz-n-[a-z0-9-]+-\d) \{ stop-color/g)].map((m) => m[1]);
    expect(stops.length).toBeGreaterThan(20);
    for (const stop of stops) expect(css, stop).toMatch(new RegExp(`\\.bz\\[data-theme="light"\\] \\.${stop} \\{ stop-color`));
  });

  it("by day a glow becomes a soft shadow, and haze stays haze", () => {
    expect(css).toMatch(/\.bz\[data-theme="light"\] \.bz-night \[filter\]:not\(\.bz-n-nebula\):not\(\.bz-n-beam\):not\(\.bz-n-halo-risk\) \{ filter: drop-shadow/);
  });
});
