import { useEffect, useState } from "react";
import type { Locale } from "../src";

/**
 * « Community » — what households ask Bazous to answer next, by their 👍: questions (new modules), expert
 * rules of thumb (each with its source, reviewed before the engine uses it) and market offers (for « cheaper
 * alternatives »). Read from community.json, written at build time by scripts/rank-questions.mjs.
 */
type Item = { number: number; title: string; url: string; votes: number; comments: number; opened: string };
type Data = { repo: string; generated: string; available: boolean; module: Item[]; rule: Item[]; offer: Item[] };

const KINDS = ["module", "rule", "offer"] as const;
const FORMS = { module: "new-question.yml", rule: "expert-rule.yml", offer: "market-offer.yml" } as const;

type Words = Record<"intro" | "module" | "rule" | "offer" | "propose" | "vote" | "empty" | "unavailable" | "updated", string>;
const TEXT: Record<Locale, Words> = {
  fr: { intro: "Ce que les foyers demandent à Bazous, classé par 👍. La plus demandée devient un module chaque trimestre ; une règle n’entre dans le moteur qu’avec sa source et après revue ; une offre n’est comparée qu’avec sa source et sa date.", module: "Questions", rule: "Règles d’expert", offer: "Offres du marché", propose: "Proposer", vote: "Voter (👍 sur GitHub)", empty: "Rien pour l’instant : la première proposition est la tienne.", unavailable: "Liste indisponible pour l’instant : elle est relue à chaque publication de la galerie.", updated: "Mis à jour le {date}" },
  de: { intro: "Was Haushalte von Bazous wissen wollen, nach 👍 geordnet. Die meistgefragte Frage wird jedes Quartal ein Modul; eine Regel kommt nur mit Quelle und nach Prüfung in den Rechenkern; ein Angebot wird nur mit Quelle und Datum verglichen.", module: "Fragen", rule: "Expertenregeln", offer: "Marktangebote", propose: "Vorschlagen", vote: "Abstimmen (👍 auf GitHub)", empty: "Noch nichts: Der erste Vorschlag ist deiner.", unavailable: "Liste gerade nicht verfügbar: Sie wird bei jeder Veröffentlichung der Galerie neu gelesen.", updated: "Aktualisiert am {date}" },
  it: { intro: "Quello che le economie domestiche chiedono a Bazous, ordinato per 👍. La più richiesta diventa un modulo ogni trimestre; una regola entra nel motore solo con la sua fonte e dopo revisione; un’offerta è confrontata solo con fonte e data.", module: "Domande", rule: "Regole d’esperto", offer: "Offerte di mercato", propose: "Proporre", vote: "Votare (👍 su GitHub)", empty: "Ancora niente: la prima proposta è la tua.", unavailable: "Lista per ora non disponibile: è riletta a ogni pubblicazione della galleria.", updated: "Aggiornato il {date}" },
  rm: { intro: "Quai che las chasadas dumondan a Bazous, ordinà tenor 👍. La dumonda la pli dumandada daventa mintga quartal in modul; ina regla vegn en il motor mo cun sia funtauna e suenter controlla; ina offerta vegn cumparegliada mo cun funtauna e data.", module: "Dumondas", rule: "Reglas d’expert", offer: "Offertas dal martgà", propose: "Proponer", vote: "Votar (👍 sin GitHub)", empty: "Anc nagut: l’emprima proposta è tia.", unavailable: "Glista per ussa betg disponibla: ella vegn legida da nov a mintga publicaziun da la galaria.", updated: "Actualisà ils {date}" },
  en: { intro: "What households ask Bazous to answer, ranked by 👍. The most asked becomes a module every quarter; a rule enters the engine only with its source and after review; an offer is compared only with its source and date.", module: "Questions", rule: "Expert rules", offer: "Market offers", propose: "Propose", vote: "Vote (👍 on GitHub)", empty: "Nothing yet: the first proposal is yours.", unavailable: "List unavailable for now: it is read again each time the gallery is published.", updated: "Updated on {date}" },
};

export function Community({ locale }: { locale: Locale }) {
  const [data, setData] = useState<Data | null>(null);
  const t = TEXT[locale];
  useEffect(() => {
    // Same origin, written at build time: nothing leaves the page.
    fetch(new URL("community.json", document.baseURI)).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
  }, []);
  const repo = data?.repo ?? "bazousdotcom/ui";
  return (
    <div className="g-answers g-community">
      <p className="bz-body">{t.intro}</p>
      {data && !data.available && <p className="bz-body g-muted">{t.unavailable}</p>}
      <div className="g-community-grid">
        {KINDS.map((kind) => {
          const items = data?.[kind] ?? [];
          return (
            <section key={kind} className="bz-card g-community-col" aria-labelledby={`g-${kind}`}>
              <h2 id={`g-${kind}`} className="bz-eyebrow">{t[kind]}</h2>
              {items.length === 0 ? <p className="bz-body g-muted">{t.empty}</p> : (
                <ol className="g-community-list">
                  {items.slice(0, 10).map((i) => (
                    <li key={i.number}>
                      <span className="g-votes" aria-label={`${i.votes} 👍`}>{i.votes}</span>
                      <a href={i.url}>{i.title}</a>
                    </li>
                  ))}
                </ol>
              )}
              <a className="bz-button" href={`https://github.com/${repo}/issues/new?template=${FORMS[kind]}`}>{t.propose} ↗</a>
            </section>
          );
        })}
      </div>
      {data?.available && <p className="bz-body g-muted">{t.updated.replace("{date}", data.generated)} · {t.vote}</p>}
    </div>
  );
}
