import { num, shortDate } from "../format";
import { createT, type Locale, type Translate } from "../i18n";
import type {
  AnswerVisual, BalancePoint, BalanceVisual, CalendarVisual, CountdownVisual, DaysVisual, DeadlineVisual, GaugeVisual, HorizonVisual,
  JarVisual, LeakVisual, RunwayVisual, ShiftVisual, ValleyVisual,
} from "./contract";
import { answerMessages } from "./messages";

/**
 * One picture per kind of answer, as plain SVG: no framework, no network, only the figures of the
 * engine. Used by the kit's React component and embedded as is in the assistants' card, so the same
 * drawing shows on bazous.com, in Claude and in ChatGPT.
 *
 * Colours come from the kit's tokens (`--bz-*`), so the picture follows the theme around it.
 * Every label is set as text, never as markup. A picture that cannot be drawn returns null and the
 * answer is shown without it.
 */

const SVGNS = "http://www.w3.org/2000/svg";
const H = 130;
/**
 * The picture is laid out at the width it is shown (one unit = one pixel), so its 11px labels stay
 * 11px on a phone instead of being shrunk with the drawing. Below 260 it is scaled down, above 320 up.
 */
export const MIN_WIDTH = 260;
export const MAX_WIDTH = 320;

const C = {
  ink: "var(--bz-text)",
  muted: "var(--bz-muted)",
  line: "var(--bz-control-line)",
  accent: "var(--bz-accent)",
  onAccent: "var(--bz-on-accent)",
  negative: "var(--bz-negative)",
  warning: "var(--bz-warning)",
  positive: "var(--bz-positive)",
  surface: "var(--bz-surface)",
};

type Child = Node | null | false | undefined | Child[];
type Attrs = Record<string, string | number | null | undefined>;
type Svg = (tag: string, attrs?: Attrs, ...children: Child[]) => SVGElement;

const n = (v: string | number | null | undefined) => Number(v ?? 0);
const amount = (v: string | number) => num(v, 2);
/** Long labels are shortened so they never leave the picture. */
export const shorten = (label: string, max = 18) => (label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label);

function tools(doc: Document, W: number) {
  const sv: Svg = (tag, attrs = {}, ...children) => {
    const node = doc.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, String(v));
    for (const c of (children as unknown[]).flat(Infinity)) if (c) node.append(c as Node);
    return node;
  };
  const txt = (x: number, y: number, value: string, attrs: Attrs = {}) => {
    const node = sv("text", { x, y, "font-size": 11, fill: C.muted, ...attrs });
    node.textContent = value;
    return node;
  };
  const frame = (label: string, ...children: Child[]) =>
    sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "bz-answer-visual", role: "img", "aria-label": label }, ...children) as SVGSVGElement;
  return { sv, txt, frame };
}

type Scale = { n: number; top: number; hi: number; x: (i: number) => number; y: (v: number) => number };

function scale(list: BalancePoint[][], W: number): Scale {
  const values = list.flat().map(([, b]) => n(b));
  const lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (lo < 0 && hi > -3 * lo) hi = -1.6 * lo; // a payday spike would flatten the valley: cut it, and say so
  const count = list[0]!.length, left = 8, right = W - 8, top = 22, bottom = H - 22;
  return {
    n: count, top, hi,
    x: (i) => left + (i * (right - left)) / Math.max(count - 1, 1),
    y: (v) => top + ((hi - Math.min(v, hi)) * (bottom - top)) / (hi - lo || 1),
  };
}

const points = (series: BalancePoint[], sc: Scale, f = (b: number) => b) =>
  series.map(([, b], i) => `${sc.x(i).toFixed(1)},${sc.y(f(n(b))).toFixed(1)}`).join(" ");

function draw(v: AnswerVisual, t: Translate, doc: Document, W: number): SVGSVGElement | null {
  const { sv, txt, frame } = tools(doc, W);
  const zeroLine = (y: number) => [
    sv("line", { x1: 8, x2: W - 8, y1: y, y2: y, stroke: C.line, "stroke-dasharray": "3 3" }),
    txt(W - 8, y - 4, "0", { "text-anchor": "end" }),
  ];
  const peaks = (series: BalancePoint[], sc: Scale) => {
    const marks: SVGElement[] = [];
    series.forEach(([, b], i) => {
      const prev = i ? n(series[i - 1]![1]) : -Infinity;
      if (n(b) > sc.hi && prev <= sc.hi && marks.length < 2)
        marks.push(txt(sc.x(i), sc.top - 8, `↑ ${amount(b)}`, { "text-anchor": sc.x(i) > W * 0.7 ? "end" : "start" }));
    });
    return marks;
  };
  const ends = (series: BalancePoint[]) => [
    txt(8, H - 6, shortDate(series[0]![0])),
    txt(W - 8, H - 6, shortDate(series[series.length - 1]![0]), { "text-anchor": "end" }),
  ];

  const runway = (r: RunwayVisual) => {
    const t0 = Date.parse(r.today), span = Math.max(Date.parse(r.payday) - t0, 1);
    const x = (iso: string) => 14 + ((Date.parse(iso) - t0) * (W - 28)) / span;
    const due = n(r.due), avail = n(r.available), gap = n(r.gap), full = W - 28;
    const aw = gap < 0 && due > 0 ? Math.min(Math.max(avail, 0) / due, 1) * full : full;
    const total = r.bills.reduce((sum, b) => sum + n(b.amount), 0);
    const label = r.bills.length === 1 ? `${shorten(r.bills[0]!.label)} ${shortDate(r.bills[0]!.date)}`
      : t("vis.bills", { n: r.bills.length, total: amount(total) });
    const inside = aw > 110;
    return frame(r.caption,
      sv("line", { x1: 14, x2: W - 14, y1: 30, y2: 30, stroke: C.line, "stroke-width": 2 }),
      sv("circle", { cx: 14, cy: 30, r: 5, fill: C.ink }), txt(8, 14, t("vis.today")),
      sv("circle", { cx: W - 14, cy: 30, r: 6, fill: C.positive }),
      txt(W - 8, 14, `${t("vis.payday")} ${shortDate(r.payday)}`, { "text-anchor": "end", fill: C.positive }),
      r.bills.map((b) => sv("rect", { x: x(b.date) - 6, y: 24, width: 12, height: 12, rx: 3, fill: C.negative, stroke: C.surface, "stroke-width": 1 })),
      r.bills.length > 0 && txt(W / 2, 58, label, { "text-anchor": "middle", fill: C.negative }),
      sv("rect", { x: 14, y: 86, width: Math.max(aw, 0), height: 20, rx: 3, fill: C.accent }),
      gap < 0 && sv("rect", { x: 14 + aw, y: 86, width: full - aw, height: 20, rx: 3, fill: C.negative, "fill-opacity": 0.16,
        stroke: C.negative, "stroke-dasharray": "4 3" }),
      txt(inside ? 20 : 14, inside ? 100 : 80, `${t("vis.available")} ${amount(avail)}`,
        { fill: inside ? C.onAccent : avail < 0 ? C.negative : C.ink, "font-weight": 600 }),
      gap < 0 ? txt(W - 20, 100, `${t("vis.short")} ${amount(-gap)}`, { "text-anchor": "end", fill: C.negative, "font-weight": 600 })
        : txt(W - 20, 100, `${t("vis.left")} ${amount(gap)}`, { "text-anchor": "end", fill: C.onAccent, "font-weight": 600 }));
  };

  const valley = (v2: ValleyVisual) => {
    const sc = scale([v2.series], W), zero = sc.y(0);
    const li = Math.max(0, v2.series.findIndex(([d]) => d === v2.low.date));
    const lx = sc.x(li), ly = sc.y(n(v2.low.balance)), right = lx > W * 0.6;
    return frame(v2.caption,
      sv("polygon", { points: `${sc.x(0)},${zero} ${points(v2.series, sc, (b) => Math.min(b, 0))} ${sc.x(sc.n - 1)},${zero}`,
        fill: C.negative, "fill-opacity": 0.18 }),
      zeroLine(zero),
      sv("polyline", { points: points(v2.series, sc), fill: "none", stroke: C.ink, "stroke-width": 2, "stroke-linejoin": "round" }),
      peaks(v2.series, sc),
      sv("circle", { cx: lx, cy: ly, r: 5, fill: C.negative }),
      txt(lx + (right ? -9 : 9), Math.min(ly + 4, H - 26), `${amount(v2.low.balance)} · ${shortDate(v2.low.date)}`,
        { "text-anchor": right ? "end" : "start", fill: C.negative, "font-weight": 600 }),
      ends(v2.series));
  };

  const shift = (s: ShiftVisual) => {
    const sc = scale([s.before, s.after], W), zero = sc.y(0);
    const at = (iso: string) => { const i = s.before.findIndex(([d]) => d === iso); return sc.x(i < 0 ? sc.n - 1 : i); };
    const fx = at(s.move.from), tx = at(s.move.to), label = shorten(s.move.label, 16);
    const tag = Math.min(label.length * 6 + 14, 120);
    const tagX = Math.max(4, Math.min(fx - tag / 2, tx - tag - 12, W - 4 - tag));
    const arrow = tagX + tag + 8 < tx - 4;
    // The before/after legend goes to the side the target date leaves free; with no room on either side,
    // the date moves up next to the arrow. Widths are estimated generously (7px a character at 11px).
    const before = t("vis.before"), after = t("vis.after"), sw = 14, cw = 7;
    const width = sw + 4 + before.length * cw + 12 + sw + 4 + after.length * cw;
    const dateBox = 26, leftFits = 8 + width < tx - dateBox, rightFits = W - 8 - width > tx + dateBox;
    const lx = leftFits || !rightFits ? 8 : W - 8 - width, dateUp = !leftFits && !rightFits;
    const ax = lx + sw + 4 + before.length * cw + 12;
    // The move is drawn in its own band above the curves, so it never sits on them.
    return frame(s.caption,
      sv("defs", {}, sv("marker", { id: "bz-arrowhead", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" },
        sv("path", { d: "M0 0 L10 5 L0 10z", fill: C.accent }))),
      sv("rect", { x: tagX, y: 2, width: tag, height: 16, rx: 3, fill: C.negative, "fill-opacity": 0.16, stroke: C.negative, "stroke-width": 0.5 }),
      txt(tagX + tag / 2, 14, label, { "text-anchor": "middle", fill: C.negative }),
      arrow && sv("line", { x1: tagX + tag + 4, x2: tx - 4, y1: 10, y2: 10, stroke: C.accent, "stroke-width": 1.5, "marker-end": "url(#bz-arrowhead)" }),
      sv("line", { x1: tx, x2: tx, y1: 16, y2: H - 20, stroke: C.accent, "stroke-dasharray": "2 3", "stroke-opacity": 0.6 }),
      zeroLine(zero),
      sv("polyline", { points: points(s.before, sc), fill: "none", stroke: C.muted, "stroke-width": 1.5, "stroke-dasharray": "4 3" }),
      sv("polyline", { points: points(s.after, sc), fill: "none", stroke: C.accent, "stroke-width": 2.5, "stroke-linejoin": "round" }),
      sv("line", { x1: lx, x2: lx + sw, y1: H - 10, y2: H - 10, stroke: C.muted, "stroke-width": 1.5, "stroke-dasharray": "4 3" }),
      txt(lx + sw + 4, H - 6, before),
      sv("line", { x1: ax, x2: ax + sw, y1: H - 10, y2: H - 10, stroke: C.accent, "stroke-width": 2.5 }),
      txt(ax + sw + 4, H - 6, after, { fill: C.accent, "font-weight": 600 }),
      dateUp
        ? txt(tx + 6 < W - 40 ? tx + 6 : tx - 6, 30, shortDate(s.move.to), { "text-anchor": tx + 6 < W - 40 ? "start" : "end", fill: C.accent, "font-weight": 600 })
        : txt(Math.min(Math.max(tx, 22), W - 22), H - 6, shortDate(s.move.to), { "text-anchor": "middle", fill: C.accent, "font-weight": 600 }));
  };

  const days = (d: DaysVisual) => {
    const per = 18, pitch = (W - 16) / per, lit = Math.min(d.covered, d.target), rows = Math.ceil(d.target / per);
    const color = d.covered < d.target / 3 ? C.negative : d.covered < d.target ? C.warning : C.positive;
    const cells = Array.from({ length: d.target }, (_, i) => sv("rect", {
      x: 8 + (i % per) * pitch, y: 6 + Math.floor(i / per) * 19, width: pitch * 0.75, height: 15, rx: 2,
      fill: i < lit ? color : "none", stroke: i < lit ? null : C.line }));
    return frame(d.caption, cells,
      txt(8, 6 + rows * 19 + 14, t("vis.days", { covered: d.covered, target: d.target }), { fill: color, "font-weight": 600, "font-size": 12 }));
  };

  const balance = (b: BalanceVisual) => {
    const inn = n(b.in), out = n(b.out), max = Math.max(inn, out) || 1, L = 8, R = W - 8, len = (v: number) => (v * (R - L)) / max;
    return frame(b.caption,
      txt(L, 20, `${t("vis.in")} ${amount(inn)}`), sv("rect", { x: L, y: 26, width: len(inn), height: 22, rx: 3, fill: C.positive }),
      txt(L, 76, `${t("vis.out")} ${amount(out)}`),
      sv("rect", { x: L, y: 82, width: len(Math.min(out, inn)), height: 22, rx: 3, fill: C.negative, "fill-opacity": 0.5 }),
      out > inn && sv("rect", { x: L + len(inn), y: 82, width: len(out - inn), height: 22, rx: 3, fill: C.negative }),
      sv("line", { x1: L + len(inn), x2: L + len(inn), y1: 24, y2: 106, stroke: C.ink, "stroke-dasharray": "2 2" }),
      txt(R, H - 6, `−${amount(b.gap)}`, { "text-anchor": "end", fill: C.negative, "font-weight": 600, "font-size": 12 }),
      txt(L, H - 6, `${shortDate(b.start)} → ${shortDate(b.end)}`));
  };

  const countdown = (c: CountdownVisual) => {
    const r = 38, circ = 2 * Math.PI * r, frac = Math.min(c.window_days ? c.days_left / c.window_days : 1, 1);
    const both = c.current != null && c.next != null, up = both && n(c.next) > n(c.current);
    const x0 = 118, x2 = W - 8, xm = (x0 + x2) / 2;
    return frame(c.caption,
      sv("circle", { cx: 56, cy: 52, r, fill: "none", stroke: C.line, "stroke-width": 9 }),
      sv("circle", { cx: 56, cy: 52, r, fill: "none", stroke: C.accent, "stroke-width": 9, "stroke-linecap": "round",
        "stroke-dasharray": `${(frac * circ).toFixed(1)} ${circ.toFixed(1)}`, transform: "rotate(-90 56 52)" }),
      txt(56, 59, `${c.days_left} ${t("vis.dayUnit")}`, { "text-anchor": "middle", fill: C.ink, "font-size": 20, "font-weight": 600 }),
      txt(56, H - 6, `${t("vis.until")} ${shortDate(c.deadline)}`, { "text-anchor": "middle" }),
      both && [
        sv("polyline", { points: `${x0},${up ? 96 : 56} ${xm},${up ? 96 : 56} ${xm},${up ? 56 : 96} ${x2},${up ? 56 : 96}`, fill: "none",
          stroke: up ? C.negative : C.positive, "stroke-width": 2.5 }),
        txt(x0, up ? 114 : 48, `${amount(c.current!)} ${t("vis.perMonth")}`),
        txt(x2, up ? 48 : 114, amount(c.next!), { "text-anchor": "end", fill: up ? C.negative : C.positive, "font-weight": 600 }),
      ]);
  };

  const horizon = (h: HorizonVisual) => {
    const sc = scale([h.series], W), zero = sc.y(0);
    const last = h.series.length - 1, ex = sc.x(last), ey = sc.y(n(h.end.balance)), below = n(h.end.balance) < 0;
    const color = below ? C.negative : C.positive;
    return frame(h.caption,
      zeroLine(zero),
      sv("polyline", { points: points(h.series, sc), fill: "none", stroke: C.muted, "stroke-width": 1.5, "stroke-linejoin": "round" }),
      peaks(h.series, sc),
      // The finish line: from zero to where the period ends.
      sv("line", { x1: ex, x2: ex, y1: zero, y2: ey, stroke: color, "stroke-width": 4, "stroke-linecap": "round" }),
      sv("circle", { cx: ex, cy: ey, r: 6, fill: color }),
      txt(ex - 12, Math.min(Math.max(ey + 4, 26), H - 26), `${amount(h.end.balance)} · ${shortDate(h.end.date)}`,
        { "text-anchor": "end", fill: color, "font-weight": 600 }),
      h.days_of_fixed_costs != null && txt(W - 8, H - 6, t("vis.fixedDays", { days: h.days_of_fixed_costs }), { "text-anchor": "end", fill: color }),
      txt(8, H - 6, shortDate(h.series[0]![0])));
  };

  const calendar = (c: CalendarVisual) => {
    const t0 = Date.parse(c.today), span = Math.max(Date.parse(c.until) - t0, 1), L = 10, R = W - 10;
    const x = (iso: string) => L + ((Date.parse(iso) - t0) * (R - L)) / span;
    const days = Math.round(span / 86_400_000);
    const ticks = Array.from({ length: Math.floor(days / 7) + 1 }, (_, i) =>
      sv("line", { x1: L + (i * 7 * (R - L)) / days, x2: L + (i * 7 * (R - L)) / days, y1: 72, y2: 84, stroke: C.line }));
    const first = c.items[0]!, fx = x(first.date), right = fx > W * 0.6;
    return frame(c.caption,
      sv("line", { x1: L, x2: R, y1: 84, y2: 84, stroke: C.line, "stroke-width": 2 }), ticks,
      sv("circle", { cx: L, cy: 84, r: 5, fill: C.ink }),
      c.items.slice(1).map((it) => sv("rect", { x: x(it.date) - 4, y: 60, width: 8, height: 24, rx: 2, fill: C.warning })),
      sv("rect", { x: fx - 6, y: 38, width: 12, height: 46, rx: 3, fill: C.accent }),
      txt(fx + (right ? -10 : 10), 46, `${shorten(first.label, 20)} · ${amount(first.amount)}`, { "text-anchor": right ? "end" : "start", fill: C.ink, "font-weight": 600 }),
      txt(fx + (right ? -10 : 10), 62, t("vis.inDays", { days: first.days }), { "text-anchor": right ? "end" : "start", fill: C.accent }),
      c.items.length > 1 && txt(W - 8, 14, t("vis.more", { n: c.items.length - 1 }), { "text-anchor": "end" }),
      txt(L, H - 14, t("vis.today")), txt(R, H - 14, shortDate(c.until), { "text-anchor": "end" }));
  };

  const leak = (l: LeakVisual) => {
    const years = Math.max(l.years, 1), gap = 6, L = 8, R = W - 8, bw = (R - L - gap * (years - 1)) / years, base = H - 26, top = 30;
    const bars = Array.from({ length: years }, (_, i) => {
      const hgt = ((i + 1) / years) * (base - top);
      return sv("rect", { x: L + i * (bw + gap), y: base - hgt, width: bw, height: hgt, rx: 2,
        fill: C.negative, "fill-opacity": i === years - 1 ? 1 : 0.25 + (0.5 * i) / years });
    });
    return frame(l.caption, bars,
      txt(R, top - 8, amount(l.total), { "text-anchor": "end", fill: C.negative, "font-weight": 600 }),
      txt(L, base - (base - top) / years - 6, `${amount(l.per_year)} ${t("vis.perYear")}`, { fill: C.ink }),
      txt(L, H - 8, t("vis.years", { n: 1 })), txt(R, H - 8, t("vis.years", { n: years }), { "text-anchor": "end" }));
  };

  const jar = (j: JarVisual) => {
    const needed = n(j.needed_per_month), aside = n(j.set_aside_per_month), ratio = needed > 0 ? Math.min(aside / needed, 1) : 1;
    const gap = 5, L = 8, R = W - 8, jw = (R - L - gap * 11) / 12, top = 34, base = 96;
    const jars = Array.from({ length: 12 }, (_, i) => {
      const x = L + i * (jw + gap);
      return [
        sv("rect", { x, y: top, width: jw, height: base - top, rx: 4, fill: "none", stroke: C.accent, "stroke-width": 1.2 }),
        ratio > 0 && sv("rect", { x: x + 1.5, y: base - ratio * (base - top) + 1.5, width: jw - 3, height: Math.max(ratio * (base - top) - 3, 0), rx: 3, fill: C.accent }),
      ];
    });
    return frame(j.caption, jars,
      txt(L, 20, `${t("vis.bill")} ${amount(j.bill)}`, { fill: C.ink, "font-weight": 600 }),
      txt(R, 20, `${t("vis.months")} × ${amount(j.needed_per_month)}`, { "text-anchor": "end", fill: C.accent }),
      txt(L, H - 8, `${amount(j.set_aside_per_month)} ${t("vis.perMonth")}`, { fill: ratio < 1 ? C.negative : C.positive }),
      txt(R, H - 8, `${amount(j.per_day)} ${t("vis.perDay")}`, { "text-anchor": "end" }));
  };

  const gauge = (g: GaugeVisual) => {
    const limit = n(g.limit) || 1, paid = Math.min(n(g.paid), limit), L = 8, R = W - 8, len = (v: number) => (v * (R - L)) / limit;
    return frame(g.caption,
      txt(R, 24, `${t("vis.limit")} ${amount(g.limit)}`, { "text-anchor": "end" }),
      sv("rect", { x: L, y: 36, width: R - L, height: 26, rx: 4, fill: "none", stroke: C.accent, "stroke-dasharray": "4 3" }),
      paid > 0 && sv("rect", { x: L, y: 36, width: len(paid), height: 26, rx: 4, fill: C.positive }),
      txt(L, 80, `${t("vis.paid")} ${amount(g.paid)}`, { fill: C.positive, "font-weight": 600 }),
      txt(R, 80, `${t("vis.left")} ${amount(g.left)}`, { "text-anchor": "end", fill: C.accent, "font-weight": 600 }),
      sv("line", { x1: L, x2: R, y1: 104, y2: 104, stroke: C.line, "stroke-width": 2 }),
      sv("circle", { cx: L, cy: 104, r: 4, fill: C.ink }), sv("circle", { cx: R, cy: 104, r: 5, fill: C.accent }),
      txt(L, H - 6, t("vis.today")), txt(R, H - 6, `${g.days_left} ${t("vis.dayUnit")} → ${shortDate(g.deadline)}`, { "text-anchor": "end", fill: C.accent }));
  };

  const deadline = (d: DeadlineVisual) => {
    const c = d.contracts[0]!, t0 = Date.parse(d.today), t1 = Date.parse(c.ends_on), span = Math.max(t1 - t0, 1), L = 14, R = W - 52;
    const x = (iso: string) => L + ((Date.parse(iso) - t0) * (R - L)) / span, cx = x(c.cancel_before);
    return frame(d.caption,
      txt(8, 16, shorten(c.name, 26), { fill: C.ink, "font-weight": 600 }),
      d.contracts.length > 1 && txt(W - 8, 16, t("vis.more", { n: d.contracts.length - 1 }), { "text-anchor": "end" }),
      sv("line", { x1: L, x2: cx, y1: 66, y2: 66, stroke: C.accent, "stroke-width": 6, "stroke-linecap": "round" }),
      sv("line", { x1: cx, x2: R, y1: 66, y2: 66, stroke: C.line, "stroke-width": 2 }),
      sv("line", { x1: R, x2: W - 8, y1: 66, y2: 66, stroke: C.negative, "stroke-width": 2, "stroke-dasharray": "3 3" }),
      sv("circle", { cx: L, cy: 66, r: 5, fill: C.ink }),
      sv("rect", { x: cx - 9, y: 57, width: 18, height: 18, rx: 3, fill: C.accent }),
      sv("circle", { cx: R, cy: 66, r: 5, fill: C.negative }),
      txt(Math.max(cx, 40), 44, `${c.days_left} ${t("vis.dayUnit")}`, { "text-anchor": "middle", fill: C.accent, "font-size": 18, "font-weight": 600 }),
      txt(L - 6, 96, t("vis.today")),
      txt(Math.min(Math.max(cx, 70), W - 110), 96, `${t("vis.letter")} ${shortDate(c.cancel_before)}`, { "text-anchor": "middle", fill: C.accent }),
      txt(W - 8, 96, `${t("vis.ends")} ${shortDate(c.ends_on)}`, { "text-anchor": "end", fill: C.negative }),
      txt(W - 8, H - 8, t("vis.renewal"), { "text-anchor": "end", fill: C.negative }));
  };

  switch (v.kind) {
    case "runway": return runway(v);
    case "valley": return valley(v);
    case "shift": return shift(v);
    case "days": return days(v);
    case "balance": return balance(v);
    case "countdown": return countdown(v);
    case "horizon": return horizon(v);
    case "calendar": return calendar(v);
    case "leak": return leak(v);
    case "jar": return jar(v);
    case "gauge": return gauge(v);
    case "deadline": return deadline(v);
    default: return null;
  }
}

export type DrawOptions = {
  /** The width the picture is shown at, in CSS pixels (its container's width). 320 by default. */
  width?: number;
};

/** The picture of one answer, or null when there is none (or it cannot be drawn). */
export function drawVisual(visual: AnswerVisual | null | undefined, locale: Locale, doc: Document = document,
  options: DrawOptions = {}): SVGSVGElement | null {
  if (!visual) return null;
  const width = Math.round(Math.min(Math.max(options.width ?? MAX_WIDTH, MIN_WIDTH), MAX_WIDTH));
  try {
    return draw(visual, createT(locale, answerMessages), doc, width);
  } catch {
    return null; // a picture never breaks the answer
  }
}
