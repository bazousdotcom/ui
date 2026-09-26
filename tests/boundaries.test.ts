import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import canvasJson from "../schema/canvas.json";
import { CANVAS_ATTRIBUTES, CANVAS_CLASSES, CANVAS_CSS, CANVAS_FIELDS, CANVAS_INTENTS, CANVAS_SIZED_CLASSES, CANVAS_TAGS } from "../src/canvas";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("the kit stays a pure view layer", () => {
  const sources = files("src").filter((f) => /\.(ts|tsx)$/.test(f));
  it.each(sources)("%s makes no network, storage or cookie call", (file) => {
    const code = readFileSync(file, "utf8");
    for (const banned of ["fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "document.cookie", "navigator.sendBeacon", "eval("]) {
      expect(code, `${file} uses ${banned}`).not.toContain(banned);
    }
    const urls = code.match(/https?:\/\/[^\s"'`)]+/g) ?? [];
    // The SVG namespace is an XML name, never fetched; every other address is forbidden.
    const allowed = urls.filter((u) => !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(u) && u !== "http://www.w3.org/2000/svg");
    expect(allowed, file).toEqual([]);
  });
});

describe("capture canvas contract", () => {
  it("schema/canvas.json is the published copy of the TypeScript lists", () => {
    expect(canvasJson).toEqual({
      tags: [...CANVAS_TAGS],
      attributes: [...CANVAS_ATTRIBUTES],
      classes: [...CANVAS_CLASSES],
      sized_classes: [...CANVAS_SIZED_CLASSES],
      intents: [...CANVAS_INTENTS],
      fields: [...CANVAS_FIELDS],
    });
  });

  it.each([...CANVAS_CLASSES])("class .%s is styled", (cls) => {
    expect(CANVAS_CSS).toMatch(new RegExp(`\\.${cls.replace(/-/g, "\\-")}(?![\\w-])`));
  });
});
