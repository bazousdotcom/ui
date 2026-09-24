import availableNow from "./available-now";
import duePayday from "./due-before-payday";
import lowPoint from "./low-point";
import marginAfterPayday from "./margin-after-payday";
import monthlyStructure from "./monthly-structure";
import nextActions from "./next-actions";
import payCycles from "./pay-cycles";
import type { QuestionModule } from "./types";
import whatIf from "./what-if";

/**
 * Every module, in the order the cockpit shows them. Adding a question = adding a
 * folder under src/modules/ and one line here (see CONTRIBUTING.md).
 */
export const MODULES: readonly QuestionModule<any>[] = [
  availableNow,
  duePayday,
  lowPoint,
  marginAfterPayday,
  whatIf,
  nextActions,
  monthlyStructure,
  payCycles,
];

export function findModule(id: string): QuestionModule<any> | undefined {
  return MODULES.find((m) => m.id === id);
}
