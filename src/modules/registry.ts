import availableNow from "./available-now";
import balanceRiver from "./balance-river";
import billMap from "./bill-map";
import costConstellation from "./cost-constellation";
import duePayday from "./due-before-payday";
import lowPoint from "./low-point";
import marginAfterPayday from "./margin-after-payday";
import monthWall from "./month-wall";
import moneyFlow from "./money-flow";
import monthlyStructure from "./monthly-structure";
import nextActions from "./next-actions";
import payCycles from "./pay-cycles";
import paydayPressure from "./payday-pressure";
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
  // Drawn from the community proposals of September 2026: the same answers, as pictures.
  paydayPressure,
  costConstellation,
  // Community proposal of November 2026: the month's income as a river that splits.
  moneyFlow,
  balanceRiver,
  billMap,
  monthWall,
];

export function findModule(id: string): QuestionModule<any> | undefined {
  return MODULES.find((m) => m.id === id);
}
