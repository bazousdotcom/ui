# Bazous UI

**Le kit d’interface open source de [Bazous](https://bazous.com).** Chaque question d’argent — *combien ai-je maintenant ? que dois-je payer avant le salaire ? jusqu’où puis-je descendre ?* — est un module indépendant, rendu en cinq langues à partir d’un contrat de données public. La communauté peut en ajouter, les améliorer ou les traduire sans jamais toucher à un compte, une clé ou une donnée réelle.

[Galerie en ligne](https://bazousdotcom.github.io/ui/) · [Contribuer](CONTRIBUTING.md) · [English below](#english)

## Ce qu’il y a dedans

| Dossier | Rôle |
| --- | --- |
| `schema/snapshot.schema.json` | Le contrat : la réponse de l’API Bazous (`GET /api/v1/cockpit`), la seule chose que le kit connaît. |
| `schema/canvas.json` | Le contrat du canevas Capture : balises, classes et intentions qu’une IA a le droit d’écrire. |
| `src/modules/<id>/` | Un module = une question. Une fonction pure `select(snapshot)` et une vue React. |
| `src/primitives/` | Carte, tuile, ligne, bouton, courbe de trésorerie. |
| `src/i18n/`, `src/format/` | Cinq langues (FR, DE, IT, RM, EN) et les chiffres suisses : `3’420.50` partout. |
| `src/engine/scenario.ts` | Le seul calcul du kit : rejouer les échéances quand on active un levier « et si ». |
| `src/canvas/` | Le CSS et le pont du canevas Capture (iframe isolée, aucune requête réseau). |
| `fixtures/` | Trois ménages fictifs produits par le vrai moteur Bazous, et leurs réponses (`answers-*.json`). |
| `src/answers/` | Les dessins des réponses : une fonction `drawVisual()` sans React, et le composant `<AnswerPicture>`. |
| `schema/answers.schema.json` | Le contrat des réponses et de leur bloc `visual`. |
| `gallery/` | La galerie publique : tous les modules, cinq langues, deux thèmes. |

## Les modules

**Une question, une réponse d’expert.** On ne demande pas à la personne de savoir quoi demander : chaque module arrive avec la réponse. Un module réussi se lit en une phrase — un verdict, sa tonalité (tout va bien, attention, risque) et, si besoin, le « parce que ».

| id | Question | Taille | Lit dans le contrat | Montre aujourd’hui | Intentions émises | Réponse d’expert ? | Ce qui manque | Verdict visé (exemple fictif) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `available-now` | Combien ai-je maintenant ? | tuile | `opening_balance`, `accounts`, `data_quality` | Le disponible, et « N comptes sans solde » | — | ✅ oui | La fraîcheur du chiffre | « 3’420.50 CHF disponibles · 1 compte sans solde, chiffre incomplet » |
| `due-before-payday` | Que dois-je payer avant le salaire ? | tuile | `due_before_next_income`, `gap_before_next_income`, `opening_balance`, `next_income_date` | « Couvert · il reste X » ou « Il manque X avant le revenu » | — | ✅ oui, le modèle à suivre | — | déjà en place |
| `low-point` | Jusqu’où puis-je descendre ? | tuile | `low_point`, `next_income_date`, `second_income_date` | Point bas prévu et sa date, « N jours avant le revenu » | — | ✅ en grande partie | Une tonalité : +50 et −1’200 se ressemblent | « Point bas −1’240 le 20.10 · découvert 4 jours avant le salaire » |
| `margin-after-payday` | Que me restera-t-il ? | tuile | `end_of_horizon`, `second_income_date`, `data_quality` | La marge à une date, signalée si des récurrences n’ont pas de montant | — | ✅ oui | — | déjà en place |
| `monthly-structure` | Combien me coûte un mois ? | étroite | `structure`, `debts`, `data_quality` | Charges fixes / revenus, taux, marge structurelle, dettes | — | ⚠️ surtout des chiffres | Un jugement : ce taux est-il sain ? | « Vos charges fixes prennent 76 % du revenu : il reste ≈ 2’200 CHF / mois » |
| `next-actions` | Que faire ensuite ? | large | `actions`, `next_income_date` | « N décisions · M min », groupées et accompagnées d’un conseil | `mark_paid`, `reschedule`, `classify_transaction`, `review_obligation`, `open` | ✅ oui, le plus « expert » | — | déjà en place |
| `pay-cycles` | Qu’est-ce qui tombe à chaque salaire ? | pleine largeur | `cycles`, `events`, `next_income_date`, `horizon_end` | La liste des échéances par cycle de paie | `mark_paid`, `open` | ⚠️ une liste, pas de conclusion | Dire quel cycle est serré | « Le cycle 24.10 → 24.11 est le plus serré : 5’600 sortent pour 4’800 entrés » |
| `what-if` | Et si je décale un paiement ? | pleine largeur | `points`, `events`, `main_cycle`, `low_point`, `end_of_horizon`… (11 champs) | Courbe, horizon, « Pourquoi ? », leviers à activer, « Enregistrer comme scénario » | `set_horizon`, `save_scenario` | ❌ demande à la personne d’explorer | Proposer d’emblée le meilleur levier | « Le meilleur geste : reporter le loyer au 24.10 → aucun jour sous zéro » |

**Bilan de la 0.1 :** 5 modules répondent, 2 affichent des données, 1 demande d’explorer. Aucun module ne renvoie `null` : face à des données incomplètes, ils répondent en partie et le signalent.

**Prochaine étape (0.2) :** rendre la réponse obligatoire dans le contrat — chaque module fournira un verdict d’une phrase avec sa tonalité, testé dans les cinq langues — puis donner un verdict à `monthly-structure` et `pay-cycles`, et faire de `what-if` « le meilleur geste », recommandation d’abord. Les contributions sur ces trois modules sont les bienvenues.

## Les réponses dessinées

Bazous répond aussi en phrases (`GET /api/v1/answers`, et l’outil MCP `get_household_answers` pour Claude et ChatGPT). Une réponse peut porter un bloc `visual` : la forme du dessin, les chiffres à dessiner et une légende qui dit la même réponse sous un autre angle. Tout est calculé par le moteur ; le kit dessine.

| `kind` | Question | Ce que le dessin montre |
| --- | --- | --- |
| `runway` | Que dois-je payer avant le salaire ? | La piste jusqu’au jour de paie, les factures en chemin, le disponible face à ce qui est dû |
| `valley` | Jusqu’où puis-je descendre ? | La vallée du solde, la zone sous zéro, le point bas |
| `shift` | Et si je décale un paiement ? | Avant / après : la facture déplacée au jour de paie, les deux courbes rejouées par le moteur |
| `days` | Combien de temps tiendrais-je sans revenu ? | Les jours de charges fixes couverts, sur les 90 conseillés |
| `balance` | Qu’est-ce qui tombe à chaque salaire ? | Ce qui entre face à ce qui sort, et le trou |
| `countdown` | Ma prime d’assurance maladie augmente-t-elle ? | Le compte à rebours jusqu’à l’échéance, la marche de la prime |
| `horizon` | Que me restera-t-il ? | La courbe jusqu’à la fin de la période, la ligne d’arrivée et ce qu’elle représente en jours de charges fixes |
| `calendar` | Quelle grosse dépense de l’année arrive bientôt ? | Les 90 prochains jours et les factures annuelles qui y tombent |
| `leak` | Est-ce que je paie des frais évitables ? | Ce que les frais font sur 10 ans |
| `jar` | Ai-je mis de côté pour mes impôts ? | Douze mois à remplir face au bordereau, ce que cela fait par jour |
| `gauge` | Puis-je encore verser sur mon 3e pilier ? | Versé et encore possible jusqu’au plafond, et les jours jusqu’au 31.12 |
| `deadline` | Un contrat doit-il être résilié bientôt ? | Aujourd’hui, le jour où la lettre doit arriver, le renouvellement |

```tsx
import { AnswerPicture, type Answers } from "@bazous/ui";

function Answer({ answer, locale }: { answer: Answers["answers"][number]; locale: "fr" }) {
  return (
    <article>
      <p>{answer.question}</p>
      <AnswerPicture visual={answer.visual} locale={locale} />
      {answer.visual && <p>{answer.visual.caption}</p>}
      <p>{answer.answer}</p>
    </article>
  );
}
```

Sans React (une page statique, la carte des assistants) : `import { drawVisual } from "@bazous/ui/answers"` renvoie un `SVGSVGElement`, ou `null` quand il n’y a rien à dessiner. Le dessin suit le thème par les jetons `--bz-*`.

Les questions encore sans dessin (« Combien ai-je maintenant ? », « Que faire ensuite ? », « Combien me coûte un mois ? », « Et si l’un des revenus manquait ? ») sont ouvertes aux contributions : ouvrez une issue avec votre angle.

## Les règles qui ne bougent pas

1. **Aucun réseau.** Un module ne fait ni requête, ni stockage, ni cookie. Il émet une intention (`mark_paid`, `reschedule`, `open`…) que l’application exécute. Un test parcourt `src/` et échoue sinon.
2. **Le moteur calcule, le kit montre.** Les modules sélectionnent et mettent en forme des chiffres déjà calculés côté serveur. Exception assumée : le rejeu des leviers, qui sans levier reproduit la courbe du moteur au centime (testé).
3. **Cinq langues ou rien.** Chaque clé existe dans les cinq langues, chaque module est rendu dans les cinq langues et les trois ménages de test sans clé manquante, `NaN` ou `undefined`.
4. **Chiffres suisses.** `3’420.50` dans toutes les langues, vrai signe moins, dates courtes `24.09`. Les nombres ne passent jamais par `Intl` (les navigateurs ne s’accordent pas sur fr-CH et it-CH).
5. **Données fictives uniquement** dans ce dépôt.

## Utiliser le kit

```bash
npm install github:bazousdotcom/ui#v0.3.0
```

```tsx
import "@bazous/ui/styles.css";
import { Dashboard, MODULES, type ModuleAction, type Snapshot } from "@bazous/ui";

function Cockpit({ snapshot }: { snapshot: Snapshot }) {
  const onAction = (action: ModuleAction) => {
    // l’application appelle son API avec le jeton de l’utilisateur, puis recharge le snapshot
  };
  return <Dashboard modules={MODULES} snapshot={snapshot} locale="fr" theme="dark" onAction={onAction} />;
}
```

Les polices ne sont pas embarquées : chargez Playfair Display (500, 600) et Montserrat (400, 500, 600).

## Développer

```bash
npm install
npm run dev        # galerie sur http://localhost:5173
npm run check      # types, tests, build
```

## Traductions

Le romanche suit le Rumantsch Grischun ; une relecture par un·e locuteur·rice natif·ve est la bienvenue (étiquette `langue:rm`).

## Licence

MIT. Le kit est libre ; la marque Bazous, son logo et le service Bazous Cloud ne sont pas couverts par cette licence.

---

## English

**Bazous UI is the open-source interface kit of [Bazous](https://bazous.com).** Every money question is a self-contained module rendered in five languages (French, German, Italian, Romansh, English) from a public data contract (`schema/snapshot.schema.json`). Modules never touch the network: they select numbers the Bazous engine already computed and emit intents the host app executes. Fixtures are fictitious and generated by the real engine. See [CONTRIBUTING.md](CONTRIBUTING.md) to add a question; `npm run check` must pass. Licensed MIT; the Bazous name and logo are not.

### The modules at a glance

One question, one expert answer: people should not have to know what to ask. Each module should read as a single sentence — a verdict, its tone (fine, watch out, risk) and, when useful, the reason.

| id | Question | Expert answer today? | What is missing |
| --- | --- | --- | --- |
| `available-now` | How much do I have now? | ✅ yes | How fresh the figure is |
| `due-before-payday` | What do I owe before payday? | ✅ yes — the model to follow | — |
| `low-point` | How low might I go? | ✅ mostly | A tone: +50 and −1’200 look alike |
| `margin-after-payday` | What will be left? | ✅ yes | — |
| `monthly-structure` | What does a month cost me? | ⚠️ mostly figures | A judgement: is this ratio healthy? |
| `next-actions` | What next? | ✅ yes — the most "expert" | — |
| `pay-cycles` | What falls due each pay cycle? | ⚠️ a list, no conclusion | Which cycle is tight |
| `what-if` | What if I move a payment? | ❌ asks the person to explore | Lead with the best lever |

Next (0.2): make the answer part of the contract (a one-sentence verdict with a tone, tested in all five languages), then give `monthly-structure` and `pay-cycles` a verdict and turn `what-if` into "the best move". Contributions on these three modules are welcome.

### Answers with pictures

Bazous also answers in sentences (`GET /api/v1/answers`, and the MCP tool `get_household_answers` for Claude and ChatGPT). An answer may carry a `visual` block: the kind of picture (`runway`, `valley`, `shift`, `days`, `balance`, `countdown`, `horizon`, `calendar`, `leak`, `jar`, `gauge`, `deadline`), the figures to draw and a caption that says the same answer from another angle. The engine computes everything; the kit draws it, with `<AnswerPicture>` in React or `drawVisual()` from `@bazous/ui/answers` anywhere else. The contract is `schema/answers.schema.json`. Questions without a picture yet (available now, next actions, monthly structure, income loss) are open for contributions.
