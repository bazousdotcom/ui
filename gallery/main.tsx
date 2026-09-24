import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import demo from "../fixtures/demo.json";
import empty from "../fixtures/empty.json";
import tight from "../fixtures/tight.json";
import {
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
  type Snapshot,
} from "../src";
import "./gallery.css";

const FIXTURES: Record<string, Snapshot> = { demo: demo as Snapshot, tight: tight as Snapshot, empty: empty as Snapshot };

const UI = {
  fr: { title: "Galerie des modules", intro: "Chaque carte répond à une question d’argent. Toutes les données sont fictives ; rien ne quitte cette page.", cockpit: "Cockpit", modules: "Modules", data: "Données", reads: "Lit", log: "Intentions émises", logEmpty: "Cliquez un bouton : l’intention apparaît ici au lieu d’être envoyée.", source: "Code source" },
  de: { title: "Modulgalerie", intro: "Jede Karte beantwortet eine Geldfrage. Alle Daten sind fiktiv; nichts verlässt diese Seite.", cockpit: "Cockpit", modules: "Module", data: "Daten", reads: "Liest", log: "Ausgelöste Absichten", logEmpty: "Klicken Sie eine Schaltfläche: die Absicht erscheint hier, statt gesendet zu werden.", source: "Quellcode" },
  it: { title: "Galleria dei moduli", intro: "Ogni scheda risponde a una domanda sul denaro. Tutti i dati sono fittizi; nulla lascia questa pagina.", cockpit: "Cockpit", modules: "Moduli", data: "Dati", reads: "Legge", log: "Intenzioni emesse", logEmpty: "Clicca un pulsante: l’intenzione appare qui invece di essere inviata.", source: "Codice sorgente" },
  rm: { title: "Galaria dals moduls", intro: "Mintga carta respunda ina dumonda da daners. Tut las datas èn fictivas; nagut na banduna questa pagina.", cockpit: "Cockpit", modules: "Moduls", data: "Datas", reads: "Legia", log: "Intenziuns emessas", logEmpty: "Cliccai in buttun: l’intenziun cumpara qua empè da vegnir tramessa.", source: "Code da funtauna" },
  en: { title: "Module gallery", intro: "Each card answers one money question. All data is fictitious; nothing leaves this page.", cockpit: "Cockpit", modules: "Modules", data: "Data", reads: "Reads", log: "Emitted intents", logEmpty: "Click a button: the intent shows up here instead of being sent.", source: "Source code" },
} satisfies Record<Locale, Record<string, string>>;

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(location.hash.slice(1)).get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function Gallery() {
  const [locale, setLocale] = useState<Locale>(() => read("lang", LOCALES, pickLocale(navigator.languages)));
  const [theme, setTheme] = useState<"dark" | "light">(() => read("theme", ["dark", "light"] as const, "dark"));
  const [fixture, setFixture] = useState<string>(() => read("data", Object.keys(FIXTURES), "demo"));
  const [view, setView] = useState<"cockpit" | "modules">(() => read("view", ["cockpit", "modules"] as const, "cockpit"));
  const [horizon, setHorizon] = useState<Horizon>("cycles");
  const [log, setLog] = useState<ModuleAction[]>([]);
  const t = useMemo(() => createT(locale, sharedMessages), [locale]);
  const ui = UI[locale];
  const snapshot = FIXTURES[fixture] ?? (demo as Snapshot);

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
              <button type="button" key={f} className={f === fixture ? "bz-on" : ""} aria-pressed={f === fixture} onClick={() => setFixture(f)}>{f}</button>
            ))}
          </div>
          <div className="bz-seg" role="group" aria-label="Vue">
            <button type="button" className={view === "cockpit" ? "bz-on" : ""} onClick={() => setView("cockpit")}>{ui.cockpit}</button>
            <button type="button" className={view === "modules" ? "bz-on" : ""} onClick={() => setView("modules")}>{ui.modules}</button>
          </div>
          <a className="bz-button bz-ghost g-source" href="https://github.com/bazousdotcom/ui">{ui.source} ↗</a>
        </nav>
      </header>

      <section className="g-hero">
        <p className="bz-eyebrow">{t("sample")}</p>
        <h1>{ui.title}</h1>
        <p className="bz-body">{ui.intro}</p>
      </section>

      {view === "cockpit" ? (
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
