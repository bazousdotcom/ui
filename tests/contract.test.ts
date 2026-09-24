import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import tight from "../fixtures/tight.json";
import schema from "../schema/snapshot.schema.json";

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

describe("snapshot contract", () => {
  it.each([["demo", demo], ["tight", tight], ["empty", empty]])("fixture %s matches the schema", (_name, fixture) => {
    const ok = validate(fixture);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("rejects a float amount (amounts are decimal strings)", () => {
    expect(validate({ ...demo, opening_balance: 3420 })).toBe(false);
  });
});
