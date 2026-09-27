import type { Action, BillAction } from "../../contract/snapshot";
import { toNumber } from "../../contract/snapshot";
import type { Formatters } from "../../format";
import type { Translate } from "../../i18n";
import { Button, Card, Dot, Empty } from "../../primitives";
import { defineModule, type ModuleAction } from "../types";

type GroupKey = "late" | "beforePayday" | "toConfirm" | "toPlan";
type Model = { groups: { key: GroupKey; items: Action[] }[]; count: number; currency: string; payday: string | null };

const GROUPS: { key: GroupKey; accepts: (a: Action) => boolean }[] = [
  { key: "late", accepts: (a) => a.type === "overdue" || a.type === "due_today" },
  { key: "beforePayday", accepts: (a) => a.type === "before_income" },
  { key: "toConfirm", accepts: (a) => a.type === "undated" || a.type === "needs_review" || a.type === "missing_amounts" },
  { key: "toPlan", accepts: (a) => a.type === "plan" },
];

export default defineModule<Model>({
  id: "next-actions",
  size: "wide",
  question: {
    fr: "Que faire ensuite ?",
    de: "Was kommt als Nächstes?",
    it: "Cosa faccio dopo?",
    rm: "Tge vegn suenter?",
    en: "What next?",
  },
  reads: ["actions", "base_currency", "next_income_date"],
  messages: {
    fr: {
      title: "À traiter", "count.one": "{n} décision · {m} min", "count.other": "{n} décisions · {m} min", empty: "Rien à traiter aujourd’hui.",
      "g.late": "En retard", "g.beforePayday": "À payer avant le prochain salaire", "g.toConfirm": "Sans date ou à confirmer", "g.toPlan": "À planifier",
      overdue: "{label} · échu depuis le {date}", dueToday: "{label} · échu aujourd’hui", beforePayday: "{label} · à payer avant le salaire · {date}", undated: "{label} · date à confirmer",
      markPaid: "Marquer payé", planOn: "Planifier le {date}",
      plan: "{label} · {amount} avant le {date}", planBody: "Échéance après le salaire : rien à faire avant, prévoyez-la dans le prochain cycle.",
      review: "{label} · à qualifier", reviewTx: "Transaction du {date} · {amount}", reviewOb: "Échéance du {date} · {amount}", confidence: "confiance {p} %",
      internal: "Transfert interne", expense: "Dépense", accept: "Valider", cancel: "Annuler",
      "missing.one": "{n} récurrence sans montant", "missing.other": "{n} récurrences sans montant", missingBody: "{items} · la marge finale est fausse tant qu’elles manquent", complete: "Compléter",
    },
    de: {
      title: "Zu erledigen", "count.one": "{n} Entscheidung · {m} Min.", "count.other": "{n} Entscheidungen · {m} Min.", empty: "Heute nichts zu erledigen.",
      "g.late": "Überfällig", "g.beforePayday": "Vor dem nächsten Lohn zu bezahlen", "g.toConfirm": "Ohne Datum oder zu bestätigen", "g.toPlan": "Zu planen",
      overdue: "{label} · überfällig seit {date}", dueToday: "{label} · heute fällig", beforePayday: "{label} · vor dem Lohn fällig · {date}", undated: "{label} · Datum zu bestätigen",
      markPaid: "Als bezahlt markieren", planOn: "Auf {date} planen",
      plan: "{label} · {amount} bis {date}", planBody: "Nach dem Lohn fällig: vorher ist nichts zu tun, planen Sie sie im nächsten Zyklus ein.",
      review: "{label} · zu prüfen", reviewTx: "Transaktion vom {date} · {amount}", reviewOb: "Fälligkeit vom {date} · {amount}", confidence: "Sicherheit {p} %",
      internal: "Interne Überweisung", expense: "Ausgabe", accept: "Bestätigen", cancel: "Stornieren",
      "missing.one": "{n} wiederkehrender Posten ohne Betrag", "missing.other": "{n} wiederkehrende Posten ohne Betrag", missingBody: "{items} · der Spielraum stimmt erst, wenn sie erfasst sind", complete: "Ergänzen",
    },
    it: {
      title: "Da fare", "count.one": "{n} decisione · {m} min", "count.other": "{n} decisioni · {m} min", empty: "Niente da fare oggi.",
      "g.late": "In ritardo", "g.beforePayday": "Da pagare prima del prossimo stipendio", "g.toConfirm": "Senza data o da confermare", "g.toPlan": "Da pianificare",
      overdue: "{label} · scaduto dal {date}", dueToday: "{label} · scade oggi", beforePayday: "{label} · da pagare prima dello stipendio · {date}", undated: "{label} · data da confermare",
      markPaid: "Segna come pagato", planOn: "Pianifica il {date}",
      plan: "{label} · {amount} entro il {date}", planBody: "Scade dopo lo stipendio: niente da fare prima, la preveda nel prossimo ciclo.",
      review: "{label} · da verificare", reviewTx: "Transazione del {date} · {amount}", reviewOb: "Scadenza del {date} · {amount}", confidence: "affidabilità {p} %",
      internal: "Trasferimento interno", expense: "Spesa", accept: "Conferma", cancel: "Annulla",
      "missing.one": "{n} ricorrenza senza importo", "missing.other": "{n} ricorrenze senza importo", missingBody: "{items} · il margine finale è sbagliato finché mancano", complete: "Completa",
    },
    rm: {
      title: "Da far", "count.one": "{n} decisiun · {m} min", "count.other": "{n} decisiuns · {m} min", empty: "Oz nagut da far.",
      "g.late": "Retardà", "g.beforePayday": "Da pajar avant il proxim salari", "g.toConfirm": "Senza data u da confermar", "g.toPlan": "Da planisar",
      overdue: "{label} · scadì dapi ils {date}", dueToday: "{label} · scada oz", beforePayday: "{label} · da pajar avant il salari · {date}", undated: "{label} · data da confermar",
      markPaid: "Marcar sco pajà", planOn: "Planisar ils {date}",
      plan: "{label} · {amount} fin ils {date}", planBody: "Scadenza suenter il salari: nagut da far avant, planisai ella en il proxim ciclus.",
      review: "{label} · da controllar", reviewTx: "Transacziun dals {date} · {amount}", reviewOb: "Termin dals {date} · {amount}", confidence: "fidanza {p} %",
      internal: "Transfer intern", expense: "Expensa", accept: "Confermar", cancel: "Annullar",
      "missing.one": "{n} repetiziun senza summa", "missing.other": "{n} repetiziuns senza summa", missingBody: "{items} · il margin final è fauss uschè ditg ch’ellas mancan", complete: "Cumplettar",
    },
    en: {
      title: "To do", "count.one": "{n} decision · {m} min", "count.other": "{n} decisions · {m} min", empty: "Nothing to do today.",
      "g.late": "Overdue", "g.beforePayday": "Due before next payday", "g.toConfirm": "No date or to confirm", "g.toPlan": "To schedule",
      overdue: "{label} · overdue since {date}", dueToday: "{label} · due today", beforePayday: "{label} · due before payday · {date}", undated: "{label} · date to confirm",
      markPaid: "Mark paid", planOn: "Schedule on {date}",
      plan: "{label} · {amount} by {date}", planBody: "Due after payday: nothing to do before then, plan it in the next cycle.",
      review: "{label} · to review", reviewTx: "Transaction on {date} · {amount}", reviewOb: "Bill due {date} · {amount}", confidence: "confidence {p}%",
      internal: "Internal transfer", expense: "Expense", accept: "Confirm", cancel: "Cancel",
      "missing.one": "{n} recurring item without an amount", "missing.other": "{n} recurring items without an amount", missingBody: "{items} · the final margin is wrong until they are filled in", complete: "Fill in",
    },
  },
  select: (s) => ({
    groups: GROUPS.map((g) => ({ key: g.key, items: s.actions.filter(g.accepts) })).filter((g) => g.items.length > 0),
    count: s.actions.length,
    currency: s.base_currency,
    payday: s.next_income_date,
  }),
  View: ({ model, t, fmt, onAction }) => (
    <Card question={t("question")} title={t("title")} meta={model.count > 0 ? t("count", { n: model.count, m: Math.max(1, Math.ceil(model.count / 2)) }) : undefined}>
      {model.count === 0 && <Empty>{t("empty")}</Empty>}
      {model.groups.map((g) => (
        <div className="bz-group" key={g.key}>
          <h3 className="bz-group-title">{t(`g.${g.key}`)} <span>{g.items.length}</span></h3>
          {g.items.map((a, i) => (
            <ActionRow key={`${a.type}-${"ref_id" in a ? a.ref_id : i}`} a={a} currency={model.currency} payday={model.payday} t={t} fmt={fmt} onAction={onAction} />
          ))}
        </div>
      ))}
    </Card>
  ),
});

function ActionRow({ a, currency, payday, t, fmt, onAction }: { a: Action; currency: string; payday: string | null; t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void }) {
  if (a.type === "missing_amounts") {
    return (
      <div className="bz-row bz-action">
        <Dot tone="warn" />
        <div className="bz-row-body">
          <strong>{t("missing", { n: a.items.length })}</strong>
          <span>{t("missingBody", { items: a.items.join(", ") })}</span>
        </div>
        <Button onClick={() => onAction({ type: "open", target: "recurrences" })}>{t("complete")}</Button>
      </div>
    );
  }
  const conf = a.confidence ? ` · ${t("confidence", { p: fmt.num(toNumber(a.confidence) * 100) })}` : "";
  if (a.type === "needs_review") {
    const tx = a.kind === "transaction";
    return (
      <div className="bz-row bz-action">
        <Dot tone="warn" />
        <div className="bz-row-body">
          <strong>{t("review", { label: a.label })}</strong>
          <span>{t(tx ? "reviewTx" : "reviewOb", { date: fmt.shortDate(a.date), amount: fmt.money(a.amount, a.currency) })}{conf}</span>
        </div>
        {tx ? (
          <>
            <Button onClick={() => onAction({ type: "classify_transaction", ref_id: a.ref_id, internal_transfer: true })}>{t("internal")}</Button>
            <Button onClick={() => onAction({ type: "classify_transaction", ref_id: a.ref_id, internal_transfer: false })}>{t("expense")}</Button>
          </>
        ) : (
          <>
            <Button onClick={() => onAction({ type: "review_obligation", ref_id: a.ref_id, decision: "accept" })}>{t("accept")}</Button>
            <Button variant="ghost" onClick={() => onAction({ type: "review_obligation", ref_id: a.ref_id, decision: "cancel" })}>{t("cancel")}</Button>
          </>
        )}
      </div>
    );
  }
  return <BillRow a={a} currency={currency} payday={payday} conf={conf} t={t} fmt={fmt} onAction={onAction} />;
}

function BillRow({ a, currency, payday, conf, t, fmt, onAction }: { a: BillAction; currency: string; payday: string | null; conf: string; t: Translate; fmt: Formatters; onAction: (a: ModuleAction) => void }) {
  const amount = a.currency === currency ? fmt.money(a.amount, a.currency) : `${fmt.money(a.amount, a.currency)} · ${fmt.num(a.amount_base)} ${currency}`;
  const date = fmt.shortDate(a.date);
  const title =
    a.type === "overdue" ? t("overdue", { label: a.label, date })
    : a.type === "due_today" ? t("dueToday", { label: a.label })
    : a.type === "before_income" ? t("beforePayday", { label: a.label, date })
    : a.type === "undated" ? t("undated", { label: a.label })
    : t("plan", { label: a.label, amount: fmt.money(a.amount, a.currency), date });
  const detail = a.type === "plan" ? (a.description || t("planBody")) : [amount, a.description].filter(Boolean).join(" · ");
  // A late bill can still be postponed to the next payday. A bill due after payday is never
  // moved earlier: paying sooner cannot lift a later low point and can create a new one.
  const moveTo = a.type === "overdue" || a.type === "due_today" ? (payday && a.date && payday > a.date ? payday : null) : null;
  const tone = a.type === "overdue" || a.type === "due_today" ? "danger" : a.type === "plan" ? "muted" : "warn";
  return (
    <div className="bz-row bz-action">
      <Dot tone={tone} />
      <div className="bz-row-body">
        <strong>{title}</strong>
        <span>{detail}{conf}</span>
      </div>
      {moveTo && <Button onClick={() => onAction({ type: "reschedule", ref_id: a.ref_id, date: moveTo })}>{t("planOn", { date: fmt.shortDate(moveTo) })}</Button>}
      <Button variant={a.type === "overdue" || a.type === "due_today" ? "primary" : "secondary"} onClick={() => onAction({ type: "mark_paid", ref_id: a.ref_id })}>{t("markPaid")}</Button>
    </div>
  );
}
