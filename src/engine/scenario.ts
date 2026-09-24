import type { CashEvent, IsoDate, Snapshot } from "../contract/snapshot";
import { toNumber } from "../contract/snapshot";
import { addDays, daysBetween } from "../format";

/**
 * What-if levers, replayed on the engine's own events.
 *
 * This is the one calculation the kit does: it re-sums the snapshot's events day by
 * day after moving some of them. It does not invent events, amounts or dates beyond
 * the lever's target, and with no lever active it reproduces the engine's curve exactly.
 */

export type LeverKind = "split" | "defer" | "reserve";

export type Lever = {
  id: string;
  kind: LeverKind;
  event: CashEvent;
  /** Where the moved money lands: the income after the main cycle. */
  target: IsoDate;
  /** For `reserve`: the cushion kept after the next income. */
  reserve?: number;
};

export type SeriesPoint = {
  date: IsoDate;
  balance: number;
  /** Set on days that both receive and pay: balance right after the income. */
  peak?: number;
};

export type Series = {
  points: SeriesPoint[];
  low: { date: IsoDate; balance: number; daysFromNow: number };
  end: { date: IsoDate; balance: number };
};

export function buildLevers(snapshot: Snapshot): Lever[] {
  const target = snapshot.second_income_date ?? addDays(snapshot.as_of, 30);
  const { start, end } = snapshot.main_cycle;
  const candidates = snapshot.events
    .filter((e) => e.direction === "outflow" && e.date >= start && e.date <= end)
    .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
    .slice(0, 2);
  const levers: Lever[] = [];
  const [top, second] = candidates;
  if (top) levers.push({ id: `split:${top.ref_id ?? top.label}`, kind: "split", event: top, target });
  if (second) levers.push({ id: `defer:${second.ref_id ?? second.label}`, kind: "defer", event: second, target });
  if (snapshot.next_income_date) {
    const income = snapshot.events.find((e) => e.direction === "inflow" && e.date === snapshot.next_income_date);
    if (income) {
      const reserve = Math.round((toNumber(income.amount) * 0.4) / 500) * 500;
      if (reserve > 0) levers.push({ id: `reserve:${snapshot.next_income_date}`, kind: "reserve", event: income, target, reserve });
    }
  }
  return levers;
}

export function computeSeries(snapshot: Snapshot, active: ReadonlySet<string>, levers: readonly Lever[]): Series {
  const moved: { date: IsoDate; amount: number }[] = [];
  const on = levers.filter((l) => active.has(l.id));
  const byRef = new Map(on.filter((l) => l.kind !== "reserve").map((l) => [l.event.ref_id ?? l.event.label, l]));
  const reserve = on.find((l) => l.kind === "reserve");

  for (const e of snapshot.events) {
    const amount = toNumber(e.amount) * (e.direction === "inflow" ? 1 : -1);
    const lever = byRef.get(e.ref_id ?? e.label);
    if (!lever) moved.push({ date: e.date, amount });
    else if (lever.kind === "defer") moved.push({ date: lever.target, amount });
    else {
      moved.push({ date: e.date, amount: amount / 2 });
      moved.push({ date: lever.target, amount: amount / 2 });
    }
  }

  if (reserve?.reserve && snapshot.next_income_date) {
    // Keep `reserve` after the next income: bills in that cycle that would dig into it
    // wait for the following income.
    const start = snapshot.next_income_date;
    const end = snapshot.second_income_date ?? snapshot.horizon_end;
    let bank = toNumber(snapshot.opening_balance);
    const sorted = [...moved].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
    moved.length = 0;
    for (const m of sorted) {
      if (m.date >= start && m.date < end && m.amount < 0 && bank + m.amount < reserve.reserve) {
        moved.push({ date: end, amount: m.amount });
        continue;
      }
      bank += m.amount;
      moved.push(m);
    }
  }

  const perDay = new Map<IsoDate, { inflow: number; outflow: number }>();
  for (const m of moved) {
    if (m.date < snapshot.as_of || m.date > snapshot.horizon_end) continue;
    const d = perDay.get(m.date) ?? { inflow: 0, outflow: 0 };
    if (m.amount >= 0) d.inflow += m.amount;
    else d.outflow += m.amount;
    perDay.set(m.date, d);
  }

  let balance = toNumber(snapshot.opening_balance);
  let low = { date: snapshot.as_of, balance, daysFromNow: 0 };
  const points: SeriesPoint[] = [];
  const days = daysBetween(snapshot.as_of, snapshot.horizon_end);
  for (let i = 0; i <= days; i++) {
    const date = addDays(snapshot.as_of, i);
    const d = perDay.get(date);
    const peak = d && d.inflow > 0 && d.outflow < 0 ? balance + d.inflow : undefined;
    balance = round2(balance + (d ? d.inflow + d.outflow : 0));
    if (balance < low.balance) low = { date, balance, daysFromNow: i };
    points.push(peak === undefined ? { date, balance } : { date, balance, peak: round2(peak) });
  }
  return { points, low, end: { date: snapshot.horizon_end, balance } };
}

/** The engine's own curve, read from `points` (no replay). */
export function baseSeries(snapshot: Snapshot): Series {
  let prev = toNumber(snapshot.opening_balance);
  const points: SeriesPoint[] = snapshot.points.map((p) => {
    const inflow = toNumber(p.inflows);
    const outflow = toNumber(p.outflows);
    const balance = toNumber(p.closing_balance);
    const point: SeriesPoint = inflow > 0 && outflow > 0 ? { date: p.date, balance, peak: round2(prev + inflow) } : { date: p.date, balance };
    prev = balance;
    return point;
  });
  const last = points[points.length - 1];
  return {
    points,
    low: { date: snapshot.low_point.date, balance: toNumber(snapshot.low_point.balance), daysFromNow: snapshot.low_point.days_from_now },
    end: { date: snapshot.end_of_horizon.date, balance: last ? last.balance : toNumber(snapshot.end_of_horizon.balance) },
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
