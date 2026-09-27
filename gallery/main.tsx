import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import after from "../fixtures/after.json";
import answersAfter from "../fixtures/answers-after.json";
import answersBefore from "../fixtures/answers-before.json";
import answersOverdrawn from "../fixtures/answers-overdrawn.json";
import before from "../fixtures/before.json";
import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import {
  AnswerPicture,
  Dashboard,
  LOCALE_NAMES,
  LOCALES,
  MODULES,
  Question,
  createT,
  pickLocale,
  sharedMessages,
  type Horizon,
  type Locale,
  type ModuleAction,
  type Answers,
  type Snapshot,
} from "../src";
import "./gallery.css";
import { Matrix } from "./Matrix";

// One invented family told in two acts, computed by the Bazous engine: « Avant », overdrawn on 1 October,
// and « Après », three months after following the diagnosis. The dark theme tells the first act, the light one the second.
const ANSWERS = { before: answersBefore, after: answersAfter, overdrawn: answersOverdrawn } as unknown as Record<string, Record<Locale, Answers>>;
const FIXTURES: Record<string, Snapshot> = { before: before as Snapshot, after: after as Snapshot, demo: demo as Snapshot, empty: empty as Snapshot };
const STORY_THEME: Record<string, "dark" | "light"> = { before: "dark", after: "light" };

const UI = {
  fr: { matrix: "Matrice", answers: "Réponses", "data.before": "Avant", "data.after": "Après", "data.demo": "Démo", "data.empty": "Vide", "household.before": "Avant · 1er octobre", "household.after": "Après · trois mois plus tard", "household.overdrawn": "À découvert, factures aux longs noms", allClear: "Au vert", answersIntro: "Chaque réponse a son dessin : les chiffres et la légende viennent du moteur, le kit ne fait que dessiner. Le même code dessine sur bazous.com, dans Claude et dans ChatGPT.", title: "Galerie des modules", intro: "Chaque carte répond à une question d’argent. Toutes les données sont fictives ; rien ne quitte cette page.", cockpit: "Cockpit", modules: "Modules", data: "Données", reads: "Lit", log: "Intentions émises", logEmpty: "Cliquez un bouton : l’intention apparaît ici au lieu d’être envoyée.", source: "Code source" },
  de: { matrix: "Matrix", answers: "Antworten", "data.before": "Vorher", "data.after": "Nachher", "data.demo": "Demo", "data.empty": "Leer", "household.before": "Vorher · 1. Oktober", "household.after": "Nachher · drei Monate später", "household.overdrawn": "Im Minus, Rechnungen mit langen Namen", allClear: "Im grünen Bereich", answersIntro: "Jede Antwort hat ihr Bild: Zahlen und Bildlegende kommen vom Rechenkern, das Kit zeichnet nur. Derselbe Code zeichnet auf bazous.com, in Claude und in ChatGPT.", title: "Modulgalerie", intro: "Jede Karte beantwortet eine Geldfrage. Alle Daten sind fiktiv; nichts verlässt diese Seite.", cockpit: "Cockpit", modules: "Module", data: "Daten", reads: "Liest", log: "Ausgelöste Absichten", logEmpty: "Klicken Sie eine Schaltfläche: die Absicht erscheint hier, statt gesendet zu werden.", source: "Quellcode" },
  it: { matrix: "Matrice", answers: "Risposte", "data.before": "Prima", "data.after": "Dopo", "data.demo": "Demo", "data.empty": "Vuoto", "household.before": "Prima · 1° ottobre", "household.after": "Dopo · tre mesi più tardi", "household.overdrawn": "In rosso, fatture con nomi lunghi", allClear: "Tutto a posto", answersIntro: "Ogni risposta ha il suo disegno: cifre e didascalia vengono dal motore, il kit disegna soltanto. Lo stesso codice disegna su bazous.com, in Claude e in ChatGPT.", title: "Galleria dei moduli", intro: "Ogni scheda risponde a una domanda sul denaro. Tutti i dati sono fittizi; nulla lascia questa pagina.", cockpit: "Cockpit", modules: "Moduli", data: "Dati", reads: "Legge", log: "Intenzioni emesse", logEmpty: "Clicca un pulsante: l’intenzione appare qui invece di essere inviata.", source: "Codice sorgente" },
  rm: { matrix: "Matrix", answers: "Respostas", "data.before": "Avant", "data.after": "Suenter", "data.demo": "Demo", "data.empty": "Vid", "household.before": "Avant · 1. october", "household.after": "Suenter · trais mais pli tard", "household.overdrawn": "En il minus, quints cun nums lungs", allClear: "En urden", answersIntro: "Mintga resposta ha ses dissegn: las cifras e la legenda vegnan dal motor, il kit dissegna mo. Il medem code dissegna sin bazous.com, en Claude ed en ChatGPT.", title: "Galaria dals moduls", intro: "Mintga carta respunda ina dumonda da daners. Tut las datas èn fictivas; nagut na banduna questa pagina.", cockpit: "Cockpit", modules: "Moduls", data: "Datas", reads: "Legia", log: "Intenziuns emessas", logEmpty: "Cliccai in buttun: l’intenziun cumpara qua empè da vegnir tramessa.", source: "Code da funtauna" },
  en: { matrix: "Matrix", answers: "Answers", "data.before": "Before", "data.after": "After", "data.demo": "Demo", "data.empty": "Empty", "household.before": "Before · 1 October", "household.after": "After · three months later", "household.overdrawn": "Overdrawn, bills with long names", allClear: "All clear", answersIntro: "Each answer has its picture: the figures and the caption come from the engine, the kit only draws. The same code draws on bazous.com, in Claude and in ChatGPT.", title: "Module gallery", intro: "Each card answers one money question. All data is fictitious; nothing leaves this page.", cockpit: "Cockpit", modules: "Modules", data: "Data", reads: "Reads", log: "Emitted intents", logEmpty: "Click a button: the intent shows up here instead of being sent.", source: "Source code" },
} satisfies Record<Locale, Record<string, string>>;

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(location.hash.slice(1)).get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function Gallery() {
  const [locale, setLocale] = useState<Locale>(() => read("lang", LOCALES, pickLocale(navigator.languages)));
  const [fixture, setFixture] = useState<string>(() => read("data", Object.keys(FIXTURES), "before"));
  const [theme, setTheme] = useState<"dark" | "light">(() => read("theme", ["dark", "light"] as const, STORY_THEME[fixture] ?? "dark"));
  const [view, setView] = useState<"cockpit" | "modules" | "answers" | "matrix">(() => read("view", ["cockpit", "modules", "answers", "matrix"] as const, "answers"));
  const pickFixture = (f: string) => {
    setFixture(f);
    if (STORY_THEME[f]) setTheme(STORY_THEME[f]);
  };
  const [horizon, setHorizon] = useState<Horizon>("cycles");
  const [log, setLog] = useState<ModuleAction[]>([]);
  const t = useMemo(() => createT(locale, sharedMessages), [locale]);
  const ui = UI[locale];
  const snapshot = FIXTURES[fixture] ?? (before as Snapshot);

  useEffect(() => {
    location.hash = new URLSearchParams({ lang: locale, theme, data: fixture, view }).toString();
    document.documentElement.lang = locale;
    document.body.dataset.theme = theme;
  }, [locale, theme, fixture, view]);

  const onAction = (a: ModuleAction) => {
    if (a.type === "set_horizon") setHorizon(a.horizon);
    setLog((prev) => [a, ...prev].slice(0, 8));
  };

  return (
    <div className="bz g-shell" data-theme={theme}>
      <header className="g-top">
        <div className="g-brand">
          <span className="g-word">BAZOUS</span>
          <span className="g-tag">UI</span>
        </div>
        <nav className="g-controls" aria-label="Options">
          <div className="bz-seg" role="group" aria-label={t("language")}>
            {LOCALES.map((l) => (
              <button type="button" key={l} className={l === locale ? "bz-on" : ""} aria-pressed={l === locale} title={LOCALE_NAMES[l]} onClick={() => setLocale(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
          <div className="bz-seg" role="group" aria-label={t("theme")}>
            {(["dark", "light"] as const).map((th) => (
              <button type="button" key={th} className={th === theme ? "bz-on" : ""} aria-pressed={th === theme} onClick={() => setTheme(th)}>{t(th === "dark" ? "themeDark" : "themeLight")}</button>
            ))}
          </div>
          <div className="bz-seg" role="group" aria-label={ui.data}>
            {Object.keys(FIXTURES).map((f) => (
              <button type="button" key={f} className={f === fixture ? "bz-on" : ""} aria-pressed={f === fixture} onClick={() => pickFixture(f)}>{ui[`data.${f}` as keyof typeof ui]}</button>
            ))}
          </div>
          <div className="bz-seg" role="group" aria-label="Vue">
            <button type="button" className={view === "cockpit" ? "bz-on" : ""} onClick={() => setView("cockpit")}>{ui.cockpit}</button>
            <button type="button" className={view === "modules" ? "bz-on" : ""} onClick={() => setView("modules")}>{ui.modules}</button>
            <button type="button" className={view === "answers" ? "bz-on" : ""} onClick={() => setView("answers")}>{ui.answers}</button>
            <button type="button" className={view === "matrix" ? "bz-on" : ""} onClick={() => setView("matrix")}>{ui.matrix}</button>
          </div>
          <a className="bz-button bz-ghost g-source" href="https://github.com/bazousdotcom/ui">{ui.source} ↗</a>
        </nav>
      </header>

      <section className="g-hero">
        <p className="bz-eyebrow">{t("sample")}</p>
        <h1>{ui.title}</h1>
        <p className="bz-body">{ui.intro}</p>
      </section>

      {view === "matrix" ? (
        <Matrix locale={locale} households={Object.values(ANSWERS)} />
      ) : view === "answers" ? (
        <div className="g-answers">
          <p className="bz-body">{ui.answersIntro}</p>
          {Object.entries(ANSWERS).sort(([a], [b]) => Number(b === fixture) - Number(a === fixture)).map(([name, byLocale]) => (
            <section key={name} className="g-household">
              <h2 className="bz-title">{ui[`household.${name}` as keyof typeof ui]}</h2>
              <p className="bz-body g-headline">{byLocale[locale].headline}</p>
              <div className="g-answer-grid">
                {byLocale[locale].answers.filter((a) => a.visual).map((a) => (
                  <article key={a.id} className={`bz-card g-answer g-${a.tone}`}>
                    <div className="g-module-head"><code>{a.id}</code><span className="bz-note">{a.visual!.kind}</span></div>
                    <p className="bz-eyebrow">{a.question}</p>
                    <AnswerPicture visual={a.visual} locale={locale} />
                    <p className="g-caption">{a.visual!.caption}</p>
                    <p className="bz-body">{a.answer}</p>
                  </article>
                ))}
              </div>
              {byLocale[locale].all_clear.length > 0 && (
                <div className="bz-card g-clear">
                  <p className="bz-eyebrow">{ui.allClear} · {byLocale[locale].all_clear.length}</p>
                  <ul>
                    {byLocale[locale].all_clear.map((a) => (
                      <li key={a.id}><span aria-hidden="true">✓</span> <strong>{a.question}</strong> {a.short}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : view === "cockpit" ? (
        <Dashboard modules={MODULES} snapshot={snapshot} locale={locale} horizon={horizon} theme={theme} onAction={onAction} />
      ) : (
        <div className="g-modules">
          {MODULES.map((m) => (
            <section key={m.id} className={`g-module g-${m.size}`}>
              <div className="g-module-head">
                <code>{m.id}</code>
                <span className="bz-note">{ui.reads}: {m.reads.join(", ")}</span>
              </div>
              <Question module={m} snapshot={snapshot} locale={locale} horizon={horizon} onAction={onAction} />
            </section>
          ))}
        </div>
      )}

      <aside className="bz-card g-log" aria-live="polite">
        <p className="bz-eyebrow">{ui.log}</p>
        {log.length === 0 ? <p className="bz-note">{ui.logEmpty}</p> : log.map((a, i) => <code key={i}>{JSON.stringify(a)}</code>)}
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
