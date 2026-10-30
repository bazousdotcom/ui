import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { Answer, RentalLeverKey, RentalOutcome, RentalProperty, WaterfallVisual } from "../answers/contract";
import { toNumber } from "../contract/snapshot";
import { createFormatters, type Formatters } from "../format";
import { createT, type Catalog, type Locale, type Translate } from "../i18n";
import { Card, NightDefs, Segmented, useNightIds, useWidth } from "../primitives";

/**
 * « Nuit » — a property you let, as a flow of light (kit 0.8). The year's rent pours from the left and splits
 * into what the owner costs, the loan interest and the local tax take; what is left glows green. You can:
 *
 * - drill down: all the properties → one property → its costs line by line; the breadcrumb rolls back up;
 * - roll up the unit: per year, per month, or per 100 of rent;
 * - pull « what if » levers (rent +5 %, costs −10 %, rate −0.5 pt, one empty month): the flow morphs to the
 *   engine's figures for that combination, the year as it was stays as a dashed ghost.
 *
 * The engine computes every figure, including every combination of levers; the scene only picks and draws
 * (the unit is a change of scale, like the river's weeks). No network, no storage. Motion follows
 * `prefers-reduced-motion`: with it, the particles and the morph are left out.
 */

export type RentalSceneProps = {
  /** The `rental-yield` answer: its question and tone, and the `waterfall` visual with `properties`. */
  answer: Pick<Answer, "question" | "tone"> & { visual: WaterfallVisual };
  locale: Locale;
  /** The household opens its profile to give or correct the figures (the host decides what that does). */
  onEdit?: () => void;
};

type Unit = "year" | "month" | "per100";
export type RentalLevel = { kind: "portfolio" } | { kind: "property"; i: number } | { kind: "costs"; i: number };
type Sink = "costs" | "interest" | "local_tax" | "gain";
type FlowNode = { key: string; label: string; value: number; cls: string; drill?: RentalLevel };
export type Flow = { from: string; to: string; value: number; cls: string };
type Scene = { left: FlowNode[]; right: FlowNode[]; flows: Flow[]; base: number };

const SINKS: Sink[] = ["costs", "interest", "local_tax", "gain"];
const MORPH_MS = 650;

export const rentalMessages: Catalog = {
  fr: {
    was: "réel {amount}", all: "Tous les biens", rent: "Loyers", costs: "Charges", interest: "Intérêts", local_tax: "Impôt local", gain: "Gain net",
    pocket: "Ta poche", undetailed: "Charges non détaillées", "title.gain": "{name} : {amount} {cur} de gain net par an", "title.loss": "{name} : te coûte {amount} {cur} par an",
    "title.whatif": "Avec tes « et si » : {amount} {cur} de gain net par an", "title.whatif.loss": "Avec tes « et si » : te coûte {amount} {cur} par an",
    "title.costs": "Où partent les {amount} {cur} de charges de {name}", "title.all": "{n} biens : {amount} {cur} de gain net par an",
    unit: "Unité", year: "/ an", month: "/ mois", per100: "pour 100 de loyer", levers: "Et si…", reset: "Comme l’année réelle",
    "kpi.gain": "Gain net", "kpi.roe": "Sur ton apport", "kpi.cash": "Trésorerie", "kpi.lever": "Effet de levier", "kpi.perMonth": "{amount} / mois",
    "kpi.roe.none": "dette ≥ valeur", "kpi.equity": "apport {amount} {cur}", "kpi.cash.none": "capital remboursé non donné",
    "lever.up": "Le crédit travaille pour toi : il coûte {rate} %, le bien rapporte {net} % avant crédit",
    "lever.down": "Le crédit te coûte : {rate} %, plus que les {net} % que rapporte le bien",
    "lever.none": "Sans crédit sur ce bien", share: "{p} % du loyer reste", ghost: "l’année réelle", open: "Ouvrir {name}",
    edit: "Corriger les chiffres", "costs.hint": "Donne le détail de tes charges dans ton profil pour les voir ligne par ligne.",
    note: "Chiffres du moteur Bazous, en {cur}. Dans les « et si », l’impôt local est gardé tel quel.",
    aria: "Flux de l’année : {rent} {cur} de loyers, {costs} de charges, {interest} d’intérêts, {tax} d’impôt local, {gain} de gain net.",
  },
  de: {
    was: "echt {amount}", all: "Alle Liegenschaften", rent: "Mieten", costs: "Kosten", interest: "Zinsen", local_tax: "Lokale Steuer", gain: "Nettogewinn",
    pocket: "Deine Tasche", undetailed: "Kosten ohne Detail", "title.gain": "{name}: {amount} {cur} Nettogewinn pro Jahr", "title.loss": "{name}: kostet dich {amount} {cur} pro Jahr",
    "title.whatif": "Mit deinem «Was wäre, wenn»: {amount} {cur} Nettogewinn pro Jahr", "title.whatif.loss": "Mit deinem «Was wäre, wenn»: kostet dich {amount} {cur} pro Jahr",
    "title.costs": "Wohin die {amount} {cur} Kosten von {name} gehen", "title.all": "{n} Liegenschaften: {amount} {cur} Nettogewinn pro Jahr",
    unit: "Einheit", year: "/ Jahr", month: "/ Monat", per100: "pro 100 Miete", levers: "Was wäre, wenn…", reset: "Wie das echte Jahr",
    "kpi.gain": "Nettogewinn", "kpi.roe": "Aufs Eigenkapital", "kpi.cash": "Liquidität", "kpi.lever": "Hebelwirkung", "kpi.perMonth": "{amount} / Monat",
    "kpi.roe.none": "Schuld ≥ Wert", "kpi.equity": "Eigenkapital {amount} {cur}", "kpi.cash.none": "Amortisation nicht angegeben",
    "lever.up": "Der Kredit arbeitet für dich: Er kostet {rate} %, die Liegenschaft bringt vor Finanzierung {net} %",
    "lever.down": "Der Kredit kostet dich: {rate} %, mehr als die {net} %, die die Liegenschaft bringt",
    "lever.none": "Kein Kredit auf dieser Liegenschaft", share: "{p} % der Miete bleiben", ghost: "das echte Jahr", open: "{name} öffnen",
    edit: "Zahlen korrigieren", "costs.hint": "Gib die Kosten im Profil im Detail an, um sie Zeile für Zeile zu sehen.",
    note: "Zahlen des Bazous-Rechenkerns, in {cur}. Im «Was wäre, wenn» bleibt die lokale Steuer unverändert.",
    aria: "Fluss des Jahres: {rent} {cur} Mieten, {costs} Kosten, {interest} Zinsen, {tax} lokale Steuer, {gain} Nettogewinn.",
  },
  it: {
    was: "reale {amount}", all: "Tutti gli immobili", rent: "Affitti", costs: "Spese", interest: "Interessi", local_tax: "Imposta locale", gain: "Guadagno netto",
    pocket: "Di tasca tua", undetailed: "Spese non dettagliate", "title.gain": "{name}: {amount} {cur} di guadagno netto all’anno", "title.loss": "{name}: ti costa {amount} {cur} all’anno",
    "title.whatif": "Con i tuoi «e se»: {amount} {cur} di guadagno netto all’anno", "title.whatif.loss": "Con i tuoi «e se»: ti costa {amount} {cur} all’anno",
    "title.costs": "Dove vanno i {amount} {cur} di spese di {name}", "title.all": "{n} immobili: {amount} {cur} di guadagno netto all’anno",
    unit: "Unità", year: "/ anno", month: "/ mese", per100: "su 100 di affitto", levers: "E se…", reset: "Come l’anno reale",
    "kpi.gain": "Guadagno netto", "kpi.roe": "Sul capitale proprio", "kpi.cash": "Liquidità", "kpi.lever": "Effetto leva", "kpi.perMonth": "{amount} / mese",
    "kpi.roe.none": "debito ≥ valore", "kpi.equity": "capitale {amount} {cur}", "kpi.cash.none": "capitale rimborsato non indicato",
    "lever.up": "Il credito lavora per te: costa il {rate} %, l’immobile rende il {net} % prima del credito",
    "lever.down": "Il credito ti costa: il {rate} %, più del {net} % che rende l’immobile",
    "lever.none": "Nessun credito su questo immobile", share: "resta il {p} % dell’affitto", ghost: "l’anno reale", open: "Apri {name}",
    edit: "Correggi le cifre", "costs.hint": "Indica il dettaglio delle spese nel profilo per vederle riga per riga.",
    note: "Cifre del motore Bazous, in {cur}. Negli «e se» l’imposta locale resta invariata.",
    aria: "Flusso dell’anno: {rent} {cur} di affitti, {costs} di spese, {interest} di interessi, {tax} di imposta locale, {gain} di guadagno netto.",
  },
  rm: {
    was: "real {amount}", all: "Tut ils bains", rent: "Fitgs", costs: "Custs", interest: "Tschains", local_tax: "Taglia locala", gain: "Gudogn net",
    pocket: "Tia giaglioffa", undetailed: "Custs senza detagl", "title.gain": "{name}: {amount} {cur} gudogn net per onn", "title.loss": "{name}: ta custa {amount} {cur} per onn",
    "title.whatif": "Cun tes «e sche»: {amount} {cur} gudogn net per onn", "title.whatif.loss": "Cun tes «e sche»: ta custa {amount} {cur} per onn",
    "title.costs": "Nua che van ils {amount} {cur} custs da {name}", "title.all": "{n} bains: {amount} {cur} gudogn net per onn",
    unit: "Unitad", year: "/ onn", month: "/ mais", per100: "per 100 fitg", levers: "E sche…", reset: "Sco l’onn real",
    "kpi.gain": "Gudogn net", "kpi.roe": "Sin tes chapital agen", "kpi.cash": "Liquiditad", "kpi.lever": "Effect da levitad", "kpi.perMonth": "{amount} / mais",
    "kpi.roe.none": "debit ≥ valur", "kpi.equity": "chapital agen {amount} {cur}", "kpi.cash.none": "chapital restituì betg indicà",
    "lever.up": "Il credit lavura per tai: el custa {rate} %, il bain porta {net} % avant il credit",
    "lever.down": "Il credit ta custa: {rate} %, dapli che ils {net} % ch’il bain porta",
    "lever.none": "Nagin credit sin quest bain", share: "{p} % dal fitg resta", ghost: "l’onn real", open: "Avrir {name}",
    edit: "Curreger las cifras", "costs.hint": "Inditgescha il detagl dals custs en tes profil per als vesair lingia per lingia.",
    note: "Cifras dal motor Bazous, en {cur}. En ils «e sche» resta la taglia locala sco ella è.",
    aria: "Flux da l’onn: {rent} {cur} fitgs, {costs} custs, {interest} tschains, {tax} taglia locala, {gain} gudogn net.",
  },
  en: {
    was: "real {amount}", all: "All properties", rent: "Rents", costs: "Costs", interest: "Interest", local_tax: "Local tax", gain: "Net gain",
    pocket: "Your pocket", undetailed: "Costs not detailed", "title.gain": "{name}: {amount} {cur} net gain a year", "title.loss": "{name}: costs you {amount} {cur} a year",
    "title.whatif": "With your what-ifs: {amount} {cur} net gain a year", "title.whatif.loss": "With your what-ifs: costs you {amount} {cur} a year",
    "title.costs": "Where the {amount} {cur} of costs of {name} go", "title.all": "{n} properties: {amount} {cur} net gain a year",
    unit: "Unit", year: "/ year", month: "/ month", per100: "per 100 of rent", levers: "What if…", reset: "As the real year",
    "kpi.gain": "Net gain", "kpi.roe": "On your equity", "kpi.cash": "Cash flow", "kpi.lever": "Leverage", "kpi.perMonth": "{amount} / month",
    "kpi.roe.none": "debt ≥ value", "kpi.equity": "equity {amount} {cur}", "kpi.cash.none": "capital repaid not given",
    "lever.up": "The loan works for you: it costs {rate}%, the property earns {net}% before financing",
    "lever.down": "The loan costs you: {rate}%, more than the {net}% the property earns",
    "lever.none": "No loan on this property", share: "{p}% of the rent is left", ghost: "the real year", open: "Open {name}",
    edit: "Correct the figures", "costs.hint": "Give your costs line by line in your profile to see them here.",
    note: "Figures from the Bazous engine, in {cur}. In the what-ifs, the local tax is kept as it was.",
    aria: "The year's flow: {rent} {cur} of rent, {costs} of costs, {interest} of interest, {tax} of local tax, {gain} of net gain.",
  },
};

/** The outcome for the pulled levers, as the engine computed it (keys in the order of `levers`). */
export function outcomeKey(levers: { key: RentalLeverKey }[], pulled: ReadonlySet<RentalLeverKey>): string {
  return levers.filter((l) => pulled.has(l.key)).map((l) => l.key).join("+");
}

/**
 * Splits sources into sinks in order, like two stacked bars side by side: the ribbons of a Sankey drawing.
 * Every unit leaving a source reaches a sink; nothing is created or lost (the sums of both sides match).
 */
export function pour(sources: { key: string; value: number }[], sinks: { key: string; value: number; cls: string }[]): Flow[] {
  const flows: Flow[] = [];
  let s = 0, left = sources[0]?.value ?? 0;
  for (const sink of sinks) {
    let need = sink.value;
    while (need > 1e-9 && s < sources.length) {
      const take = Math.min(need, left);
      if (take > 1e-9) flows.push({ from: sources[s]!.key, to: sink.key, value: take, cls: sink.cls });
      need -= take; left -= take;
      if (left <= 1e-9) { s += 1; left = sources[s]?.value ?? 0; }
    }
  }
  return flows;
}

function propertyFlow(p: RentalProperty, o: RentalOutcome, t: Translate, prefix = "") {
  const take: Record<Sink, number> = {
    costs: toNumber(o.costs_per_year), interest: toNumber(o.interest_per_year), local_tax: toNumber(o.local_tax_per_year),
    gain: Math.max(toNumber(o.net_gain), 0),
  };
  const pocket = Math.max(-toNumber(o.net_gain), 0);
  const left: FlowNode[] = [{ key: `${prefix}rent`, label: prefix ? p.name : t("rent"), value: toNumber(o.rent_per_year), cls: "bz-rs-rent" }];
  if (pocket > 0) left.push({ key: `${prefix}pocket`, label: t("pocket"), value: pocket, cls: "bz-rs-pocket" });
  const right: FlowNode[] = SINKS.filter((k) => take[k] > 0).map((k) => ({ key: k, label: t(k), value: take[k], cls: `bz-rs-${k}` }));
  return { left, right, flows: pour(left, right) };
}

/** What a level shows: the nodes on each side and the ribbons between them, from the engine's figures. */
export function buildScene(v: WaterfallVisual, level: RentalLevel, pulled: ReadonlySet<RentalLeverKey>, t: Translate): Scene | null {
  const props = v.properties ?? [];
  if (props.length === 0) return null;
  if (level.kind === "costs") {
    const p = props[level.i]!;
    const costs = toNumber(p.outcomes[""]!.costs_per_year);
    const lines = p.cost_lines.length ? p.cost_lines : [{ label: t("undetailed"), amount: String(costs) }];
    const right = lines.map((l, j) => ({ key: `line-${j}`, label: l.label, value: toNumber(l.amount), cls: `bz-rs-line bz-rs-c${j % 8}` }));
    const left = [{ key: "costs", label: t("costs"), value: costs, cls: "bz-rs-costs" }];
    return { left, right, flows: pour(left, right), base: costs };
  }
  if (level.kind === "property") {
    const p = props[level.i]!;
    const o = p.outcomes[outcomeKey(p.levers, pulled)] ?? p.outcomes[""]!;
    const f = propertyFlow(p, o, t);
    const right = f.right.map((n): FlowNode => (n.key === "costs" ? { ...n, drill: { kind: "costs", i: level.i } } : n));
    return { ...f, right, base: toNumber(o.rent_per_year) };
  }
  // The portfolio: every property's rent on the left, the sinks added up on the right.
  const left: FlowNode[] = [], flows: Flow[] = [], sums = new Map<string, FlowNode>();
  let pocket: FlowNode | null = null;
  props.forEach((p, i) => {
    const f = propertyFlow(p, p.outcomes[""]!, t, `p${i}-`);
    left.push({ ...f.left[0]!, drill: { kind: "property", i } });
    if (f.left[1]) pocket = pocket ? { ...pocket, value: pocket.value + f.left[1].value } : { ...f.left[1], key: "pocket" };
    for (const n of f.right) { const s = sums.get(n.key); sums.set(n.key, s ? { ...s, value: s.value + n.value } : { ...n }); }
    flows.push(...f.flows.map((fl) => ({ ...fl, from: fl.from.endsWith("pocket") ? "pocket" : fl.from })));
  });
  if (pocket) left.push(pocket);
  const right = SINKS.map((k) => sums.get(k)).filter((n): n is FlowNode => !!n);
  return { left, right, flows, base: props.reduce((s, p) => s + toNumber(p.outcomes[""]!.rent_per_year), 0) };
}

/**
 * Values that glide from one state to the next (a lever, a unit), or jump when motion is reduced or when the
 * drawing itself changes (a drill: other nodes, other ribbons; the new level enters with its own fade).
 */
function useMorph(target: Record<string, number>, still: boolean): Record<string, number> {
  const shape = Object.keys(target).sort().join("|");
  const [state, setState] = useState({ shape, shown: target });
  const from = useRef(target);
  const key = JSON.stringify(target);
  const jumped = state.shape !== shape;
  useEffect(() => {
    if (still || jumped || typeof requestAnimationFrame === "undefined") { from.current = target; setState({ shape, shown: target }); return; }
    const start = performance.now(), origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min((now - start) / MORPH_MS, 1), e = 1 - (1 - k) ** 3;
      const next: Record<string, number> = {};
      for (const name of new Set([...Object.keys(origin), ...Object.keys(target)])) {
        next[name] = (origin[name] ?? 0) + ((target[name] ?? 0) - (origin[name] ?? 0)) * e;
      }
      from.current = next;
      setState({ shape, shown: next });
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // The target is compared by value (its JSON), not by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, still]);
  return jumped ? target : state.shown;
}

function useReducedMotion(): boolean {
  const query = () => typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const q = query();
    if (!q) return;
    const change = () => setReduced(q.matches);
    q.addEventListener?.("change", change);
    return () => q.removeEventListener?.("change", change);
  }, []);
  return reduced;
}

export function RentalScene({ answer, locale, onEdit }: RentalSceneProps) {
  const v = answer.visual;
  const props = v.properties ?? [];
  const t = useMemo(() => createT(locale, rentalMessages), [locale]);
  const fmt = useMemo(() => createFormatters(locale), [locale]);
  const reduced = useReducedMotion();
  const [level, setLevel] = useState<RentalLevel>(props.length > 1 ? { kind: "portfolio" } : { kind: "property", i: 0 });
  const [unit, setUnit] = useState<Unit>("year");
  const [pulled, setPulled] = useState<ReadonlySet<RentalLeverKey>>(new Set());
  if (props.length === 0) return null;
  const at = level.kind === "portfolio" ? null : props[level.i]!;
  const cur = at?.currency ?? v.total?.currency ?? v.currency;
  const go = (next: RentalLevel) => {
    if (next.kind === "portfolio" || (at && next.kind === "property" && props[next.i] !== at)) setPulled(new Set());
    setLevel(next);
  };
  const toggle = (k: RentalLeverKey) => setPulled((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const o = at ? at.outcomes[outcomeKey(at.levers, pulled)] ?? at.outcomes[""]! : null;
  const whatIf = pulled.size > 0 && level.kind === "property";

  let title: string;
  if (level.kind === "costs") title = t("title.costs", { amount: fmt.num(at!.outcomes[""]!.costs_per_year), cur, name: at!.name });
  else if (level.kind === "portfolio") title = v.total ? t("title.all", { n: props.length, amount: fmt.num(v.total.net_gain), cur }) : t("all");
  else {
    const gain = toNumber(o!.net_gain);
    const key = whatIf ? (gain < 0 ? "title.whatif.loss" : "title.whatif") : gain < 0 ? "title.loss" : "title.gain";
    title = t(key, { name: at!.name, amount: fmt.num(Math.abs(gain)), cur });
  }

  const crumbs: { label: string; to: RentalLevel }[] = [];
  if (props.length > 1) crumbs.push({ label: t("all"), to: { kind: "portfolio" } });
  if (at) crumbs.push({ label: at.name, to: { kind: "property", i: (level as { i: number }).i } });
  if (level.kind === "costs") crumbs.push({ label: t("costs"), to: level });

  return (
    <Card question={answer.question} title={title} className={`bz-rental bz-rental-${answer.tone}`}>
      <div className="bz-night bz-rs">
        <div className="bz-n-bar">
          <nav className="bz-rs-crumbs" aria-label={t("all")}>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 && <span className="bz-rs-sep" aria-hidden="true">›</span>}
                {i < crumbs.length - 1
                  ? <button type="button" className="bz-rs-crumb" onClick={() => go(c.to)}>{c.label}</button>
                  : <strong aria-current="page">{c.label}</strong>}
              </span>
            ))}
          </nav>
          <Segmented label={t("unit")} value={unit} onChange={setUnit}
            options={[{ key: "year", label: t("year") }, { key: "month", label: t("month") }, { key: "per100", label: t("per100") }]} />
        </div>
        {level.kind === "portfolio" && !v.total
          ? <Planets props={props} t={t} fmt={fmt} open={(i) => go({ kind: "property", i })} />
          : <Flowing v={v} level={level} pulled={pulled} unit={unit} t={t} fmt={fmt} cur={cur} reduced={reduced} go={go} />}
        {at && level.kind === "property" && at.levers.length > 0 && (
          <div className="bz-rs-levers" role="group" aria-label={t("levers")}>
            <span className="bz-rs-levers-label">{t("levers")}</span>
            {at.levers.map((l) => (
              <button type="button" key={l.key} className={`bz-rs-lever bz-rs-lever-${l.key}${pulled.has(l.key) ? " bz-on" : ""}`}
                aria-pressed={pulled.has(l.key)} onClick={() => toggle(l.key)}>{l.label}</button>
            ))}
            {pulled.size > 0 && <button type="button" className="bz-rs-reset" onClick={() => setPulled(new Set())}>{t("reset")}</button>}
          </div>
        )}
        {at && o && level.kind !== "costs" && <Facts p={at} o={o} t={t} fmt={fmt} cur={cur} still={reduced} />}
        {level.kind === "portfolio" && v.total && <TotalFacts v={v} t={t} fmt={fmt} />}
        {level.kind === "costs" && at && at.cost_lines.length === 0 && <p className="bz-rs-note">{t("costs.hint")}</p>}
        <footer className="bz-rs-foot">
          <span>{t("note", { cur })}</span>
          {onEdit && <button type="button" className="bz-rs-crumb" onClick={onEdit}>{t("edit")}</button>}
        </footer>
      </div>
    </Card>
  );
}

function Flowing({ v, level, pulled, unit, t, fmt, cur, reduced, go }: {
  v: WaterfallVisual; level: RentalLevel; pulled: ReadonlySet<RentalLeverKey>; unit: Unit; t: Translate; fmt: Formatters; cur: string;
  reduced: boolean; go: (l: RentalLevel) => void;
}) {
  const ids = useNightIds();
  const [ref, W] = useWidth<HTMLDivElement>();
  const scene = buildScene(v, level, pulled, t)!;
  const ghost = level.kind === "property" && pulled.size > 0 ? buildScene(v, level, new Set(), t) : null;
  // What glides: every node and ribbon value, keyed, so a lever or a drill morphs instead of jumping.
  const target: Record<string, number> = {};
  for (const n of [...scene.left, ...scene.right]) target[`n:${n.key}`] = n.value;
  for (const f of scene.flows) target[`f:${f.from}>${f.to}`] = (target[`f:${f.from}>${f.to}`] ?? 0) + f.value;
  const shown = useMorph(target, reduced);
  const val = (k: string) => Math.max(shown[k] ?? 0, 0);
  const factor = unit === "year" ? 1 : unit === "month" ? 1 / 12 : 100 / (scene.base || 1);
  const show = (x: number) => fmt.num(x * factor, unit === "per100" ? 1 : 0);

  const compact = W < 560;
  const side = compact ? 106 : 170, gap = 30, nodeW = 14, top = 22;
  const rows = Math.max(scene.left.length, scene.right.length);
  const H = Math.max(compact ? 300 : 340, rows * 54 + 50);
  const avail = H - top - 28 - gap * (rows - 1);
  const sumOf = (nodes: FlowNode[]) => nodes.reduce((s, n) => s + val(`n:${n.key}`), 0);
  const k = avail / Math.max(sumOf(scene.left), sumOf(scene.right), 1);
  const x0 = side, x1 = W - side - nodeW;
  const stack = (nodes: FlowNode[]) => {
    const used = nodes.reduce((s, n) => s + Math.max(val(`n:${n.key}`) * k, 2), 0) + gap * (nodes.length - 1);
    let y = top + Math.max(0, (H - top - 28 - used) / 2);
    return nodes.map((n) => { const h = Math.max(val(`n:${n.key}`) * k, 2); const box = { n, y, h }; y += h + gap; return box; });
  };
  const L = stack(scene.left), R = stack(scene.right);
  const outAt = new Map(L.map((b) => [b.n.key, b.y])), inAt = new Map(R.map((b) => [b.n.key, b.y]));
  const seen = new Set<string>();
  const cx = (x0 + nodeW + x1) / 2;
  const ribbons = scene.flows.filter((f) => { const id = `${f.from}>${f.to}`; if (seen.has(id)) return false; seen.add(id); return true; }).map((f) => {
    const th = val(`f:${f.from}>${f.to}`) * k;
    const ya = outAt.get(f.from)!, yb = inAt.get(f.to)!;
    outAt.set(f.from, ya + th); inAt.set(f.to, yb + th);
    const d = `M${x0 + nodeW},${ya} C${cx},${ya} ${cx},${yb} ${x1},${yb} L${x1},${yb + th} C${cx},${yb + th} ${cx},${ya + th} ${x0 + nodeW},${ya + th} Z`;
    const mid = `M${x0 + nodeW},${ya + th / 2} C${cx},${ya + th / 2} ${cx},${yb + th / 2} ${x1},${yb + th / 2}`;
    return { f, th, d, mid, sink: scene.right.find((n) => n.key === f.to)! };
  });
  // The real year, while levers are pulled: a dashed outline of each sink at its real size, at the same place,
  // and its real amount under the new one.
  const real = new Map((ghost?.right ?? []).map((n) => [n.key, n.value]));
  const ghostBoxes = ghost ? R.filter((b) => real.has(b.n.key)).map((b) => ({ key: b.n.key, y: b.y, h: Math.max(real.get(b.n.key)! * k, 2) })) : [];
  const onKey = (to: RentalLevel) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(to); } };
  const max = compact ? 13 : 22;
  const label = (x: number, b: { n: FlowNode; y: number; h: number }, anchor: "start" | "end") => (
    <g className="bz-rs-label" pointerEvents="none">
      <text x={x} y={b.y + b.h / 2 - 3} textAnchor={anchor} fontSize={compact ? 11 : 12} fontWeight={700} className="bz-n-ink">
        {b.n.label.length > max ? `${b.n.label.slice(0, max - 1).trimEnd()}…` : b.n.label}
      </text>
      <text x={x} y={b.y + b.h / 2 + 12} textAnchor={anchor} fontSize={compact ? 11 : 12} className={`bz-rs-amount ${b.n.cls}`}>
        {show(val(`n:${b.n.key}`))}{unit === "per100" ? "" : ` ${cur}`}
      </text>
      {ghost && real.has(b.n.key) && Math.abs(real.get(b.n.key)! - b.n.value) >= 0.5 && (
        <text x={x} y={b.y + b.h / 2 + 26} textAnchor={anchor} fontSize={10.5} className="bz-n-mut bz-rs-was">
          {t("was", { amount: unit === "per100" ? fmt.num((real.get(b.n.key)! * 100) / (ghost.base || 1), 1) : fmt.num(real.get(b.n.key)! * factor) })}
        </text>
      )}
    </g>
  );
  const node = (b: { n: FlowNode; y: number; h: number }, x: number, anchor: "start" | "end") => {
    const drill = b.n.drill;
    const body = (
      <>
        <rect x={x} y={b.y} width={nodeW} height={b.h} rx={4} className={`bz-rs-node ${b.n.cls}`} filter={`url(#${ids.glow})`} />
        {label(anchor === "end" ? x - 8 : x + nodeW + 8, b, anchor)}
      </>
    );
    if (!drill) return <g key={b.n.key}>{body}</g>;
    return (
      <g key={b.n.key} className="bz-n-hit bz-rs-drill" role="button" tabIndex={0} aria-label={t("open", { name: b.n.label })}
        onClick={() => go(drill)} onKeyDown={onKey(drill)}>
        <rect x={anchor === "end" ? 2 : x - 4} y={b.y + b.h / 2 - Math.max(b.h, 34) / 2 - 2} width={side + nodeW - 2}
          height={Math.max(b.h, 34) + 4} rx={8} className="bz-rs-hitbox" />
        {body}
      </g>
    );
  };
  const sums: Record<string, number> = {};
  for (const n of scene.right) sums[n.key] = val(`n:${n.key}`);
  const totalIn = sumOf(scene.left);
  return (
    <div ref={ref} className="bz-chart-box">
      <svg key={JSON.stringify(level)} viewBox={`0 0 ${W} ${H}`} height={H} role="img" className="bz-rs-flow"
        aria-label={t("aria", { rent: fmt.num(totalIn), cur, costs: fmt.num(sums.costs ?? 0), interest: fmt.num(sums.interest ?? 0),
          tax: fmt.num(sums.local_tax ?? 0), gain: fmt.num(sums.gain ?? 0) })}>
        <NightDefs ids={ids} glow={4} />
        {ribbons.map(({ f, d, sink }) => (
          <path key={`${f.from}>${f.to}`} d={d} className={`bz-rs-ribbon ${f.cls}${sink.drill ? " bz-n-hit" : ""}`}
            onClick={sink.drill ? () => go(sink.drill!) : undefined} />
        ))}
        {!reduced && ribbons.map(({ f, th, mid }, r) => {
          // Evenly spaced along the ribbon, one speed per ribbon: a steady stream, never a clump.
          const dots = Math.max(1, Math.min(8, Math.round(th / 8)));
          const dur = 3.2 + (r % 4) * 0.35;
          return (
            <g key={`dots-${f.from}>${f.to}`} className={`bz-rs-dots ${f.cls}`} pointerEvents="none">
              {Array.from({ length: dots }, (_, j) => (
                <circle key={j} r={Math.min(2.6, 1 + th / 14)} className="bz-rs-dot">
                  <animateMotion dur={`${dur}s`} begin={`${(-(j * dur) / dots - r * 0.37).toFixed(2)}s`} repeatCount="indefinite" path={mid} />
                </circle>
              ))}
            </g>
          );
        })}
        {ghostBoxes.map((g) => (
          <rect key={`ghost-${g.key}`} x={x1 - 4} y={g.y} width={nodeW + 8} height={g.h} rx={5} className="bz-rs-ghost">
            <title>{t("ghost")}</title>
          </rect>
        ))}
        {L.map((b) => node(b, x0, "end"))}
        {R.map((b) => node(b, x1, "start"))}
        {level.kind !== "costs" && totalIn > 0 && (
          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} className="bz-n-mut">
            {t("share", { p: fmt.num(((sums.gain ?? 0) / (totalIn || 1)) * 100) })}
          </text>
        )}
      </svg>
    </div>
  );
}

/** A figure that counts up or down to its new value, so a lever is felt in the numbers too. */
function Count({ value, render, still }: { value: number; render: (n: number) => ReactNode; still: boolean }) {
  const shown = useMorph({ v: value }, still).v ?? value;
  return <>{render(shown)}</>;
}

function Facts({ p, o, t, fmt, cur, still }: { p: RentalProperty; o: RentalOutcome; t: Translate; fmt: Formatters; cur: string; still: boolean }) {
  const gain = toNumber(o.net_gain);
  const roe = o.return_on_equity_percent;
  const cash = o.cash_flow_per_year;
  const rate = p.yields.debt_rate, net = o.net_yield_percent;
  const leverUp = rate != null && net != null && toNumber(rate) <= toNumber(net);
  return (
    <div className="bz-rs-facts">
      <div className={`bz-n-fact ${gain < 0 ? "bz-n-is-risk" : "bz-rs-is-ok"}`}>
        <span>{t("kpi.gain")}</span>
        <strong><Count value={gain} still={still} render={(n) => `${fmt.num(n)} ${cur}`} /></strong>
        <small>{t("kpi.perMonth", { amount: fmt.num(gain / 12) })}</small>
      </div>
      <div className="bz-n-fact bz-n-is-gold">
        <span>{t("kpi.roe")}</span>
        <strong>{roe == null ? "—" : <Count value={toNumber(roe)} still={still} render={(n) => `${fmt.num(n, 1)}\u00a0%`} />}</strong>
        <small>{roe == null ? t("kpi.roe.none") : t("kpi.equity", { amount: fmt.num(p.equity), cur })}</small>
      </div>
      <div className={`bz-n-fact ${cash != null && toNumber(cash) < 0 ? "bz-rs-is-warn" : "bz-rs-is-ok"}`}>
        <span>{t("kpi.cash")}</span>
        <strong>{cash == null ? "—" : <Count value={toNumber(cash) / 12} still={still} render={(n) => `${fmt.num(n)} ${cur}`} />}</strong>
        <small>{cash == null ? t("kpi.cash.none") : t("kpi.perMonth", { amount: fmt.num(toNumber(cash) / 12) })}</small>
      </div>
      <div className={`bz-n-fact ${rate == null ? "" : leverUp ? "bz-rs-is-ok" : "bz-n-is-risk"}`}>
        <span>{t("kpi.lever")}</span>
        {rate == null ? <small>{t("lever.none")}</small> : (
          <>
            <svg viewBox="0 0 160 14" className="bz-rs-gauge" aria-hidden="true">
              <rect x="0" y="5" width="160" height="4" rx="2" className="bz-rs-gauge-track" />
              <rect x="0" y="4" width={Math.max(Math.min(toNumber(net) / 10, 1), 0) * 160} height="6" rx="3" className="bz-rs-gauge-net" />
              <rect x={Math.min(toNumber(rate) / 10, 1) * 160 - 1.5} y="0" width="3" height="14" rx="1.5" className="bz-rs-gauge-rate" />
            </svg>
            <small>{t(leverUp ? "lever.up" : "lever.down", { rate: fmt.num(rate, 1), net: fmt.num(net ?? 0, 1) })}</small>
          </>
        )}
      </div>
    </div>
  );
}

function TotalFacts({ v, t, fmt }: { v: WaterfallVisual; t: Translate; fmt: Formatters }) {
  const total = v.total!;
  const gain = toNumber(total.net_gain);
  return (
    <div className="bz-rs-facts">
      <div className={`bz-n-fact ${gain < 0 ? "bz-n-is-risk" : "bz-rs-is-ok"}`}>
        <span>{t("kpi.gain")}</span><strong>{fmt.num(gain)} {total.currency}</strong><small>{t("kpi.perMonth", { amount: fmt.num(gain / 12) })}</small>
      </div>
      <div className="bz-n-fact bz-n-is-gold">
        <span>{t("kpi.roe")}</span>
        <strong>{total.return_on_equity == null ? "—" : `${fmt.num(total.return_on_equity, 1)}\u00a0%`}</strong>
        <small>{t("kpi.equity", { amount: fmt.num(toNumber(total.value) - toNumber(total.loan_balance)), cur: total.currency })}</small>
      </div>
      {total.cash_flow != null && (
        <div className={`bz-n-fact ${toNumber(total.cash_flow) < 0 ? "bz-rs-is-warn" : "bz-rs-is-ok"}`}>
          <span>{t("kpi.cash")}</span><strong>{fmt.num(toNumber(total.cash_flow) / 12)} {total.currency}</strong>
          <small>{t("kpi.perMonth", { amount: fmt.num(toNumber(total.cash_flow) / 12) })}</small>
        </div>
      )}
    </div>
  );
}

/** Properties in different currencies cannot be added up: each one is a planet to open, sized by its rent. */
function Planets({ props, t, fmt, open }: { props: RentalProperty[]; t: Translate; fmt: Formatters; open: (i: number) => void }) {
  const max = Math.max(...props.map((p) => toNumber(p.outcomes[""]!.rent_per_year)), 1);
  return (
    <div className="bz-rs-planets">
      {props.map((p, i) => {
        const o = p.outcomes[""]!;
        const size = Math.round(64 + 64 * Math.sqrt(toNumber(o.rent_per_year) / max));
        return (
          <button type="button" key={p.name} className={`bz-rs-planet bz-rs-planet-${p.tone}`} onClick={() => open(i)} aria-label={t("open", { name: p.name })}>
            <span className="bz-rs-orb" style={{ width: size, height: size }} />
            <strong>{p.name}</strong>
            <small>{t("gain")} {fmt.num(o.net_gain)} {p.currency}</small>
          </button>
        );
      })}
    </div>
  );
}
