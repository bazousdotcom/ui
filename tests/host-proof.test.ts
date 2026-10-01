import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/bazous.css", "utf8");

describe("the scenes' buttons survive a host that styles every button", () => {
  // bazous.com sets `button { height: 36px }`: a kit button without its own height is squeezed.
  it.each([".bz-n-cause", ".bz-n-roll button", ".bz-n-drill button", ".bz-focus-chip button"])("%s sets its own height", (selector) => {
    const rule = new RegExp(`\\.bz ${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")} \\{[^}]*height:`);
    expect(css).toMatch(rule);
  });

});
