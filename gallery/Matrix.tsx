import { useState } from "react";

import { AnswerPicture, MODULES, type Answers, type Locale } from "../src";

type Answer = Answers["answers"][number];

/**
 * The matrix for contributors: every question Bazous answers, where its module lives
 * and which picture draws it. Questions, answers and pictures come from the kit and
 * from the fictional households, so the page follows the code by itself.
 */
const ROWS: readonly { id: string; source: "kit" | "expert" }[] = [
  ...MODULES.map((m) => ({ id: m.id, source: "kit" as const })),
  ...["annual-bills", "safety-cushion", "income-loss", "avoidable-fees", "health-insurance", "tax-provision", "pillar-3a", "contract-notice"].map((id) => ({ id, source: "expert" as const })),
];

// A question no fictional household answers yet (the engine only asks it with two incomes).
const EXTRA_QUESTIONS: Record<string, Record<Locale, string>> = {
  "income-loss": {
    fr: "Et si l’un des revenus manquait ?",
    de: "Und wenn eines der Einkommen ausfiele?",
    it: "E se venisse a mancare uno dei redditi?",
    rm: "E sch’ina da las entradas mancass?",
    en: "What if one of the incomes stopped?",
  },
};

// The angle we would like for each question still without a picture.
const IDEAS: Record<string, Record<Locale, string>> = {
  "available-now": {
    fr: "Le disponible, et ce qu’il représente face à la prochaine échéance.",
    de: "Das Verfügbare, und was es gegenüber der nächsten Fälligkeit bedeutet.",
    it: "Il disponibile, e cosa rappresenta rispetto alla prossima scadenza.",
    rm: "Il disponibel, e tge ch’el munta envers la proxima scadenza.",
    en: "What is available, and what it means against the next bill.",
  },
  "next-actions": {
    fr: "Les décisions du jour, triées par urgence, en une image.",
    de: "Die Entscheidungen des Tages, nach Dringlichkeit, in einem Bild.",
    it: "Le decisioni del giorno, ordinate per urgenza, in un’immagine.",
    rm: "Las decisiuns dal di, tenor urgenza, en in maletg.",
    en: "Today’s decisions, sorted by urgency, in one picture.",
  },
  "monthly-structure": {
    fr: "Où part chaque franc du revenu : charges fixes, marge.",
    de: "Wohin jeder Franken des Einkommens geht: Fixkosten, Marge.",
    it: "Dove va ogni franco del reddito: spese fisse, margine.",
    rm: "Nua che mintga franc da l’entrada va: custs fixs, margin.",
    en: "Where each franc of income goes: fixed costs, margin.",
  },
  "income-loss": {
    fr: "La courbe avec et sans ce revenu, le jour où tout bascule.",
    de: "Die Kurve mit und ohne dieses Einkommen, der Tag, an dem es kippt.",
    it: "La curva con e senza quel reddito, il giorno in cui tutto cambia.",
    rm: "La curva cun e senza quella entrada, il di che tut sa volva.",
    en: "The curve with and without that income, the day it tips over.",
  },
};

const COPY = {
  fr: { title: "La matrice des questions", intro: "Chaque question que Bazous pose pour un ménage : le module du kit, le dessin qui y répond, et celles qui attendent encore leur dessin. Les réponses montrées sont celles de ménages fictifs.", all: "Toutes", kit: "Communauté", expert: "Expert", open: "Dessin à créer", module: "Module", engine: "Réponse du moteur", picture: "Dessin", toDraw: "À dessiner", idea: "L’angle cherché", propose: "Proposer un dessin", doc: "La matrice en texte" },
  de: { title: "Die Matrix der Fragen", intro: "Jede Frage, die Bazous für einen Haushalt stellt: das Modul des Kits, das Bild, das sie beantwortet, und jene, die noch auf ihr Bild warten. Die gezeigten Antworten stammen von fiktiven Haushalten.", all: "Alle", kit: "Community", expert: "Fachwissen", open: "Bild fehlt", module: "Modul", engine: "Antwort des Rechenkerns", picture: "Bild", toDraw: "Noch zu zeichnen", idea: "Gesuchter Blickwinkel", propose: "Ein Bild vorschlagen", doc: "Die Matrix als Text" },
  it: { title: "La matrice delle domande", intro: "Ogni domanda che Bazous pone per un’economia domestica: il modulo del kit, il disegno che risponde e quelle che aspettano ancora il loro disegno. Le risposte mostrate sono di economie domestiche fittizie.", all: "Tutte", kit: "Comunità", expert: "Esperti", open: "Disegno da creare", module: "Modulo", engine: "Risposta del motore", picture: "Disegno", toDraw: "Da disegnare", idea: "L’angolo cercato", propose: "Proporre un disegno", doc: "La matrice in testo" },
  rm: { title: "La matrix da las dumondas", intro: "Mintga dumonda che Bazous metta per ina chasada: il modul dal kit, il dissegn che respunda e quellas che spetgan anc lur dissegn. Las respostas mussadas èn da chasadas fictivas.", all: "Tuttas", kit: "Communitad", expert: "Expert", open: "Dissegn da crear", module: "Modul", engine: "Resposta dal motor", picture: "Dissegn", toDraw: "Da dissegnar", idea: "L’angel tschertgà", propose: "Proponer in dissegn", doc: "La matrix en text" },
  en: { title: "The question matrix", intro: "Every question Bazous asks for a household: the kit module, the picture that answers it, and the ones still waiting for a picture. The answers shown come from fictional households.", all: "All", kit: "Community", expert: "Expert", open: "Picture wanted", module: "Module", engine: "Engine answer", picture: "Picture", toDraw: "To draw", idea: "The angle we want", propose: "Suggest a picture", doc: "The matrix as text" },
} satisfies Record<Locale, Record<string, string>>;

type Filter = "all" | "kit" | "expert" | "open";
const REPO = "https://github.com/bazousdotcom/ui";

export function Matrix({ locale, households }: { locale: Locale; households: Record<Locale, Answers>[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const c = COPY[locale];
  const answersOf = (id: string): Answer[] => households.flatMap((h) => h[locale].answers.filter((a) => a.id === id));
  const rows = ROWS.map((row) => {
    const found = answersOf(row.id);
    const drawn = found.find((a) => a.visual) ?? null;
    const question = MODULES.find((m) => m.id === row.id)?.question[locale] ?? found[0]?.question ?? EXTRA_QUESTIONS[row.id]?.[locale] ?? row.id;
    return { ...row, question, drawn, example: drawn ?? found[0] ?? null };
  });
  const visible = rows.filter((r) => filter === "all" || (filter === "open" ? !r.drawn : r.source === filter));
  const count = (f: Filter) => rows.filter((r) => f === "all" || (f === "open" ? !r.drawn : r.source === f)).length;

  return (
    <div className="g-answers g-matrix">
      <section className="g-household">
        <h2 className="bz-title">{c.title}</h2>
        <p className="bz-body">{c.intro} <a href={`${REPO}/blob/main/docs/matrix.md`}>{c.doc} ↗</a></p>
        <div className="bz-seg" role="group" aria-label={c.title}>
          {(["all", "kit", "expert", "open"] as const).map((f) => (
            <button type="button" key={f} className={f === filter ? "bz-on" : ""} aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {c[f]} ({count(f)})
            </button>
          ))}
        </div>
      </section>
      <div className="g-answer-grid">
        {visible.map((r) => (
          <article key={r.id} className={`bz-card g-answer ${r.drawn ? "g-info" : "g-wanted"}`} data-question={r.id}>
            <div className="g-module-head">
              <code>{r.id}</code>
              <span className="bz-note">{c[r.source]} · {r.drawn ? r.drawn.visual!.kind : c.toDraw}</span>
            </div>
            <p className="g-caption">{r.question}</p>
            {r.drawn ? (
              <>
                <AnswerPicture visual={r.drawn.visual} locale={locale} />
                <p className="bz-note">{r.drawn.visual!.caption}</p>
              </>
            ) : (
              <p className="bz-body"><strong>{c.idea}{locale === "fr" ? " :" : ":"}</strong> {IDEAS[r.id]?.[locale]}</p>
            )}
            {r.example && <p className="bz-body">{r.example.answer}</p>}
            <p className="g-links">
              {r.source === "kit" ? <a href={`${REPO}/tree/main/src/modules/${r.id}`}>{c.module} ↗</a> : <span className="bz-note">{c.engine}</span>}
              {r.drawn ? (
                <a href={`${REPO}/blob/main/src/answers/draw.ts`}>{c.picture} ↗</a>
              ) : (
                <a href={`${REPO}/issues/new?title=${encodeURIComponent(`Picture: ${r.id}`)}`}>{c.propose} ↗</a>
              )}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
