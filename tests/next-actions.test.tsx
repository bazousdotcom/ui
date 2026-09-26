import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import demo from "../fixtures/demo.json";
import type { Snapshot } from "../src";
import type { ModuleAction } from "../src/modules/types";
import { MODULES } from "../src/modules/registry";
import { Question } from "../src/modules/Question";

const nextActions = MODULES.find((m) => m.id === "next-actions")!;
const snapshot = demo as Snapshot;

describe("next-actions never moves a bill earlier", () => {
  it("bills due after payday get no « Planifier » button and no low-point claim", () => {
    const onAction = vi.fn<(action: ModuleAction) => void>();
    const { container, getAllByText } = render(<Question module={nextActions} snapshot={snapshot} locale="fr" onAction={onAction} />);
    const planned = snapshot.actions.filter((a) => a.type === "plan");
    expect(planned.length).toBeGreaterThan(0);
    expect(getAllByText(/Échéance après le salaire : rien à faire avant/).length).toBe(planned.length);
    expect(container.textContent).not.toMatch(/point bas/);
    for (const button of container.querySelectorAll("button")) fireEvent.click(button);
    const reschedules = onAction.mock.calls.map(([a]) => a).filter((a) => a.type === "reschedule");
    for (const action of reschedules) {
      if (action.type !== "reschedule") continue;
      const bill = snapshot.actions.find((a) => "ref_id" in a && a.ref_id === action.ref_id);
      expect(bill && "type" in bill ? bill.type : null, "only late bills are rescheduled").not.toBe("plan");
      if (bill && "date" in bill && bill.date) expect(action.date > bill.date, "a reschedule only postpones").toBe(true);
    }
  });
});
