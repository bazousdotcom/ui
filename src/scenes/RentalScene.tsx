import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { Answer, RentalCalendar, RentalLeverKey, RentalOutcome, RentalProperty, WaterfallVisual } from "../answers/contract";
import { toNumber } from "../contract/snapshot";
import { createFormatters, type Formatters } from "../format";
import { LOCALE_TAGS, createT, type Catalog, type Locale, type Translate } from "../i18n";
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
 * With the property's calendar (kit 0.9), the same flow becomes a month: a month cursor (and its play button) walks
 * the next 24 months, each line in the month it is paid (hatched when estimated); a rent cursor snaps to the
 * engine's rent levels, with the breakeven and the target marked on it; « no tenant » empties the rent. What the
 * rent does not cover comes in from the left, from the salary; what is left goes out on the right, into the pocket.
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
type Sink = "costs" | "interest" | "capital" | "local_tax" | "gain";
type FlowNode = { key: string; label: string; value: number; cls: string; drill?: RentalLevel; estimated?: boolean; note?: string };
export type Flow = { from: string; to: string; value: number; cls: string };
/** `keep`: every node stays, even at zero, so a month or a rent level glides into the next (kit 0.9). */
type Scene = { left: FlowNode[]; right: FlowNode[]; flows: Flow[]; base: number; keep?: boolean; rows?: number; scale?: number };

const SINKS: Sink[] = ["costs", "interest", "capital", "local_tax", "gain"];
const MORPH_MS = 650;

export const rentalMessages: Catalog = {
  fr: {
    was: "réel {amount}", all: "Tous les biens", rent: "Loyers", costs: "Charges", interest: "Intérêts", local_tax: "Impôt local", gain: "Gain net", capital: "Capital remboursé", cashLeft: "Trésorerie", "title.gain.cash": "{name} : {amount} {cur} de trésorerie par an, crédit compris", "title.loss.cash": "{name} : te coûte {amount} {cur} par an, crédit compris", "title.whatif.cash": "Avec tes « et si » : {amount} {cur} de trésorerie par an, crédit compris", "title.whatif.loss.cash": "Avec tes « et si » : te coûte {amount} {cur} par an, crédit compris",
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
    "cal.rent": "Loyer hors charges", "cal.provisions": "Provisions du locataire", "cal.outside": "vient de ton salaire", "cal.inPocket": "Dans ta poche",
    "cal.title.loss": "{name}, {when} : {amount} {cur} sortent de ta poche, crédit compris", "cal.title.gain": "{name}, {when} : {amount} {cur} dans ta poche, crédit compris",
    "cal.average": "un mois moyen", "cal.vacantWhen": "{when}, sans locataire", "cal.month": "Mois", "cal.play": "Faire défiler les mois", "cal.pause": "Mettre en pause",
    "cal.vacancy": "Sans locataire", "cal.rentLabel": "Loyer hors charges", "cal.today": "Loyer actuel", "cal.breakeven": "point mort", "cal.target": "objectif",
    "cal.kpi.month": "Ce mois-là", "cal.kpi.average": "Mois moyen", "cal.kpi.cumulative": "Cumul sur {n} mois", "cal.kpi.rented": "{from} → {to}, loué à ce loyer",
    "cal.kpi.equity": "Ton coffre", "cal.kpi.equityAt": "valeur moins dette, fin {when}", "cal.kpi.breakeven": "Point mort", "cal.kpi.breakevenSub": "loyer hors charges pour ne rien sortir de ta poche",
    "cal.kpi.target": "objectif {target} / mois : {rent}", "cal.note": "Chiffres du moteur Bazous, en {cur}, par mois. Hachuré : estimé ; un paiement sans mois connu est réparti sur l’année.",
    "cal.aria": "{when} : {rent} {cur} de loyer hors charges, {provisions} de provisions, {cash} de trésorerie, crédit compris.",
    aria: "Flux de l’année : {rent} {cur} de loyers, {costs} de charges, {interest} d’intérêts, {tax} d’impôt local, {gain} de gain net.",
  },
  de: {
    was: "echt {amount}", all: "Alle Liegenschaften", rent: "Mieten", costs: "Kosten", interest: "Zinsen", local_tax: "Lokale Steuer", gain: "Nettogewinn", capital: "Getilgtes Kapital", cashLeft: "Liquidität", "title.gain.cash": "{name}: {amount} {cur} Liquidität pro Jahr, Kredit eingerechnet", "title.loss.cash": "{name}: kostet dich {amount} {cur} pro Jahr, Kredit eingerechnet", "title.whatif.cash": "Mit deinem «Was wäre, wenn»: {amount} {cur} Liquidität pro Jahr, Kredit eingerechnet", "title.whatif.loss.cash": "Mit deinem «Was wäre, wenn»: kostet dich {amount} {cur} pro Jahr, Kredit eingerechnet",
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
    "cal.rent": "Miete ohne Nebenkosten", "cal.provisions": "Nebenkosten des Mieters", "cal.outside": "kommt aus deinem Lohn", "cal.inPocket": "In deiner Tasche",
    "cal.title.loss": "{name}, {when}: {amount} {cur} kommen aus deiner Tasche, Kredit eingerechnet", "cal.title.gain": "{name}, {when}: {amount} {cur} in deiner Tasche, Kredit eingerechnet",
    "cal.average": "ein durchschnittlicher Monat", "cal.vacantWhen": "{when}, ohne Mieter", "cal.month": "Monat", "cal.play": "Monate abspielen", "cal.pause": "Pause",
    "cal.vacancy": "Ohne Mieter", "cal.rentLabel": "Miete ohne Nebenkosten", "cal.today": "Heutige Miete", "cal.breakeven": "Gewinnschwelle", "cal.target": "Ziel",
    "cal.kpi.month": "In diesem Monat", "cal.kpi.average": "Durchschnittsmonat", "cal.kpi.cumulative": "Summe über {n} Monate", "cal.kpi.rented": "{from} → {to}, vermietet zu dieser Miete",
    "cal.kpi.equity": "Dein Tresor", "cal.kpi.equityAt": "Wert minus Schuld, Ende {when}", "cal.kpi.breakeven": "Gewinnschwelle", "cal.kpi.breakevenSub": "Miete ohne Nebenkosten, bei der nichts aus deiner Tasche kommt",
    "cal.kpi.target": "Ziel {target} / Monat: {rent}", "cal.note": "Zahlen des Bazous-Rechenkerns, in {cur}, pro Monat. Schraffiert: geschätzt; eine Zahlung ohne bekannten Monat wird aufs Jahr verteilt.",
    "cal.aria": "{when}: {rent} {cur} Miete ohne Nebenkosten, {provisions} Nebenkosten, {cash} Liquidität, Kredit eingerechnet.",
    aria: "Fluss des Jahres: {rent} {cur} Mieten, {costs} Kosten, {interest} Zinsen, {tax} lokale Steuer, {gain} Nettogewinn.",
  },
  it: {
    was: "reale {amount}", all: "Tutti gli immobili", rent: "Affitti", costs: "Spese", interest: "Interessi", local_tax: "Imposta locale", gain: "Guadagno netto", capital: "Capitale rimborsato", cashLeft: "Liquidità", "title.gain.cash": "{name}: {amount} {cur} di liquidità all’anno, credito compreso", "title.loss.cash": "{name}: ti costa {amount} {cur} all’anno, credito compreso", "title.whatif.cash": "Con i tuoi «e se»: {amount} {cur} di liquidità all’anno, credito compreso", "title.whatif.loss.cash": "Con i tuoi «e se»: ti costa {amount} {cur} all’anno, credito compreso",
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
    "cal.rent": "Affitto senza spese", "cal.provisions": "Acconti spese dell’inquilino", "cal.outside": "viene dal tuo stipendio", "cal.inPocket": "In tasca tua",
    "cal.title.loss": "{name}, {when}: {amount} {cur} escono di tasca tua, credito compreso", "cal.title.gain": "{name}, {when}: {amount} {cur} in tasca tua, credito compreso",
    "cal.average": "un mese medio", "cal.vacantWhen": "{when}, senza inquilino", "cal.month": "Mese", "cal.play": "Scorri i mesi", "cal.pause": "Pausa",
    "cal.vacancy": "Senza inquilino", "cal.rentLabel": "Affitto senza spese", "cal.today": "Affitto attuale", "cal.breakeven": "pareggio", "cal.target": "obiettivo",
    "cal.kpi.month": "Quel mese", "cal.kpi.average": "Mese medio", "cal.kpi.cumulative": "Totale su {n} mesi", "cal.kpi.rented": "{from} → {to}, affittato a questo affitto",
    "cal.kpi.equity": "La tua cassaforte", "cal.kpi.equityAt": "valore meno debito, fine {when}", "cal.kpi.breakeven": "Pareggio", "cal.kpi.breakevenSub": "affitto senza spese per non tirare fuori nulla",
    "cal.kpi.target": "obiettivo {target} / mese: {rent}", "cal.note": "Cifre del motore Bazous, in {cur}, al mese. Tratteggiato: stimato; un pagamento senza mese noto è ripartito sull’anno.",
    "cal.aria": "{when}: {rent} {cur} di affitto senza spese, {provisions} di acconti, {cash} di liquidità, credito compreso.",
    aria: "Flusso dell’anno: {rent} {cur} di affitti, {costs} di spese, {interest} di interessi, {tax} di imposta locale, {gain} di guadagno netto.",
  },
  rm: {
    was: "real {amount}", all: "Tut ils bains", rent: "Fitgs", costs: "Custs", interest: "Tschains", local_tax: "Taglia locala", gain: "Gudogn net", capital: "Chapital restituì", cashLeft: "Liquiditad", "title.gain.cash": "{name}: {amount} {cur} liquiditad per onn, credit inclus", "title.loss.cash": "{name}: ta custa {amount} {cur} per onn, credit inclus", "title.whatif.cash": "Cun tes «e sche»: {amount} {cur} liquiditad per onn, credit inclus", "title.whatif.loss.cash": "Cun tes «e sche»: ta custa {amount} {cur} per onn, credit inclus",
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
    "cal.rent": "Fitg senza custs accessorics", "cal.provisions": "Acontos dal fittadin", "cal.outside": "vegn da tia paga", "cal.inPocket": "En tia giaglioffa",
    "cal.title.loss": "{name}, {when}: {amount} {cur} vegnan da tia giaglioffa, credit inclus", "cal.title.gain": "{name}, {when}: {amount} {cur} en tia giaglioffa, credit inclus",
    "cal.average": "in mais mesaun", "cal.vacantWhen": "{when}, senza fittadin", "cal.month": "Mais", "cal.play": "Far passar ils mais", "cal.pause": "Pausa",
    "cal.vacancy": "Senza fittadin", "cal.rentLabel": "Fitg senza custs accessorics", "cal.today": "Fitg actual", "cal.breakeven": "pitg da rentabilitad", "cal.target": "finamira",
    "cal.kpi.month": "Quel mais", "cal.kpi.average": "Mais mesaun", "cal.kpi.cumulative": "Total sur {n} mais", "cal.kpi.rented": "{from} → {to}, fittà a quest fitg",
    "cal.kpi.equity": "Tia tresoraria", "cal.kpi.equityAt": "valur main debit, fin {when}", "cal.kpi.breakeven": "Pitg da rentabilitad", "cal.kpi.breakevenSub": "fitg senza custs accessorics per betg pajar da tia giaglioffa",
    "cal.kpi.target": "finamira {target} / mais: {rent}", "cal.note": "Cifras dal motor Bazous, en {cur}, per mais. Striblà: stimà; in pajament senza mais enconuschent vegn repartì sin l’onn.",
    "cal.aria": "{when}: {rent} {cur} fitg senza custs accessorics, {provisions} acontos, {cash} liquiditad, credit inclus.",
    aria: "Flux da l’onn: {rent} {cur} fitgs, {costs} custs, {interest} tschains, {tax} taglia locala, {gain} gudogn net.",
  },
  en: {
    was: "real {amount}", all: "All properties", rent: "Rents", costs: "Costs", interest: "Interest", local_tax: "Local tax", gain: "Net gain", capital: "Capital repaid", cashLeft: "Cash flow", "title.gain.cash": "{name}: {amount} {cur} of cash a year, loan included", "title.loss.cash": "{name}: costs you {amount} {cur} a year, loan included", "title.whatif.cash": "With your what-ifs: {amount} {cur} of cash a year, loan included", "title.whatif.loss.cash": "With your what-ifs: costs you {amount} {cur} a year, loan included",
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
    "cal.rent": "Rent excluding charges", "cal.provisions": "Tenant’s charge advances", "cal.outside": "comes from your salary", "cal.inPocket": "In your pocket",
    "cal.title.loss": "{name}, {when}: {amount} {cur} come out of your pocket, loan included", "cal.title.gain": "{name}, {when}: {amount} {cur} in your pocket, loan included",
    "cal.average": "an average month", "cal.vacantWhen": "{when}, with no tenant", "cal.month": "Month", "cal.play": "Play the months", "cal.pause": "Pause",
    "cal.vacancy": "No tenant", "cal.rentLabel": "Rent excluding charges", "cal.today": "Today’s rent", "cal.breakeven": "breakeven", "cal.target": "target",
    "cal.kpi.month": "That month", "cal.kpi.average": "Average month", "cal.kpi.cumulative": "Total over {n} months", "cal.kpi.rented": "{from} → {to}, let at this rent",
    "cal.kpi.equity": "Your vault", "cal.kpi.equityAt": "value less debt, end of {when}", "cal.kpi.breakeven": "Breakeven", "cal.kpi.breakevenSub": "rent excluding charges at which nothing comes out of your pocket",
    "cal.kpi.target": "target {target} / month: {rent}", "cal.note": "Figures from the Bazous engine, in {cur}, per month. Hatched: estimated; a payment with no known month is spread over the year.",
    "cal.aria": "{when}: {rent} {cur} of rent excluding charges, {provisions} of charge advances, {cash} of cash, loan included.",
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

/** When the engine knows the loan payments (cash flow), the capital they repay flows out too, and what is left, or
 *  what comes out of the pocket, is the year's cash; otherwise the flow ends on the net gain, as before. */
export function remainder(o: RentalOutcome): { capital: number; left: number; cash: boolean } {
  const gain = toNumber(o.net_gain);
  if (o.cash_flow_per_year == null) return { capital: 0, left: gain, cash: false };
  const cash = toNumber(o.cash_flow_per_year);
  return { capital: Math.max(gain - cash, 0), left: cash, cash: true };
}

/** Where the time cursors stand: `month` 0 is the average month, 1..24 the months from the calendar's start;
 *  `rent` is an index into the engine's rent levels; `vacant` empties the rent and the provisions. */
export type TimeView = { month: number; rent: number; vacant: boolean };

/** Today's rent among the engine's levels (it is always one of them). */
export function todayLevel(cal: RentalCalendar): number {
  const i = cal.grid.findIndex((g) => toNumber(g.rent) === toNumber(cal.rent));
  if (i >= 0) return i;
  const r = toNumber(cal.rent);
  return cal.grid.reduce((best, g, j) => (Math.abs(toNumber(g.rent) - r) < Math.abs(toNumber(cal.grid[best]!.rent) - r) ? j : best), 0);
}

/** The month's cash, loan included, as the engine computed it for that rent level (or with no tenant). */
export function monthCash(cal: RentalCalendar, view: TimeView): number {
  if (view.vacant) return toNumber(view.month ? cal.months[view.month - 1]!.vacant : cal.average.vacant);
  const g = cal.grid[view.rent]!;
  return toNumber(view.month ? g.cash[view.month - 1]! : g.average);
}

/** A month of the property as a flow: rent and provisions (and the pocket, when they do not cover the month) on the
 *  left; every line paid that month, the interest and the capital (and the pocket, when something is left) on the
 *  right. Every node stays, at zero when it is not paid that month, so the months glide into each other. */
export function buildTimeScene(cal: RentalCalendar, view: TimeView, t: Translate): Scene {
  const lines = view.month ? cal.months[view.month - 1]!.lines : cal.average.lines;
  const cash = monthCash(cal, view);
  const g = cal.grid[view.rent]!;
  const left: FlowNode[] = [
    { key: "rent", label: t("cal.rent"), value: view.vacant ? 0 : toNumber(g.rent), cls: "bz-rs-rent" },
    { key: "provisions", label: t("cal.provisions"), value: view.vacant ? 0 : toNumber(cal.provisions), cls: "bz-rs-provisions" },
    { key: "pocket", label: t("pocket"), value: Math.max(-cash, 0), cls: "bz-rs-pocket bz-rs-outside", note: t("cal.outside") },
  ];
  const right: FlowNode[] = [
    ...lines.map((l) => ({ key: l.key, label: l.label, value: toNumber(l.amount), cls: l.group === "tax" ? "bz-rs-local_tax" : "bz-rs-costs", estimated: l.estimated })),
    { key: "interest", label: t("interest"), value: toNumber(cal.interest), cls: "bz-rs-interest" },
    { key: "capital", label: t("capital"), value: toNumber(cal.capital), cls: "bz-rs-capital" },
    { key: "gain", label: t("cal.inPocket"), value: Math.max(cash, 0), cls: "bz-rs-gain" },
  ];
  const on = (n: FlowNode) => n.value > 0;
  // The drawing keeps one height for every month: room for the busiest month's lines, plus interest, capital, pocket.
  const busiest = Math.max(...cal.months.map((m) => m.lines.filter((l) => toNumber(l.amount) > 0).length), cal.average.lines.length);
  // And one scale: the heaviest month's flow at this rent, so the rent keeps its size while the months go by.
  const income = toNumber(g.rent) + toNumber(cal.provisions);
  const scale = Math.max(income, ...g.cash.map((c) => income - toNumber(c)), income - toNumber(g.average));
  return { left, right, flows: pour(left.filter(on), right.filter(on)), base: income, keep: true, rows: busiest + 3, scale };
}

function propertyFlow(p: RentalProperty, o: RentalOutcome, t: Translate, prefix = "") {
  const r = remainder(o);
  const take: Record<Sink, number> = {
    costs: toNumber(o.costs_per_year), interest: toNumber(o.interest_per_year), capital: r.capital,
    local_tax: toNumber(o.local_tax_per_year), gain: Math.max(r.left, 0),
  };
  const pocket = Math.max(-r.left, 0);
  const left: FlowNode[] = [{ key: `${prefix}rent`, label: prefix ? p.name : t("rent"), value: toNumber(o.rent_per_year), cls: "bz-rs-rent" }];
  if (pocket > 0) left.push({ key: `${prefix}pocket`, label: t("pocket"), value: pocket, cls: "bz-rs-pocket" });
  const right: FlowNode[] = SINKS.filter((k) => take[k] > 0)
    .map((k) => ({ key: k, label: k === "gain" && r.cash ? t("cashLeft") : t(k), value: take[k], cls: `bz-rs-${k}` }));
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
function useMorph(target: Record<string, number>, still: boolean, glide = false): Record<string, number> {
  // Gliding (a calendar month), a node that appears or leaves grows from zero or shrinks to it instead of jumping.
  const shape = glide ? "glide" : Object.keys(target).sort().join("|");
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
  const [time, setTime] = useState<(TimeView & { i: number }) | null>(null);
  const [playing, setPlaying] = useState(false);
  const at = level.kind === "portfolio" ? null : props[level.i] ?? null;
  const cal = level.kind === "property" ? at?.calendar : undefined;
  const view: TimeView | null = cal
    ? time && time.i === (level as { i: number }).i ? time : { month: 0, rent: todayLevel(cal), vacant: false }
    : null;
  const months = cal?.months.length ?? 0;
  const setView = (next: Partial<TimeView>) => setTime({ ...view!, ...next, i: (level as { i: number }).i });
  // Play: one month after the other, then stop on the last one.
  useEffect(() => {
    if (!playing || !view) return;
    if (view.month >= months) { setPlaying(false); return; }
    const timer = setTimeout(() => setTime({ ...view, month: view.month + 1, i: (level as { i: number }).i }), view.month === 0 ? 300 : 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, view?.month]);
  useEffect(() => { if (!cal) setPlaying(false); }, [cal]);
  if (props.length === 0) return null;
  const cur = at?.currency ?? v.total?.currency ?? v.currency;
  const go = (next: RentalLevel) => {
    if (next.kind === "portfolio" || (at && next.kind === "property" && props[next.i] !== at)) setPulled(new Set());
    setLevel(next);
  };
  const play = () => {
    if (playing) { setPlaying(false); return; }
    if (view && view.month >= months) setView({ month: 0 });
    setPlaying(true);
  };
  const shownUnit: Unit = cal && unit === "year" ? "month" : unit;
  const toggle = (k: RentalLeverKey) => setPulled((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const o = at ? at.outcomes[outcomeKey(at.levers, pulled)] ?? at.outcomes[""]! : null;
  const whatIf = pulled.size > 0 && level.kind === "property";

  let title: string;
  if (level.kind === "costs") title = t("title.costs", { amount: fmt.num(at!.outcomes[""]!.costs_per_year), cur, name: at!.name });
  else if (level.kind === "portfolio") title = v.total ? t("title.all", { n: props.length, amount: fmt.num(v.total.net_gain), cur }) : t("all");
  else if (cal && view) {
    // The month (or the average month) the cursor stands on, and what it does to the household's cash, loan included.
    const cash = monthCash(cal, view);
    const base = view.month ? monthName(cal.months[view.month - 1]!.month, locale) : t("cal.average");
    const when = view.vacant ? t("cal.vacantWhen", { when: base }) : base;
    title = t(cash < 0 ? "cal.title.loss" : "cal.title.gain", { name: at!.name, when, amount: fmt.num(Math.abs(cash)), cur });
  } else {
    // With the loan payments known, the title says what the property does to the household's cash, loan included.
    const r = remainder(o!);
    const key = whatIf ? (r.left < 0 ? "title.whatif.loss" : "title.whatif") : r.left < 0 ? "title.loss" : "title.gain";
    title = t(`${key}${r.cash ? ".cash" : ""}`, { name: at!.name, amount: fmt.num(Math.abs(r.left)), cur });
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
          <Segmented label={t("unit")} value={shownUnit} onChange={setUnit}
            options={[...(cal ? [] : [{ key: "year" as Unit, label: t("year") }]), { key: "month", label: t("month") }, { key: "per100", label: t("per100") }]} />
        </div>
        {level.kind === "portfolio" && !v.total
          ? <Planets props={props} t={t} fmt={fmt} open={(i) => go({ kind: "property", i })} />
          : cal && view
            ? <Flowing v={v} level={level} pulled={pulled} unit={shownUnit} t={t} fmt={fmt} cur={cur} reduced={reduced} go={go}
                fixed={buildTimeScene(cal, view, t)} aria={timeAria(cal, view, t, fmt, cur, locale)} />
            : <Flowing v={v} level={level} pulled={pulled} unit={unit} t={t} fmt={fmt} cur={cur} reduced={reduced} go={go} />}
        {cal && view && (
          <TimeControls cal={cal} view={view} set={(next) => { if ("month" in next) setPlaying(false); setView(next); }} playing={playing} play={play}
            t={t} fmt={fmt} cur={cur} locale={locale} />
        )}
        {at && !cal && level.kind === "property" && at.levers.length > 0 && (
          <div className="bz-rs-levers" role="group" aria-label={t("levers")}>
            <span className="bz-rs-levers-label">{t("levers")}</span>
            {at.levers.map((l) => (
              <button type="button" key={l.key} className={`bz-rs-lever bz-rs-lever-${l.key}${pulled.has(l.key) ? " bz-on" : ""}`}
                aria-pressed={pulled.has(l.key)} onClick={() => toggle(l.key)}>{l.label}</button>
            ))}
            {pulled.size > 0 && <button type="button" className="bz-rs-reset" onClick={() => setPulled(new Set())}>{t("reset")}</button>}
          </div>
        )}
        {cal && view && <TimeFacts cal={cal} view={view} t={t} fmt={fmt} cur={cur} locale={locale} still={reduced} />}
        {at && o && !cal && level.kind !== "costs" && <Facts p={at} o={o} t={t} fmt={fmt} cur={cur} still={reduced} />}
        {level.kind === "portfolio" && v.total && <TotalFacts v={v} t={t} fmt={fmt} />}
        {level.kind === "costs" && at && at.cost_lines.length === 0 && <p className="bz-rs-note">{t("costs.hint")}</p>}
        <footer className="bz-rs-foot">
          <span>{t(cal ? "cal.note" : "note", { cur })}</span>
          {onEdit && <button type="button" className="bz-rs-crumb" onClick={onEdit}>{t("edit")}</button>}
        </footer>
      </div>
    </Card>
  );
}

function Flowing({ v, level, pulled, unit, t, fmt, cur, reduced, go, fixed, aria }: {
  v: WaterfallVisual; level: RentalLevel; pulled: ReadonlySet<RentalLeverKey>; unit: Unit; t: Translate; fmt: Formatters; cur: string;
  reduced: boolean; go: (l: RentalLevel) => void;
  /** A scene computed by the caller (a month of the calendar), in monthly amounts; and its own description. */
  fixed?: Scene; aria?: string;
}) {
  const ids = useNightIds();
  const hatch = `${ids.glow}-hatch`, arrow = `${ids.glow}-arrow`;
  const [ref, W] = useWidth<HTMLDivElement>();
  const scene = fixed ?? buildScene(v, level, pulled, t)!;
  const keep = !!scene.keep;
  const ghost = !fixed && level.kind === "property" && pulled.size > 0 ? buildScene(v, level, new Set(), t) : null;
  // What glides: every node and ribbon value, keyed, so a lever or a drill morphs instead of jumping.
  const target: Record<string, number> = {};
  for (const n of [...scene.left, ...scene.right]) target[`n:${n.key}`] = n.value;
  if (!keep) for (const f of scene.flows) target[`f:${f.from}>${f.to}`] = (target[`f:${f.from}>${f.to}`] ?? 0) + f.value;
  const shown = useMorph(target, reduced, keep);
  const val = (k: string) => Math.max(shown[k] ?? 0, 0);
  // A calendar scene is already monthly; the year's scene is scaled down to a month or to 100 of rent.
  const factor = unit === "per100" ? 100 / (scene.base || 1) : fixed ? 1 : unit === "year" ? 1 : 1 / 12;
  const show = (x: number) => fmt.num(x * factor, unit === "per100" ? 1 : 0);

  const compact = W < 560;
  const side = compact ? 106 : 170, gap = 30, nodeW = 14, top = 22;
  const rows = scene.rows ?? Math.max(scene.left.length, scene.right.length);
  const H = Math.max(compact ? 300 : 340, rows * 54 + 50);
  const avail = H - top - 28 - gap * (rows - 1);
  const sumOf = (nodes: FlowNode[]) => nodes.reduce((s, n) => s + val(`n:${n.key}`), 0);
  const k = avail / Math.max(scene.scale ?? 0, sumOf(scene.left), sumOf(scene.right), 1);
  const x0 = side, x1 = W - side - nodeW;
  // A node at zero (a line not paid this month) folds away with its gap and its label, smoothly, as it shrinks.
  const weight = (n: FlowNode) => (keep ? Math.min(Math.max((val(`n:${n.key}`) * k) / 1.5, 0), 1) : 1);
  const stack = (nodes: FlowNode[]) => {
    const size = (n: FlowNode) => Math.max(val(`n:${n.key}`) * k, 2 * weight(n));
    const gaps = nodes.reduce((s, n, j) => s + (j ? gap * weight(n) : 0), 0);
    const used = nodes.reduce((s, n) => s + size(n), 0) + gaps;
    let y = top + Math.max(0, (H - top - 28 - used) / 2);
    return nodes.map((n, j) => { if (j) y += gap * weight(n); const h = size(n); const box = { n, y, h, w: weight(n) }; y += h; return box; });
  };
  const L = stack(scene.left), R = stack(scene.right);
  const outAt = new Map(L.map((b) => [b.n.key, b.y])), inAt = new Map(R.map((b) => [b.n.key, b.y]));
  const seen = new Set<string>();
  const cx = (x0 + nodeW + x1) / 2;
  // A calendar month pours the gliding values themselves, so the ribbons always meet the nodes as they move.
  const flows = keep
    ? pour(scene.left.map((n) => ({ key: n.key, value: val(`n:${n.key}`) })), scene.right.map((n) => ({ key: n.key, value: val(`n:${n.key}`), cls: n.cls })))
    : scene.flows;
  const ribbons = flows.filter((f) => { const id = `${f.from}>${f.to}`; if (seen.has(id)) return false; seen.add(id); return true; }).map((f) => {
    const th = (keep ? f.value : val(`f:${f.from}>${f.to}`)) * k;
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
  const label = (x: number, b: { n: FlowNode; y: number; h: number; w: number }, anchor: "start" | "end") => (
    <g className="bz-rs-label" pointerEvents="none" opacity={b.w < 1 ? Math.max(b.w * 1.6 - 0.6, 0) : undefined}>
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
      {b.n.note && (
        <>
          <text x={x} y={b.y + b.h / 2 + 26} textAnchor={anchor} fontSize={10.5} className="bz-n-mut bz-rs-note-line">{b.n.note}</text>
          {/* From outside the rent: a dashed arrow from the edge of the drawing into the pocket. */}
          <path d={`M4,${b.y + b.h / 2 + 34} H${x0 - 6}`} className="bz-rs-outside-arrow" markerEnd={`url(#${arrow})`} />
        </>
      )}
    </g>
  );
  const node = (b: { n: FlowNode; y: number; h: number; w: number }, x: number, anchor: "start" | "end") => {
    const drill = b.n.drill;
    if (keep && b.w <= 0) return null;
    const body = (
      <>
        <rect x={x} y={b.y} width={nodeW} height={b.h} rx={4} className={`bz-rs-node ${b.n.cls}`} filter={`url(#${ids.glow})`} />
        {b.n.estimated && <rect x={x} y={b.y} width={nodeW} height={b.h} rx={4} fill={`url(#${hatch})`} className="bz-rs-hatch" />}
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
        aria-label={aria ?? t("aria", { rent: fmt.num(totalIn), cur, costs: fmt.num(sums.costs ?? 0), interest: fmt.num(sums.interest ?? 0),
          tax: fmt.num(sums.local_tax ?? 0), gain: fmt.num(sums.gain ?? 0) })}>
        <NightDefs ids={ids} glow={4} />
        <defs>
          <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="bz-rs-hatch-bg" /><line x1="0" y1="0" x2="0" y2="6" className="bz-rs-hatch-line" />
          </pattern>
          <marker id={arrow} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="bz-rs-outside-head" />
          </marker>
        </defs>
        {ribbons.map(({ f, d, sink }) => (
          <g key={`${f.from}>${f.to}`}>
            <path d={d} className={`bz-rs-ribbon ${f.cls}${sink.drill ? " bz-n-hit" : ""}`}
              onClick={sink.drill ? () => go(sink.drill!) : undefined} />
            {sink.estimated && <path d={d} fill={`url(#${hatch})`} className="bz-rs-hatch bz-rs-hatch-ribbon" pointerEvents="none" />}
          </g>
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
        {/* What is left of the rent; nothing to say when the year takes money from the pocket instead. */}
        {level.kind !== "costs" && totalIn > 0 && (sums.gain ?? 0) > 0 && (
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

/** "2026-12" as the locale writes a month: « décembre 2026 », "December 2026". */
export function monthName(month: string, locale: Locale): string {
  const [y, m] = month.split("-").map(Number);
  const when = new Date(Date.UTC(y!, m! - 1, 1));
  try {
    return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(when);
  } catch {
    return month;
  }
}

function timeAria(cal: RentalCalendar, view: TimeView, t: Translate, fmt: Formatters, cur: string, locale: Locale): string {
  const base = view.month ? monthName(cal.months[view.month - 1]!.month, locale) : t("cal.average");
  return t("cal.aria", {
    when: view.vacant ? t("cal.vacantWhen", { when: base }) : base, cur,
    rent: fmt.num(view.vacant ? 0 : cal.grid[view.rent]!.rent), provisions: fmt.num(view.vacant ? 0 : cal.provisions), cash: fmt.num(monthCash(cal, view)),
  });
}

/** The month cursor (with its play button and « no tenant »), and the rent cursor with the breakeven and the target. */
function TimeControls({ cal, view, set, playing, play, t, fmt, cur, locale }: {
  cal: RentalCalendar; view: TimeView; set: (next: Partial<TimeView>) => void; playing: boolean; play: () => void;
  t: Translate; fmt: Formatters; cur: string; locale: Locale;
}) {
  const when = view.month ? monthName(cal.months[view.month - 1]!.month, locale) : t("cal.average");
  const levels = cal.grid.map((g) => toNumber(g.rent));
  const lo = levels[0]!, hi = levels[levels.length - 1]!;
  const at = (x: number) => (hi > lo ? ((x - lo) / (hi - lo)) * 100 : 0);
  const today = todayLevel(cal);
  const marks = [
    { key: "breakeven", label: t("cal.breakeven"), rent: toNumber(cal.breakeven_rent) },
    ...(cal.target_rent != null ? [{ key: "target", label: t("cal.target"), rent: toNumber(cal.target_rent) }] : []),
  ].filter((m) => m.rent >= lo && m.rent <= hi);
  return (
    <div className="bz-rs-time">
      <div className="bz-rs-time-row">
        <button type="button" className={`bz-rs-play${playing ? " bz-on" : ""}`} onClick={play} aria-label={t(playing ? "cal.pause" : "cal.play")}
          aria-pressed={playing}>
          <svg viewBox="0 0 12 12" aria-hidden="true" width="12" height="12">
            {playing ? <path d="M2,1h3v10h-3zM7,1h3v10h-3z" /> : <path d="M2,1 L11,6 L2,11 Z" />}
          </svg>
        </button>
        <label className="bz-rs-slider">
          <span>{t("cal.month")}</span>
          <input type="range" min={0} max={cal.months.length} step={1} value={view.month} aria-valuetext={when} aria-label={t("cal.month")}
            onChange={(e) => set({ month: Number(e.currentTarget.value) })} />
        </label>
        <output className="bz-rs-time-value">{when}</output>
        <button type="button" className={`bz-rs-lever bz-rs-lever-vacancy${view.vacant ? " bz-on" : ""}`} aria-pressed={view.vacant}
          onClick={() => set({ vacant: !view.vacant })}>{t("cal.vacancy")}</button>
      </div>
      <div className="bz-rs-time-row">
        <span className="bz-rs-play-room" aria-hidden="true" />
        <label className="bz-rs-slider">
          <span>{t("cal.rentLabel")}</span>
          <span className="bz-rs-track">
            <input type="range" min={0} max={levels.length - 1} step={1} value={view.rent} disabled={view.vacant} aria-label={t("cal.rentLabel")}
              aria-valuetext={`${fmt.num(levels[view.rent]!)} ${cur}`} onChange={(e) => set({ rent: Number(e.currentTarget.value) })} />
            {marks.map((m) => (
              <span key={m.key} className={`bz-rs-mark bz-rs-mark-${m.key}`} style={{ left: `${at(m.rent)}%` }} title={`${m.label} ${fmt.num(m.rent)} ${cur}`}>
                <small>{m.label}</small>
              </span>
            ))}
          </span>
        </label>
        <output className="bz-rs-time-value">{fmt.num(levels[view.rent]!)} {cur}</output>
        {view.rent !== today
          ? <button type="button" className="bz-rs-reset" onClick={() => set({ rent: today })}>{t("cal.today")}</button>
          : <span className="bz-rs-reset-room" aria-hidden="true" />}
      </div>
    </div>
  );
}

/** The month's cash, the running total at this rent, the vault, and the breakeven — all the engine's. */
function TimeFacts({ cal, view, t, fmt, cur, locale, still }: {
  cal: RentalCalendar; view: TimeView; t: Translate; fmt: Formatters; cur: string; locale: Locale; still: boolean;
}) {
  const cash = monthCash(cal, view);
  const n = view.month || cal.months.length;
  const total = toNumber(cal.grid[view.rent]!.cumulative[n - 1]!);
  const vault = cal.months[(view.month || Math.min(12, cal.months.length)) - 1]!;
  const tone = (x: number) => (x < 0 ? "bz-rs-is-warn" : "bz-rs-is-ok");
  return (
    <div className="bz-rs-facts">
      <div className={`bz-n-fact ${tone(cash)}`}>
        <span>{t(view.month ? "cal.kpi.month" : "cal.kpi.average")}</span>
        <strong><Count value={cash} still={still} render={(x) => `${fmt.num(x, 2)} ${cur}`} /></strong>
        <small>{view.month ? monthName(cal.months[view.month - 1]!.month, locale) : t("cal.average")}</small>
      </div>
      <div className={`bz-n-fact ${tone(total)}`}>
        <span>{t("cal.kpi.cumulative", { n })}</span>
        <strong><Count value={total} still={still} render={(x) => `${fmt.num(x, 2)} ${cur}`} /></strong>
        <small>{t("cal.kpi.rented", { from: monthName(cal.months[0]!.month, locale), to: monthName(cal.months[n - 1]!.month, locale) })}</small>
      </div>
      <div className="bz-n-fact bz-n-is-gold">
        <span>{t("cal.kpi.equity")}</span>
        <strong><Count value={toNumber(vault.equity)} still={still} render={(x) => `${fmt.num(x)} ${cur}`} /></strong>
        <small>{t("cal.kpi.equityAt", { when: monthName(vault.month, locale) })}</small>
      </div>
      <div className="bz-n-fact">
        <span>{t("cal.kpi.breakeven")}</span>
        <strong>{fmt.num(cal.breakeven_rent, 2)} {cur}</strong>
        <small>{cal.target != null && cal.target_rent != null
          ? t("cal.kpi.target", { target: fmt.num(cal.target), rent: `${fmt.num(cal.target_rent, 2)} ${cur}` })
          : t("cal.kpi.breakevenSub")}</small>
      </div>
    </div>
  );
}
