import { useState } from "react";

import type { CashEvent, Cycle } from "../../contract/snapshot";
import { toNumber } from "../../contract/snapshot";
import { daysBetween, type Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { Button, Card, Empty } from "../../primitives";
import { defineModule, type ModuleAction } from "../types";

type Group = { key: string; items: CashEvent[] };
type Column = { key: string; title: { kind: "before"; date: string } | { kind: "cycle"; from: string; to: string }; totalOut: string; totalIn: string; truncated: string | null; cycle: Cycle };
type Model = { columns: Column[]; outflows: number; currency: string; today: string; missing: number };

export default defineModule<Model>({
  id: "pay-cycles",
  size: "full",
  question: {
    fr: "Qu’est-ce qui tombe à chaque salaire ?",
    de: "Was fällt in jeder Lohnperiode an?",
    it: "Cosa scade in ogni periodo di paga?",
    rm: "Tge croda en mintga perioda da salari?",
    en: "What falls due each pay cycle?",
  },
  reads: ["cycles", "events", "next_income_date", "horizon_end", "as_of", "data_quality", "base_currency"],
  messages: {
    fr: { title: "Échéances par cycle de paie", sub: "{n} sorties · {cur} équivalent, devise d’origine entre parenthèses", all: "Toutes les échéances →", compact: "Vue condensée ←", before: "Avant le revenu du {date}", cycle: "Cycle {from} → {to}", until: "au {date}", "group.one": "{n} échéance · déplier", "group.other": "{n} échéances · déplier", paid: "Payé", recurring: "récurrence", "missing.one": "{n} récurrence sans montant", "missing.other": "{n} récurrences sans montant", toEnter: "à saisir", empty: "Aucune sortie." },
    de: { title: "Fälligkeiten pro Lohnperiode", sub: "{n} Ausgaben · {cur}-Gegenwert, Originalwährung in Klammern", all: "Alle Fälligkeiten →", compact: "Kompakte Ansicht ←", before: "Vor dem Einkommen am {date}", cycle: "Periode {from} → {to}", until: "bis {date}", "group.one": "{n} Fälligkeit · aufklappen", "group.other": "{n} Fälligkeiten · aufklappen", paid: "Bezahlt", recurring: "wiederkehrend", "missing.one": "{n} wiederkehrender Posten ohne Betrag", "missing.other": "{n} wiederkehrende Posten ohne Betrag", toEnter: "erfassen", empty: "Keine Ausgaben." },
    it: { title: "Scadenze per periodo di paga", sub: "{n} uscite · equivalente {cur}, valuta originale tra parentesi", all: "Tutte le scadenze →", compact: "Vista compatta ←", before: "Prima del reddito del {date}", cycle: "Periodo {from} → {to}", until: "al {date}", "group.one": "{n} scadenza · espandi", "group.other": "{n} scadenze · espandi", paid: "Pagato", recurring: "ricorrente", "missing.one": "{n} ricorrenza senza importo", "missing.other": "{n} ricorrenze senza importo", toEnter: "da inserire", empty: "Nessuna uscita." },
    rm: { title: "Termins per perioda da salari", sub: "{n} sortidas · equivalent {cur}, valuta originala tranter parentesas", all: "Tut ils termins →", compact: "Vista cumpacta ←", before: "Avant il salari dals {date}", cycle: "Perioda {from} → {to}", until: "fin ils {date}", "group.one": "{n} termin · extender", "group.other": "{n} termins · extender", paid: "Pajà", recurring: "repetitiv", "missing.one": "{n} repetiziun senza summa", "missing.other": "{n} repetiziuns senza summa", toEnter: "endatar", empty: "Naginas sortidas." },
    en: { title: "Bills by pay cycle", sub: "{n} outflows · {cur} equivalent, original currency in brackets", all: "All bills →", compact: "Compact view ←", before: "Before the {date} income", cycle: "Cycle {from} → {to}", until: "to {date}", "group.one": "{n} bill · expand", "group.other": "{n} bills · expand", paid: "Paid", recurring: "recurring", "missing.one": "{n} recurring item without an amount", "missing.other": "{n} recurring items without an amount", toEnter: "to enter", empty: "No outflows." },
  },
  select: (s) => {
    const last = s.cycles.length - 1;
    return {
      columns: s.cycles.map((c, i) => ({
        key: c.key,
        title: c.key === "before_income" ? { kind: "before" as const, date: s.next_income_date ?? c.end } : { kind: "cycle" as const, from: c.start, to: c.end },
        totalOut: c.total_out,
        totalIn: c.total_in,
        truncated: i === last && c.end === s.horizon_end && daysBetween(c.start, c.end) < 25 ? c.end : null,
        cycle: c,
      })),
      outflows: s.events.filter((e) => e.direction === "outflow").length,
      currency: s.base_currency,
      today: s.as_of,
      missing: s.data_quality.rules_without_amount.length,
    };
  },
  View: ({ model, t, fmt, onAction }) => {
    const [all, setAll] = useState(false);
    return (
      <Card
        question={t("question")}
        title={t("title")}
        meta={t("sub", { n: model.outflows, cur: model.currency })}
        actions={<Button variant="link" onClick={() => setAll((v) => !v)}>{all ? t("compact") : t("all")}</Button>}
      >
        <div className="bz-cycles">
          {model.columns.map((col, i) => (
            <CycleColumn key={col.key} col={col} all={all} missing={i === model.columns.length - 1 ? model.missing : 0} currency={model.currency} today={model.today} t={t} fmt={fmt} onAction={onAction} />
          ))}
        </div>
      </Card>
    );
  },
});

function CycleColumn({ col, all, missing, currency, today, t, fmt, onAction }: {
  col: Column; all: boolean; missing: number; currency: string; today: string;
  t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const items = all ? col.cycle.items : col.cycle.items.filter((e) => e.direction === "outflow");
  const groups: Group[] = all ? items.map((e) => ({ key: `${e.ref_id}-${e.date}`, items: [e] })) : groupCycle(items);
  const title = col.title.kind === "before" ? t("before", { date: fmt.shortDate(col.title.date) }) : t("cycle", { from: fmt.shortDate(col.title.from), to: fmt.shortDate(col.title.to) });
  return (
    <div className="bz-cycle">
      <div className="bz-cycle-head">
        <span>{title}</span>
        <strong className={toNumber(col.totalOut) > 0 ? "bz-neg" : "bz-muted"}>
          {fmt.signed(-toNumber(col.totalOut))}
          {all && toNumber(col.totalIn) > 0 && <span className="bz-pos"> {fmt.signed(col.totalIn)}</span>}
          {col.truncated && <span className="bz-muted"> {t("until", { date: fmt.shortDate(col.truncated) })}</span>}
        </strong>
      </div>
      {groups.map((g) => {
        if (g.items.length === 1 || open.has(g.key)) {
          return g.items.map((e) => <EventRow key={`${e.ref_id}-${e.date}-${e.label}`} e={e} currency={currency} today={today} t={t} fmt={fmt} onAction={onAction} />);
        }
        const first = g.items[0]!;
        const lastItem = g.items[g.items.length - 1]!;
        return (
          <button type="button" className="bz-row bz-row-button" key={g.key} onClick={() => setOpen((prev) => new Set(prev).add(g.key))}>
            <span className="bz-date">{fmt.dateSpan(first.date, lastItem.date)}</span>
            <div className="bz-row-body bz-wrap">
              <strong>{g.items.map((e) => shortLabel(e.label)).join(", ")}</strong>
              <span>{t("group", { n: g.items.length })}</span>
            </div>
            <strong className="bz-amount">{fmt.num(g.items.reduce((sum, e) => sum + toNumber(e.amount), 0))}</strong>
          </button>
        );
      })}
      {items.length === 0 && <Empty>{t("empty")}</Empty>}
      {missing > 0 && (
        <button type="button" className="bz-row bz-row-button bz-warn-row" onClick={() => onAction({ type: "open", target: "recurrences" })}>
          <span className="bz-date">?</span>
          <div className="bz-row-body bz-wrap"><strong>{t("missing", { n: missing })}</strong></div>
          <strong className="bz-amount">{t("toEnter")}</strong>
        </button>
      )}
    </div>
  );
}

function EventRow({ e, currency, today, t, fmt, onAction }: {
  e: CashEvent; currency: string; today: string;
  t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void;
}) {
  const late = e.date < today || e.status === "overdue";
  const foreign = e.currency !== currency;
  const payable = e.kind === "obligation" && e.ref_id && daysBetween(today, e.date) <= 0;
  return (
    <div className={`bz-row${late ? " bz-late" : ""}`}>
      <span className="bz-date">{fmt.shortDate(e.date)}</span>
      <div className="bz-row-body">
        <strong>{e.direction === "inflow" ? "+ " : ""}{e.label}</strong>
        {foreign && <span>({fmt.money(e.original_amount, e.currency)})</span>}
        {!foreign && e.kind === "recurrence" && <span>{t("recurring")}</span>}
      </div>
      <strong className={`bz-amount${e.direction === "inflow" ? " bz-pos" : ""}`}>{fmt.num(e.amount)}</strong>
      {payable && <Button variant="ghost" onClick={() => onAction({ type: "mark_paid", ref_id: e.ref_id! })}>{t("paid")}</Button>}
    </div>
  );
}

/** Big bills stand alone; small ones fold into one line per week (at most four per line). */
export function groupCycle(items: CashEvent[]): Group[] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || toNumber(b.amount) - toNumber(a.amount));
  const total = sorted.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const big = (e: CashEvent) => toNumber(e.amount) >= Math.max(400, total * 0.08) || e.status === "overdue";
  const out: Group[] = [];
  let bucket: CashEvent[] = [];
  const flush = () => {
    const head = bucket[0];
    const tail = bucket[bucket.length - 1];
    if (head && tail) out.push({ key: `${head.date}-${tail.date}-${bucket.length}`, items: bucket });
    bucket = [];
  };
  for (const e of sorted) {
    if (big(e)) {
      flush();
      out.push({ key: `${e.ref_id}-${e.date}`, items: [e] });
      continue;
    }
    const head = bucket[0];
    if (head && (daysBetween(head.date, e.date) > 7 || bucket.length >= 4)) flush();
    bucket.push(e);
  }
  flush();
  return out;
}

const shortLabel = (label: string) => {
  const words = label.split(/\s+/);
  return words.length > 2 ? words.slice(0, 2).join(" ") : label;
};
