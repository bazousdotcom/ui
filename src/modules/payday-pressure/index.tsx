import type { KeyboardEvent } from "react";

import { toNumber } from "../../contract/snapshot";
import { eventKey } from "../../engine/scenario";
import { Card, NightDefs, clip, dayIndex, useNightIds, useWidth } from "../../primitives";
import { addDays } from "../../format";
import { NO_FOCUS, defineModule } from "../types";

/**
 * « Nuit » — the payday orbit (community proposals "Pressure Shockwave" and "Mission Control",
 * 2026). The core is what is missing (or left) before payday; the bills are planets on the
 * arc of days between today and the salary, sized by their weight. A what-if move turns a
 * planet green and recomputes the core from the engine's own due amount.
 */
type Planet = { key: string; date: string; label: string; amount: number; movedTo: string | null; focus: boolean };
type Model = {
  available: number; due: number; gap: number; baseGap: number; asOf: string; payday: string; days: number;
  planets: Planet[]; currency: string; biggest: string | null;
};

export default defineModule<Model>({
  id: "payday-pressure",
  size: "wide",
  question: {
    fr: "Quelle pression avant le salaire ?",
    de: "Wie viel Druck bis zum Lohn?",
    it: "Quanta pressione prima dello stipendio?",
    rm: "Quant squitsch avant il salari?",
    en: "How much pressure before payday?",
  },
  reads: ["as_of", "opening_balance", "due_before_next_income", "gap_before_next_income", "next_income_date", "cycles", "base_currency"],
  messages: {
    fr: { short: "Il manque {amount} {cur} d’ici au salaire du {date}", covered: "Couvert jusqu’au {date} : il reste {amount} {cur}", missing: "IL MANQUE", left: "IL RESTE", days: "{cur} · {n} jours", today: "Aujourd’hui {date}", available: "Disponible", onAccounts: "sur tes comptes aujourd’hui", due: "Dû avant le {date}", biggest: "la plus lourde : {label}", none: "aucune facture", gapShort: "Manque", gapLeft: "Reste", find: "à trouver ou à décaler", afterAll: "après toutes ces factures", was: "était {amount} avant ton « et si »", movedTo: "→ {date}", open: "Voir {label}", aria: "{state} {amount} {cur} avant le salaire du {date} ; {n} factures sur l’arc des jours." },
    de: { short: "Bis zum Lohn am {date} fehlen {amount} {cur}", covered: "Bis {date} gedeckt: Es bleiben {amount} {cur}", missing: "ES FEHLEN", left: "ES BLEIBEN", days: "{cur} · {n} Tage", today: "Heute {date}", available: "Verfügbar", onAccounts: "heute auf deinen Konten", due: "Fällig vor dem {date}", biggest: "die schwerste: {label}", none: "keine Rechnung", gapShort: "Fehlt", gapLeft: "Bleibt", find: "zu finden oder zu verschieben", afterAll: "nach all diesen Rechnungen", was: "war {amount} vor deinem «Was wäre, wenn»", movedTo: "→ {date}", open: "{label} ansehen", aria: "{state} {amount} {cur} vor dem Lohn am {date}; {n} Rechnungen auf dem Bogen der Tage." },
    it: { short: "Mancano {amount} {cur} fino allo stipendio del {date}", covered: "Coperto fino al {date}: restano {amount} {cur}", missing: "MANCANO", left: "RESTANO", days: "{cur} · {n} giorni", today: "Oggi {date}", available: "Disponibile", onAccounts: "sui tuoi conti oggi", due: "Dovuto prima del {date}", biggest: "la più pesante: {label}", none: "nessuna fattura", gapShort: "Manca", gapLeft: "Resta", find: "da trovare o da spostare", afterAll: "dopo tutte queste fatture", was: "era {amount} prima del tuo «e se»", movedTo: "→ {date}", open: "Vedi {label}", aria: "{state} {amount} {cur} prima dello stipendio del {date}; {n} fatture sull’arco dei giorni." },
    rm: { short: "I mancan {amount} {cur} fin al salari dals {date}", covered: "Cuvrì fin ils {date}: i restan {amount} {cur}", missing: "I MANCAN", left: "I RESTAN", days: "{cur} · {n} dis", today: "Oz {date}", available: "Disponibel", onAccounts: "sin tes contos oz", due: "Debità avant ils {date}", biggest: "il pli grev: {label}", none: "nagin quint", gapShort: "Manca", gapLeft: "Resta", find: "da chattar u da spustar", afterAll: "suenter tut quests quints", was: "era {amount} avant tes «e sche»", movedTo: "→ {date}", open: "Mussar {label}", aria: "{state} {amount} {cur} avant il salari dals {date}; {n} quints sin l’artg dals dis." },
    en: { short: "You are {amount} {cur} short until the {date} payday", covered: "Covered until {date}: {amount} {cur} left", missing: "SHORT BY", left: "LEFT", days: "{cur} · {n} days", today: "Today {date}", available: "Available", onAccounts: "in your accounts today", due: "Due before {date}", biggest: "the heaviest: {label}", none: "no bill", gapShort: "Short", gapLeft: "Left", find: "to find or to move", afterAll: "after all these bills", was: "was {amount} before your what-if", movedTo: "→ {date}", open: "Open {label}", aria: "{state} {amount} {cur} before the {date} payday; {n} bills on the arc of days." },
  },
  select: (s, ctx) => {
    if (!s.next_income_date) return null;
    const focus = ctx.focus ?? NO_FOCUS;
    const payday = s.next_income_date;
    const before = s.cycles.find((c) => c.key === "before_income");
    const bills = (before?.items ?? []).filter((e) => e.direction === "outflow" && toNumber(e.amount) > 0);
    // The engine's due amount, less the bills the person moved past payday in a what-if.
    const movedOut = bills.filter((e) => (focus.moved[eventKey(e)] ?? e.date) >= payday).reduce((sum, e) => sum + toNumber(e.amount), 0);
    const due = toNumber(s.due_before_next_income) - movedOut;
    const available = toNumber(s.opening_balance);
    const planets = bills
      .map((e) => ({
        key: eventKey(e), date: e.date, label: e.label, amount: toNumber(e.amount),
        movedTo: focus.moved[eventKey(e)] ?? null,
        focus: (!focus.bill || e.label === focus.bill) && (!focus.category || e.category === focus.category) && (!focus.month || e.date.startsWith(focus.month)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
    const heaviest = [...planets].filter((p) => !p.movedTo).sort((a, b) => b.amount - a.amount)[0];
    return {
      available, due, gap: available - due, baseGap: toNumber(s.gap_before_next_income), asOf: s.as_of, payday,
      days: Math.max(dayIndex(s.as_of, payday), 1), planets, currency: s.base_currency, biggest: heaviest?.label ?? null,
    };
  },
  View: ({ model, t, fmt, onAction }) => {
    const ids = useNightIds();
    const [box, width] = useWidth<HTMLDivElement>(640, 280);
    // The drawing is 820 units wide: on a phone, amounts are drawn larger and the names stay in the detail.
    const compact = width < 520;
    const amountSize = compact ? Math.min(40, Math.round((820 / width) * 12)) : 20;
    const cur = model.currency;
    const short = model.gap < 0;
    const C = 320;
    const R = 214;
    const SWEEP = 300;
    const START = 90 + (360 - SWEEP) / 2;   // the arc opens at the bottom: today on the left, payday on the right
    const asOf = model.asOf;
    const angle = (date: string) => ((START + (dayIndex(asOf, date) / model.days) * SWEEP) * Math.PI) / 180;
    const at = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];
    const max = Math.max(1, ...model.planets.map((p) => p.amount));
    const [ax, ay] = at(angle(asOf), R);
    const [bx, by] = at(angle(model.payday), R);
    const ticks = Array.from({ length: model.days + 1 }, (_, i) => i);
    const seen = new Map<string, number>();
    const open = (label: string) => onAction({ type: "focus", focus: { bill: label } });
    const key = (label: string) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(label); } };
    const title = short
      ? t("short", { amount: fmt.num(-model.gap), cur, date: fmt.shortDate(model.payday) })
      : t("covered", { amount: fmt.num(model.gap), cur, date: fmt.shortDate(model.payday) });
    return (
      <Card question={t("question")} title={title}>
        <div className="bz-night bz-n-split">
          <div ref={box} className="bz-chart-box">
          <svg viewBox="-90 -40 820 720" role="img" aria-label={t("aria", { state: short ? t("gapShort") : t("gapLeft"), amount: fmt.num(Math.abs(model.gap)), cur, date: fmt.shortDate(model.payday), n: model.planets.length })}>
            <NightDefs ids={ids} />
            <defs>
              <linearGradient id={`${ids.glow}-arc`} gradientUnits="userSpaceOnUse" x1={ax} y1="0" x2={bx} y2="0">
                <stop offset="0" className="bz-n-arc-0" /><stop offset=".7" className="bz-n-arc-1" /><stop offset="1" className="bz-n-arc-2" />
              </linearGradient>
            </defs>
            <circle cx={C} cy={C} r={300} className={short ? "bz-n-halo-risk" : "bz-n-nebula"} filter={`url(#${ids.haze})`} />
            <g className="bz-n-spin"><circle cx={C} cy={C} r={286} className="bz-n-ring" /></g>
            <g className="bz-n-spin-rev"><circle cx={C} cy={C} r={168} className="bz-n-ring-2" /></g>
            <path d={`M${ax},${ay} A${R},${R} 0 1 1 ${bx},${by}`} fill="none" stroke={`url(#${ids.glow}-arc)`} strokeWidth={3} filter={`url(#${ids.glow})`} />
            {ticks.map((i) => {
              const a = angle(addDays(asOf, i));
              const [x1, y1] = at(a, R + 8);
              const [x2, y2] = at(a, R + (i % 7 === 0 ? 18 : 12));
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={i % 7 === 0 ? "bz-n-tick-week" : "bz-n-tick"} />;
            })}
            <circle cx={ax} cy={ay} r={6} className="bz-n-gold" filter={`url(#${ids.glow})`} />
            <circle cx={bx} cy={by} r={9} className="bz-n-ok" filter={`url(#${ids.glow})`} />
            <text x={C - 12} y={C + 150} textAnchor="end" fontSize={compact ? 26 : 18} fontWeight={600} className="bz-n-gold">{t("today", { date: fmt.shortDate(asOf) })}</text>
            <text x={C + 12} y={C + 150} fontSize={compact ? 26 : 18} fontWeight={700} className="bz-n-ok">{t("payday", { date: fmt.shortDate(model.payday) })}</text>
            {model.planets.map((p) => {
              const k = seen.get(p.date) ?? 0;
              seen.set(p.date, k + 1);
              const group = model.planets.filter((o) => o.date === p.date).length;
              const r = 9 + Math.sqrt(p.amount / max) * 24;
              const a = angle(p.date);
              const [cx, cy] = at(a, R + k * 62);
              const [lx, ly] = at(a, R + (group - 1) * 62 + 60 + k * 44);
              const anchor = Math.cos(a) > 0.25 ? "start" : Math.cos(a) < -0.25 ? "end" : "middle";
              return (
                <g key={p.key} className={`bz-n-hit bz-n-rise${p.focus ? "" : " bz-n-faded"}`}
                  role="button" tabIndex={0} aria-label={t("open", { label: p.label })} onClick={() => open(p.label)} onKeyDown={key(p.label)}>
                  <circle cx={cx} cy={cy} r={r} fill={`url(#${p.movedTo ? ids.moved : ids.risk})`} filter={`url(#${ids.glow})`} />
                  <circle cx={cx} cy={cy} r={r + 10} className={p.movedTo ? "bz-n-halo-ok" : "bz-n-halo-risk"} />
                  {p.movedTo && <circle cx={cx} cy={cy} r={r + 4} className="bz-n-moved-ring" />}
                  <text x={lx} y={ly - 4} textAnchor={anchor} fontSize={amountSize} fontWeight={700} className={p.movedTo ? "bz-n-ok" : "bz-n-ink"}>
                    {p.movedTo ? t("movedTo", { date: fmt.shortDate(p.movedTo) }) : fmt.num(p.amount)}
                  </text>
                  {!compact && <text x={lx} y={ly + 17} textAnchor={anchor} fontSize={15} className="bz-n-mut">{clip(p.label, 16)} · {fmt.shortDate(p.date)}</text>}
                </g>
              );
            })}
            <circle cx={C} cy={C} r={104} fill={`url(#${short ? ids.core : ids.coreOk})`} filter={`url(#${ids.glow})`} className="bz-n-pulse" />
            <text x={C} y={C - 22} textAnchor="middle" fontSize={13} letterSpacing={3} className="bz-n-on-core">{short ? t("missing") : t("left")}</text>
            <text x={C} y={C + 22} textAnchor="middle" fontSize={46} fontWeight={600} className="bz-n-on-core bz-n-serif">{fmt.num(Math.abs(model.gap))}</text>
            <text x={C} y={C + 48} textAnchor="middle" fontSize={13} className="bz-n-on-core">{t("days", { cur, n: model.days })}</text>
          </svg>
          </div>
          <div className="bz-n-facts">
            <div className="bz-n-fact bz-n-is-gold"><span>{t("available")}</span><strong>{fmt.num(model.available)} {cur}</strong><small>{t("onAccounts")}</small></div>
            <div className="bz-n-fact"><span>{t("due", { date: fmt.shortDate(model.payday) })}</span><strong>{fmt.num(model.due)} {cur}</strong><small>{model.biggest ? t("biggest", { label: model.biggest }) : t("none")}</small></div>
            <div className={`bz-n-fact ${short ? "bz-n-is-risk" : "bz-n-is-gold"}`}>
              <span>{short ? t("gapShort") : t("gapLeft")}</span><strong>{fmt.num(Math.abs(model.gap))} {cur}</strong>
              <small>{model.gap !== model.baseGap ? t("was", { amount: fmt.num(model.baseGap) }) : short ? t("find") : t("afterAll")}</small>
            </div>
          </div>
        </div>
      </Card>
    );
  },
});
