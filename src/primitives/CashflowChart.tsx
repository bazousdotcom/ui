import { useEffect, useRef, useState } from "react";

import type { IsoDate } from "../contract/snapshot";
import type { SeriesPoint, Series } from "../engine/scenario";
import { num, shortDate } from "../format";

export type ChartLabels = {
  today: string;
  payday: (date: string) => string;
  aria: string;
};

type Props = {
  base: Series;
  scenario?: Series | null;
  today: IsoDate;
  incomes: IsoDate[];
  markers: { date: IsoDate; label: string }[];
  labels: ChartLabels;
};

// The drawing is laid out at the container's real width, so 11 px labels stay 11 px on a phone.
const DEFAULT_W = 880;
const PAD = { left: 52, right: 10, top: 40, bottom: 34 };

export function CashflowChart(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? DEFAULT_W);
      if (w > 0) setWidth(Math.max(300, w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="bz-chart-box">
      <Drawing {...props} W={width} />
    </div>
  );
}

function Drawing({ base, scenario, today, incomes, markers, labels, W }: Props & { W: number }) {
  const H = W < 560 ? 260 : 330;
  const compact = W < 560;
  const all = [...base.points, ...(scenario?.points ?? [])].flatMap((p) => (p.peak === undefined ? [p.balance] : [p.balance, p.peak]));
  const n = base.points.length;
  if (n === 0) return null;
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all), 4);
  const min = ticks[0] ?? 0;
  const max = ticks[ticks.length - 1] ?? 1;
  const x = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  const idx = (date: IsoDate) => base.points.findIndex((p) => p.date === date);
  const balanceOn = (date: IsoDate) => base.points[idx(date)]?.balance ?? 0;
  const zeroY = y(0);
  const bottom = H - PAD.bottom;
  const lowI = idx(base.low.date);
  const lowX = x(lowI);

  const axis: { i: number; anchor: "start" | "middle" | "end" }[] = Math.abs(lowX - x(0)) > (compact ? 110 : 70) ? [{ i: 0, anchor: "start" }] : [];
  for (const m of markers) {
    const i = idx(m.date);
    if (!compact && i > 0 && i < n - 1 && axis.every((a) => Math.abs(x(a.i) - x(i)) > 60) && Math.abs(x(i) - lowX) > 70) axis.push({ i, anchor: "middle" });
  }
  if (Math.abs(x(n - 1) - lowX) > (compact ? 110 : 70)) axis.push({ i: n - 1, anchor: "end" });
  // "Aujourd'hui" moves up one line when a payday label sits right next to it.
  const todayX = x(idx(today));
  const crowded = incomes.some((d) => idx(d) >= 0 && Math.abs(x(idx(d)) - todayX) < 90);
  const first = base.points[0];
  const last = base.points[n - 1];

  return (
    <svg className="bz-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.aria}>
      {zeroY < bottom && <rect x={PAD.left} y={zeroY} width={W - PAD.left - PAD.right} height={bottom - zeroY} className="bz-chart-danger" />}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? "bz-chart-zero" : "bz-chart-grid"} />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className={t === 0 ? "bz-chart-tick bz-strong" : "bz-chart-tick"}>{num(t)}</text>
        </g>
      ))}
      {incomes.map((d) => idx(d) >= 0 && (
        <g key={d}>
          <line x1={x(idx(d))} x2={x(idx(d))} y1={PAD.top} y2={bottom} className="bz-chart-income" />
          <text x={x(idx(d)) + 4} y={PAD.top - 10} className="bz-chart-label bz-income">{labels.payday(shortDate(d))}</text>
        </g>
      ))}
      {idx(today) >= 0 && (
        <g>
          <line x1={todayX} x2={todayX} y1={PAD.top} y2={bottom} className="bz-chart-today" />
          <text x={todayX + 4} y={crowded ? PAD.top - 26 : PAD.top - 10} className="bz-chart-label bz-today">{labels.today}</text>
        </g>
      )}
      {scenario && <polyline points={polyline(scenario.points, x, y)} className="bz-chart-scenario" />}
      <polyline points={polyline(base.points, x, y)} className="bz-chart-base" />
      {markers.map((m) => idx(m.date) >= 0 && (
        <g key={`${m.date}-${m.label}`}>
          <circle cx={x(idx(m.date))} cy={y(balanceOn(m.date))} r="5" className="bz-chart-dot" />
          {!compact && <text x={x(idx(m.date)) + 10} y={y(balanceOn(m.date)) + 4} className="bz-chart-label">{m.label}</text>}
        </g>
      ))}
      {lowI >= 0 && (
        <g>
          <circle cx={lowX} cy={y(base.low.balance)} r="7" className="bz-chart-low" />
          <text x={lowX} y={H - 8} textAnchor={lowX > W - 60 ? "end" : "middle"} className="bz-chart-label bz-low">
            {shortDate(base.low.date)} · {num(base.low.balance)}
          </text>
        </g>
      )}
      {axis.map((a) => {
        const p = a.i === 0 ? first : a.i === n - 1 ? last : base.points[a.i];
        return p ? <text key={a.i} x={x(a.i)} y={H - 8} textAnchor={a.anchor} className="bz-chart-tick">{shortDate(p.date)}</text> : null;
      })}
    </svg>
  );
}

/** One vertex per movement; a pay day that also pays bills shows its peak. */
function polyline(points: SeriesPoint[], x: (i: number) => number, y: (v: number) => number): string {
  const out: string[] = [];
  let prev: number | null = null;
  points.forEach((p, i) => {
    if (prev === null || p.balance !== prev || p.peak !== undefined || i === points.length - 1) {
      if (p.peak !== undefined) out.push(`${x(i).toFixed(1)},${y(p.peak).toFixed(1)}`);
      out.push(`${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`);
    }
    prev = p.balance;
  });
  return out.join(" ");
}

/** Round ticks that always include 0 and enclose the data (8’000 / 4’000 / 0 / −4’000). */
export function niceTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / Math.max(count, 1) || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  if (ticks.length < 2) ticks.push(Math.round(lo + step));
  return ticks;
}
