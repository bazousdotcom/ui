import type { Action } from "../../contract/snapshot";
import { toNumber } from "../../contract/snapshot";
import { Button, Card, Dot, Empty } from "../../primitives";
import { defineModule } from "../types";

type Model = { actions: Action[]; currency: string; payday: string | null };

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
      overdue: "{label} · échu depuis le {date}", dueToday: "{label} · échu aujourd’hui", markPaid: "Marquer payé", planOn: "Planifier le {date}",
      plan: "{label} · {amount} avant le {date}", planBody: "Plus grosse sortie après le salaire : la payer le jour de paie évite qu’elle tombe sur le point bas.",
      review: "{label} · à qualifier", reviewTx: "Transaction du {date} · {amount}", reviewOb: "Échéance du {date} · {amount}", confidence: "confiance {p} %",
      internal: "Transfert interne", expense: "Dépense", accept: "Valider", cancel: "Annuler",
      "missing.one": "{n} récurrence sans montant", "missing.other": "{n} récurrences sans montant", missingBody: "{items} · la marge finale est fausse tant qu’elles manquent", complete: "Compléter",
    },
    de: {
      title: "Zu erledigen", "count.one": "{n} Entscheidung · {m} Min.", "count.other": "{n} Entscheidungen · {m} Min.", empty: "Heute nichts zu erledigen.",
      overdue: "{label} · überfällig seit {date}", dueToday: "{label} · heute fällig", markPaid: "Als bezahlt markieren", planOn: "Auf {date} planen",
      plan: "{label} · {amount} bis {date}", planBody: "Grösste Ausgabe nach dem Lohn: am Zahltag bezahlt, fällt sie nicht auf den Tiefpunkt.",
      review: "{label} · zu prüfen", reviewTx: "Transaktion vom {date} · {amount}", reviewOb: "Fälligkeit vom {date} · {amount}", confidence: "Sicherheit {p} %",
      internal: "Interne Überweisung", expense: "Ausgabe", accept: "Bestätigen", cancel: "Stornieren",
      "missing.one": "{n} wiederkehrender Posten ohne Betrag", "missing.other": "{n} wiederkehrende Posten ohne Betrag", missingBody: "{items} · der Spielraum stimmt erst, wenn sie erfasst sind", complete: "Ergänzen",
    },
    it: {
      title: "Da fare", "count.one": "{n} decisione · {m} min", "count.other": "{n} decisioni · {m} min", empty: "Niente da fare oggi.",
      overdue: "{label} · scaduto dal {date}", dueToday: "{label} · scade oggi", markPaid: "Segna come pagato", planOn: "Pianifica il {date}",
      plan: "{label} · {amount} entro il {date}", planBody: "Uscita più grande dopo lo stipendio: pagarla il giorno di paga evita che cada sul minimo.",
      review: "{label} · da verificare", reviewTx: "Transazione del {date} · {amount}", reviewOb: "Scadenza del {date} · {amount}", confidence: "affidabilità {p} %",
      internal: "Trasferimento interno", expense: "Spesa", accept: "Conferma", cancel: "Annulla",
      "missing.one": "{n} ricorrenza senza importo", "missing.other": "{n} ricorrenze senza importo", missingBody: "{items} · il margine finale è sbagliato finché mancano", complete: "Completa",
    },
    rm: {
      title: "Da far", "count.one": "{n} decisiun · {m} min", "count.other": "{n} decisiuns · {m} min", empty: "Oz nagut da far.",
      overdue: "{label} · scadì dapi ils {date}", dueToday: "{label} · scada oz", markPaid: "Marcar sco pajà", planOn: "Planisar ils {date}",
      plan: "{label} · {amount} fin ils {date}", planBody: "La pli gronda sortida suenter il salari: pajada il di da paja na croda ella betg sin il punct bass.",
      review: "{label} · da controllar", reviewTx: "Transacziun dals {date} · {amount}", reviewOb: "Termin dals {date} · {amount}", confidence: "fidanza {p} %",
      internal: "Transfer intern", expense: "Expensa", accept: "Confermar", cancel: "Annullar",
      "missing.one": "{n} repetiziun senza summa", "missing.other": "{n} repetiziuns senza summa", missingBody: "{items} · il margin final è fauss uschè ditg ch’ellas mancan", complete: "Cumplettar",
    },
    en: {
      title: "To do", "count.one": "{n} decision · {m} min", "count.other": "{n} decisions · {m} min", empty: "Nothing to do today.",
      overdue: "{label} · overdue since {date}", dueToday: "{label} · due today", markPaid: "Mark paid", planOn: "Schedule on {date}",
      plan: "{label} · {amount} by {date}", planBody: "Largest bill after payday: paying it on payday keeps it off the low point.",
      review: "{label} · to review", reviewTx: "Transaction on {date} · {amount}", reviewOb: "Bill due {date} · {amount}", confidence: "confidence {p}%",
      internal: "Internal transfer", expense: "Expense", accept: "Confirm", cancel: "Cancel",
      "missing.one": "{n} recurring item without an amount", "missing.other": "{n} recurring items without an amount", missingBody: "{items} · the final margin is wrong until they are filled in", complete: "Fill in",
    },
  },
  select: (s) => ({ actions: s.actions, currency: s.base_currency, payday: s.next_income_date }),
  View: ({ model, t, fmt, onAction }) => {
    const n = model.actions.length;
    const amountLine = (amount: string, currency: string, base?: string) =>
      currency === model.currency || !base ? fmt.money(amount, currency) : `${fmt.money(amount, currency)} · ${fmt.num(base)} ${model.currency}`;
    return (
      <Card question={t("question")} title={t("title")} meta={n > 0 ? t("count", { n, m: Math.max(1, Math.ceil(n / 2)) }) : undefined}>
        {n === 0 && <Empty>{t("empty")}</Empty>}
        {model.actions.map((a, i) => {
          if (a.type === "missing_amounts") {
            return (
              <div className="bz-row bz-action" key={`missing-${i}`}>
                <Dot tone="warn" />
                <div className="bz-row-body">
                  <strong>{t("missing", { n: a.items.length })}</strong>
                  <span>{t("missingBody", { items: a.items.join(", ") })}</span>
                </div>
                <Button onClick={() => onAction({ type: "open", target: "recurrences" })}>{t("complete")}</Button>
              </div>
            );
          }
          if (a.type === "needs_review") {
            const tx = a.kind === "transaction";
            const detail = t(tx ? "reviewTx" : "reviewOb", { date: fmt.shortDate(a.date), amount: fmt.money(a.amount, a.currency) });
            const conf = a.confidence ? ` · ${t("confidence", { p: fmt.num(toNumber(a.confidence) * 100) })}` : "";
            return (
              <div className="bz-row bz-action" key={a.ref_id}>
                <Dot tone="warn" />
                <div className="bz-row-body">
                  <strong>{t("review", { label: a.label })}</strong>
                  <span>{detail}{conf}</span>
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
          if (a.type === "plan") {
            return (
              <div className="bz-row bz-action" key={a.ref_id}>
                <Dot tone="muted" />
                <div className="bz-row-body">
                  <strong>{t("plan", { label: a.label, amount: fmt.money(a.amount, a.currency), date: fmt.shortDate(a.date) })}</strong>
                  <span>{t("planBody")}</span>
                </div>
                <Button onClick={() => onAction({ type: "reschedule", ref_id: a.ref_id, date: a.target })}>{t("planOn", { date: fmt.shortDate(a.target) })}</Button>
              </div>
            );
          }
          return (
            <div className="bz-row bz-action" key={a.ref_id}>
              <Dot tone="danger" />
              <div className="bz-row-body">
                <strong>{t(a.type === "overdue" ? "overdue" : "dueToday", { label: a.label, date: fmt.shortDate(a.date) })}</strong>
                <span>{amountLine(a.amount, a.currency, a.amount_base)}</span>
              </div>
              {model.payday && model.payday > a.date && (
                <Button onClick={() => onAction({ type: "reschedule", ref_id: a.ref_id, date: model.payday! })}>{t("planOn", { date: fmt.shortDate(model.payday) })}</Button>
              )}
              <Button variant="primary" onClick={() => onAction({ type: "mark_paid", ref_id: a.ref_id })}>{t("markPaid")}</Button>
            </div>
          );
        })}
      </Card>
    );
  },
});
