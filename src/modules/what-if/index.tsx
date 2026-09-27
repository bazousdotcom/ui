import { useEffect, useMemo, useRef, useState } from "react";

import type { Snapshot } from "../../contract/snapshot";
import { toNumber } from "../../contract/snapshot";
import { baseSeries, buildLevers, computeSeries, type Lever } from "../../engine/scenario";
import { tone } from "../../format";
import { Button, Card, Segmented, SHADES } from "../../primitives";
import { CashflowChart } from "../../primitives/CashflowChart";
import type { Translate } from "../../i18n";
import { defineModule, type Horizon } from "../types";

type Model = { snapshot: Snapshot };

const HORIZONS: Horizon[] = ["7", "30", "cycles", "90"];

export default defineModule<Model>({
  id: "what-if",
  size: "full",
  question: {
    fr: "Et si je décale un paiement ?",
    de: "Und wenn ich eine Zahlung verschiebe?",
    it: "E se sposto un pagamento?",
    rm: "E sche jau spustel in pajament?",
    en: "What if I move a payment?",
  },
  reads: ["points", "events", "main_cycle", "low_point", "end_of_horizon", "next_income_date", "second_income_date", "as_of", "horizon_end", "opening_balance", "base_currency"],
  messages: {
    fr: {
      title: "Trésorerie prévisionnelle", span: "{from} → {to} · {cur} équivalent", horizon: "Horizon",
      "h.7": "7J", "h.30": "30J", "h.cycles": "2 salaires", "h.90": "90J",
      base: "Base", scenario: "Scénario : {name}", overdraft: "Découvert",
      aria: "Trésorerie du {from} au {to}, point bas {low} le {date}",
      why: "Pourquoi {low} le {date} ?", whyBody: "Entre le {start} et le {end}, {out} {cur} sortent pour {in} entrés.",
      "drivers.one": "{n} poste fait {share} % des sorties :", "drivers.other": "{n} postes font {share} % des sorties :",
      levers: "Leviers", split: "{label} en 2 tranches ({a} / {b})", defer: "Reporter {label} au {date}", reserve: "Garder {amount} de réserve après le {date}",
      effectLow: "Point bas {from} → {to}", effectEnd: "Marge {date} {from} → {to}", effectSafe: "Aucun jour sous zéro jusqu’au {date}",
      result: "Scénario : point bas {low} le {date}, marge finale {end}.", save: "Enregistrer comme scénario →", noOut: "Aucune sortie prévue.",
    },
    de: {
      title: "Liquiditätsprognose", span: "{from} → {to} · {cur}-Gegenwert", horizon: "Zeitraum",
      "h.7": "7T", "h.30": "30T", "h.cycles": "2 Löhne", "h.90": "90T",
      base: "Basis", scenario: "Szenario: {name}", overdraft: "Überzug",
      aria: "Liquidität vom {from} bis {to}, Tiefpunkt {low} am {date}",
      why: "Warum {low} am {date}?", whyBody: "Zwischen {start} und {end} gehen {out} {cur} hinaus und {in} herein.",
      "drivers.one": "{n} Posten macht {share} % der Ausgaben aus:", "drivers.other": "{n} Posten machen {share} % der Ausgaben aus:",
      levers: "Hebel", split: "{label} in 2 Raten ({a} / {b})", defer: "{label} auf {date} verschieben", reserve: "{amount} Reserve nach dem {date} behalten",
      effectLow: "Tiefpunkt {from} → {to}", effectEnd: "Spielraum {date} {from} → {to}", effectSafe: "Kein Tag unter null bis {date}",
      result: "Szenario: Tiefpunkt {low} am {date}, Spielraum am Ende {end}.", save: "Als Szenario speichern →", noOut: "Keine Ausgaben geplant.",
    },
    it: {
      title: "Previsione di liquidità", span: "{from} → {to} · equivalente {cur}", horizon: "Orizzonte",
      "h.7": "7G", "h.30": "30G", "h.cycles": "2 stipendi", "h.90": "90G",
      base: "Base", scenario: "Scenario: {name}", overdraft: "Scoperto",
      aria: "Liquidità dal {from} al {to}, minimo {low} il {date}",
      why: "Perché {low} il {date}?", whyBody: "Tra il {start} e il {end} escono {out} {cur} ed entrano {in}.",
      "drivers.one": "{n} voce fa il {share} % delle uscite:", "drivers.other": "{n} voci fanno il {share} % delle uscite:",
      levers: "Leve", split: "{label} in 2 rate ({a} / {b})", defer: "Rinviare {label} al {date}", reserve: "Tenere {amount} di riserva dopo il {date}",
      effectLow: "Minimo {from} → {to}", effectEnd: "Margine {date} {from} → {to}", effectSafe: "Nessun giorno sotto zero fino al {date}",
      result: "Scenario: minimo {low} il {date}, margine finale {end}.", save: "Salva come scenario →", noOut: "Nessuna uscita prevista.",
    },
    rm: {
      title: "Prognosa da liquiditad", span: "{from} → {to} · equivalent {cur}", horizon: "Orizont",
      "h.7": "7D", "h.30": "30D", "h.cycles": "2 salaris", "h.90": "90D",
      base: "Basa", scenario: "Scenari: {name}", overdraft: "Surtratga",
      aria: "Liquiditad dals {from} fin ils {to}, punct bass {low} ils {date}",
      why: "Pertge {low} ils {date}?", whyBody: "Tranter ils {start} ed ils {end} sortan {out} {cur} ed entran {in}.",
      "drivers.one": "{n} post fa {share} % da las sortidas:", "drivers.other": "{n} posts fan {share} % da las sortidas:",
      levers: "Levas", split: "{label} en 2 ratas ({a} / {b})", defer: "Spustar {label} sin ils {date}", reserve: "Tegnair {amount} reserva suenter ils {date}",
      effectLow: "Punct bass {from} → {to}", effectEnd: "Margin {date} {from} → {to}", effectSafe: "Nagin di sut nulla fin ils {date}",
      result: "Scenari: punct bass {low} ils {date}, margin final {end}.", save: "Memorisar sco scenari →", noOut: "Naginas sortidas previsas.",
    },
    en: {
      title: "Cash-flow forecast", span: "{from} → {to} · {cur} equivalent", horizon: "Horizon",
      "h.7": "7D", "h.30": "30D", "h.cycles": "2 paydays", "h.90": "90D",
      base: "Baseline", scenario: "Scenario: {name}", overdraft: "Overdraft",
      aria: "Cash from {from} to {to}, low point {low} on {date}",
      why: "Why {low} on {date}?", whyBody: "Between {start} and {end}, {out} {cur} goes out and {in} comes in.",
      "drivers.one": "{n} item makes up {share}% of outflows:", "drivers.other": "{n} items make up {share}% of outflows:",
      levers: "Levers", split: "{label} in 2 instalments ({a} / {b})", defer: "Move {label} to {date}", reserve: "Keep {amount} in reserve after {date}",
      effectLow: "Low point {from} → {to}", effectEnd: "Margin {date} {from} → {to}", effectSafe: "No day below zero until {date}",
      result: "Scenario: low point {low} on {date}, final margin {end}.", save: "Save as scenario →", noOut: "No outflows planned.",
    },
  },
  select: (s) => (s.points.length > 0 ? { snapshot: s } : null),
  View: ({ model, t, fmt, ctx, onAction }) => {
    const s = model.snapshot;
    const cur = s.base_currency;
    const base = useMemo(() => baseSeries(s), [s]);
    const levers = useMemo(() => buildLevers(s), [s]);
    const touched = useRef(false);
    const [active, setActive] = useState<Set<string>>(new Set());
    // The first lever starts on, so the scenario line is visible on arrival.
    useEffect(() => {
      if (!touched.current) setActive(levers[0] ? new Set([levers[0].id]) : new Set());
    }, [levers]);
    const scenario = useMemo(() => (active.size > 0 ? computeSeries(s, active, levers) : null), [s, active, levers]);
    const chosen = levers.filter((l) => active.has(l.id));
    const title = (l: Lever) => leverTitle(l, t, fmt.num, fmt.shortDate);
    const drivers = s.main_cycle.drivers;
    const share = drivers.reduce((sum, d) => sum + toNumber(d.share), 0);
    const markers = groupMarkers(s, fmt.num);

    return (
      <div className="bz-split">
        <Card
          className="bz-span-2"
          question={t("question")}
          title={t("title")}
          meta={t("span", { from: fmt.shortDate(s.as_of), to: fmt.shortDate(s.horizon_end), cur })}
          actions={
            <Segmented
              label={t("horizon")}
              value={ctx.horizon}
              options={HORIZONS.map((h) => ({ key: h, label: t(`h.${h}`) }))}
              onChange={(h) => onAction({ type: "set_horizon", horizon: h })}
            />
          }
        >
          <CashflowChart
            base={base}
            scenario={scenario}
            today={s.as_of}
            incomes={[s.next_income_date, s.second_income_date].filter((d): d is string => !!d)}
            markers={markers}
            labels={{
              today: t("today"),
              payday: (date) => t("payday", { date }),
              aria: t("aria", { from: fmt.shortDate(s.as_of), to: fmt.shortDate(s.horizon_end), low: fmt.num(base.low.balance), date: fmt.shortDate(base.low.date) }),
            }}
          />
          <div className="bz-legend">
            <span><i className="bz-sw bz-sw-base" />{t("base")}</span>
            {scenario && <span><i className="bz-sw bz-sw-scenario" />{t("scenario", { name: chosen.map(title).join(" + ") })}</span>}
            <span><i className="bz-sw bz-sw-danger" />{t("overdraft")}</span>
          </div>
        </Card>

        <Card title={t("why", { low: fmt.num(s.low_point.balance), date: fmt.shortDate(s.low_point.date) })}>
          <p className="bz-body">
            {t("whyBody", { start: fmt.shortDate(s.main_cycle.start), end: fmt.shortDate(s.main_cycle.end), out: fmt.num(s.main_cycle.total_out), in: fmt.num(s.main_cycle.total_in), cur })}
            {drivers.length > 0 && ` ${t("drivers", { n: drivers.length, share: fmt.num(share) })}`}
          </p>
          <div className="bz-bars">
            {drivers.map((d, i) => (
              <div className="bz-bar" key={`${d.label}-${d.date}`}>
                <i className={SHADES[Math.min(i, 3)]} style={{ width: `${Math.max(6, toNumber(d.share) * 2.4)}px` }} />
                <span>{d.label} <em>{fmt.shortDate(d.date)}</em></span>
                <strong>{fmt.num(d.amount)}</strong>
              </div>
            ))}
            {drivers.length === 0 && <p className="bz-empty">{t("noOut")}</p>}
          </div>
          {levers.length > 0 && (
            <>
              <hr className="bz-rule" />
              <p className="bz-eyebrow">{t("levers")}</p>
              <div className="bz-levers">
                {levers.map((lever) => {
                  const solo = computeSeries(s, new Set([lever.id]), levers);
                  const on = active.has(lever.id);
                  return (
                    <label className={on ? "bz-lever bz-on" : "bz-lever"} key={lever.id}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          touched.current = true;
                          setActive((prev) => {
                            const next = new Set(prev);
                            if (next.has(lever.id)) next.delete(lever.id);
                            else next.add(lever.id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        <strong>{title(lever)}</strong>
                        <em>
                          {lever.kind === "reserve" && solo.low.balance >= 0
                            ? t("effectSafe", { date: fmt.shortDate(s.horizon_end) })
                            : solo.low.balance === base.low.balance
                              ? <>{t("effectEnd", { date: fmt.shortDate(s.horizon_end), from: fmt.signed(base.end.balance), to: "" })}<b className={`bz-${tone(solo.end.balance)}`}>{fmt.signed(solo.end.balance)}</b></>
                              : <>{t("effectLow", { from: fmt.num(base.low.balance), to: "" })}<b className={`bz-${tone(solo.low.balance)}`}>{fmt.num(solo.low.balance)}</b></>}
                        </em>
                      </span>
                    </label>
                  );
                })}
              </div>
              {scenario && (
                <p className="bz-note">{t("result", { low: fmt.num(scenario.low.balance), date: fmt.shortDate(scenario.low.date), end: fmt.signed(scenario.end.balance) })}</p>
              )}
              <Button
                variant="ghost"
                disabled={!scenario}
                onClick={() =>
                  scenario &&
                  onAction({
                    type: "save_scenario",
                    name: chosen.map(title).join(" + ").slice(0, 120),
                    levers: chosen.map((l) => ({ id: l.id, kind: l.kind, label: title(l), ref_id: l.event.ref_id, target: l.target, amount: l.reserve ? String(l.reserve) : l.event.amount })),
                    low_before: String(base.low.balance),
                    low_after: String(scenario.low.balance),
                  })
                }
              >
                {t("save")}
              </Button>
            </>
          )}
        </Card>
      </div>
    );
  },
});

function leverTitle(l: Lever, t: Translate, num: (v: number) => string, short: (d: string) => string): string {
  const amount = toNumber(l.event.amount);
  if (l.kind === "split") return t("split", { label: l.event.label, a: num(amount / 2), b: num(amount / 2) });
  if (l.kind === "reserve") return t("reserve", { amount: num(l.reserve ?? 0), date: short(l.event.date) });
  return t("defer", { label: l.event.label, date: short(l.target) });
}

/** Up to three annotated drops: the main cycle's drivers, grouped by day. */
function groupMarkers(s: Snapshot, num: (v: number) => string): { date: string; label: string }[] {
  const byDate = new Map<string, { labels: string[]; amount: number }>();
  for (const d of s.main_cycle.drivers) {
    const g = byDate.get(d.date) ?? { labels: [], amount: 0 };
    g.labels.push(shorten(d.label));
    g.amount += toNumber(d.amount);
    byDate.set(d.date, g);
  }
  return [...byDate.entries()].slice(0, 3).map(([date, g]) => ({
    date,
    label: `${g.labels.length <= 2 ? g.labels.join(" + ") : `${g.labels[0]} +${g.labels.length - 1}`} −${num(g.amount)}`,
  }));
}

/** Keep whole words up to 18 characters: "Carte de crédit solde" → "Carte de crédit". */
function shorten(label: string): string {
  if (label.length <= 18) return label;
  let out = "";
  for (const word of label.split(/\s+/)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 18) break;
    out = next;
  }
  return out || label.slice(0, 18);
}
