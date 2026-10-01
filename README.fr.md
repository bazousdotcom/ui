# Bazous UI

**Le kit d’interface open source de [Bazous](https://bazous.com).** Chaque question d’argent — *combien ai-je maintenant ? que dois-je payer avant le salaire ? jusqu’où puis-je descendre ?* — est un module indépendant, rendu en cinq langues à partir d’un contrat de données public. Tout le monde peut en ajouter, les améliorer ou les traduire sans jamais toucher à un compte, une clé ou une donnée réelle.

[![npm](https://img.shields.io/npm/v/@bazous/ui)](https://www.npmjs.com/package/@bazous/ui) [▶ Démo](https://bazous.com/fr/demo) · [Galerie en ligne](https://bazousdotcom.github.io/ui/) · [La matrice des questions](docs/matrix.md) · [Contribuer](CONTRIBUTING.md) (en anglais) · [English](README.md)

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
| `fixtures/` | Des ménages inventés, calculés par le vrai moteur Bazous : Léa et Sam « avant » (`before.json`) et « après » le diagnostic (`after.json`), un ménage de démonstration et un ménage vide, avec leurs réponses (`answers-*.json`). |
| `src/answers/` | Les dessins des réponses : une fonction `drawVisual()` sans React, et le composant `<AnswerPicture>`. |
| `schema/answers.schema.json` | Le contrat des réponses et de leur bloc `visual`. |
| `gallery/` | La galerie publique : tous les modules, les réponses dessinées et la matrice, cinq langues, deux thèmes. |
| `docs/matrix.md` | La matrice : les 16 questions, leur module, leur dessin, et celles qui attendent le leur. |

## Les modules

**Une question, une réponse d’expert.** On ne demande pas à la personne de savoir quoi demander : chaque module arrive avec la réponse. Un module réussi se lit en une phrase — un verdict, sa tonalité (tout va bien, attention, risque) et, si besoin, le « parce que ».

| id | Question | Taille | Lit dans le contrat | Montre aujourd’hui | Intentions émises | Réponse d’expert ? | Ce qui manque | Verdict visé (exemple fictif) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `available-now` | Combien ai-je maintenant ? | tuile | `opening_balance`, `accounts`, `data_quality` | Le disponible, et « N comptes sans solde » | — | ✅ oui | La fraîcheur du chiffre | « 3’420.50 CHF disponibles · 1 compte sans solde, chiffre incomplet » |
| `due-before-payday` | Que dois-je payer avant le salaire ? | tuile | `due_before_next_income`, `gap_before_next_income`, `opening_balance`, `next_income_date` | « Couvert · il reste X » ou « Il manque X avant le revenu » | — | ✅ oui, le modèle à suivre | — | déjà en place |
| `low-point` | Jusqu’où puis-je descendre ? | tuile | `low_point`, `next_income_date`, `second_income_date` | Point bas prévu et sa date, « N jours avant le revenu » | — | ✅ en grande partie | Une tonalité : +50 et −1’200 se ressemblent | « Point bas −1’240 le 20.10 · découvert 4 jours avant le salaire » |
| `margin-after-payday` | Que me restera-t-il ? | tuile | `end_of_horizon`, `second_income_date`, `data_quality` | La marge à une date, signalée si des récurrences n’ont pas de montant | — | ✅ oui | — | déjà en place |
| `monthly-structure` | Combien me coûte un mois ? | étroite | `structure`, `debts`, `data_quality` | Charges fixes / revenus, taux, marge structurelle, dettes | — | ⚠️ surtout des chiffres | Un jugement : ce taux est-il sain ? | « Tes charges fixes prennent 76 % du revenu : il reste ≈ 2’200 CHF / mois » |
| `next-actions` | Que faire ensuite ? | large | `actions`, `next_income_date` | « N décisions · M min », groupées et accompagnées d’un conseil | `mark_paid`, `reschedule`, `classify_transaction`, `review_obligation`, `open` | ✅ oui, le plus « expert » | — | déjà en place |
| `pay-cycles` | Qu’est-ce qui tombe à chaque salaire ? | pleine largeur | `cycles`, `events`, `next_income_date`, `horizon_end` | La liste des échéances par cycle de paie | `mark_paid`, `open` | ⚠️ une liste, pas de conclusion | Dire quel cycle est serré | « Le cycle 24.10 → 24.11 est le plus serré : 5’600 sortent pour 4’800 entrés » |
| `what-if` | Et si je décale un paiement ? | pleine largeur | `points`, `events`, `main_cycle`, `low_point`, `end_of_horizon`… (11 champs) | Courbe, horizon, « Pourquoi ? », leviers à activer, « Enregistrer comme scénario » | `set_horizon`, `save_scenario` | ❌ demande à la personne d’explorer | Proposer d’emblée le meilleur levier | « Le meilleur geste : reporter le loyer au 24.10 → aucun jour sous zéro » |
| `payday-pressure` | Quelle pression avant le salaire ? | large | `opening_balance`, `due_before_next_income`, `gap_before_next_income`, `cycles` | Deux cercles d’aire proportionnelle (disponible / dû), la plus grosse, la deuxième et la prochaine échéance | — | ✅ oui | — | « Il manque 3’800 CHF d’ici au 30.10 » |
| `cost-constellation` | Où part mon argent chaque mois ? | étroite | `structure` | Chaque catégorie de charges fixes en étoile autour du total mensuel | — | ✅ oui | — | « Enfants prend 32 % de tes charges fixes » |
| `balance-river` | Pourquoi mon solde descend-il ? | pleine largeur | `points`, `events`, `low_point`, `opening_balance` | Le solde en rivière à marches, les 4 plus grosses sorties numérotées et expliquées | — | ✅ oui | — | « 4 factures font 52 % des sorties jusqu’au point bas » |
| `bill-map` | Quelles échéances pèsent le plus ? | pleine largeur | `events`, `as_of`, `horizon_end`, dates de revenu | Chaque facture en bulle (date, poids, devise), les 7 jours les plus lourds grisés | — | ✅ oui | — | « Du 01.11 au 07.11, 4’900 CHF sortent : 35 % de la période » |
| `month-wall` | Comment se présente chaque mois ? | pleine largeur | `points`, `events`, `opening_balance` | Une colonne par mois : entrées, sorties, point bas, fin de mois, sa courbe et ses plus gros mouvements | — | ✅ oui | — | « Novembre est le mois le plus serré : point bas −6’000 CHF le 28.11 » |

**Bilan de la 0.1 :** 5 modules répondent, 2 affichent des données, 1 demande d’explorer. Aucun module ne renvoie `null` : face à des données incomplètes, ils répondent en partie et le signalent.

**Les dessins de la communauté (0.4) :** en septembre 2026, des personnes qui utilisent Bazous ont envoyé cinq tableaux faits main (« Cash River », « Deadline Galaxy », « Pressure Shockwave », « Calendar Wall », « Category Constellation »). Leurs chiffres étaient tapés à la main et se contredisaient parfois ; les cinq modules ci-dessus gardent les dessins et prennent chaque chiffre dans le moteur. Les parties décoratives (orbites, halos) sont restées dehors, tout comme les idées auxquelles le contrat ne répond pas encore : une fourchette de prévision pour les dépenses variables et un coût du retard par facture. Les deux demandent d’abord de nouveaux champs dans le contrat.

**« Nuit » (0.5) : l’argent dessiné en lumière, et des scènes qu’on interroge.** Les cinq dessins deviennent des scènes de nuit : l’or, c’est l’argent disponible ; le rouge, ce qui manque ; le vert, la paie qui arrive. Une scène de nuit reste sombre dans les deux thèmes, comme la tuile mise en avant. Les scènes partagent un même **focus** (`ctx.focus`), modifié par une intention `focus` et gardé par `<Dashboard>` :

- **zoom :** un mois dans `month-wall` l’éclaire dans toutes les scènes ; une étoile, une planète ou une cause numérotée ouvre la facture, avec toutes ses échéances ;
- **filtre :** la bande des catégories de `bill-map` et les étoiles de `cost-constellation` limitent toutes les scènes à une catégorie (les échéances portent `category` depuis la 0.5) ;
- **regroupement :** `bill-map` regroupe par facture, semaine, catégorie ou mois ; `balance-river` se lit au jour ou à la semaine ;
- **et si :** « Et si je la paie le 30.10 ? » décale une échéance à la paie suivante ; `replayMoves` rejoue les échéances du moteur (sans décalage, c’est la courbe du moteur), l’ancienne rivière reste en pointillés et le cœur de la paie est recalculé à partir du montant dû du moteur.

La barre de focus au-dessus de la grille dit ce qui est montré et se défait pièce par pièce. Rien n’est enregistré, et chaque intention arrive toujours à l’hôte. Poser la question en mots, c’est le rôle de l’assistant : dans ChatGPT ou Claude, les mêmes réponses viennent de `get_household_answers`.

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

Les questions encore sans dessin (« Combien ai-je maintenant ? », « Que faire ensuite ? », « Combien me coûte un mois ? », « Et si l’un des revenus manquait ? ») sont ouvertes aux contributions : ouvre une issue avec ton angle. La [matrice](docs/matrix.md) (et sa [version vivante](https://bazousdotcom.github.io/ui/#view=matrix)) montre où en est chaque question.

## Les règles qui ne bougent pas

1. **Aucun réseau.** Un module ne fait ni requête, ni stockage, ni cookie. Il émet une intention (`mark_paid`, `reschedule`, `open`…) que l’application exécute. Un test parcourt `src/` et échoue sinon.
2. **Le moteur calcule, le kit montre.** Les modules sélectionnent et mettent en forme des chiffres déjà calculés côté serveur. Exception assumée : le rejeu des leviers, qui sans levier reproduit la courbe du moteur au centime (testé).
3. **Cinq langues ou rien.** Chaque clé existe dans les cinq langues, chaque module est rendu dans les cinq langues et les trois ménages de test sans clé manquante, `NaN` ou `undefined`.
4. **Chiffres suisses.** `3’420.50` dans toutes les langues, vrai signe moins, dates courtes `24.09`. Les nombres ne passent jamais par `Intl` (les navigateurs ne s’accordent pas sur fr-CH et it-CH).
5. **Données fictives uniquement** dans ce dépôt.

## Utiliser le kit

```bash
npm install @bazous/ui
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

Les polices ne sont pas embarquées : charge Playfair Display (500, 600) et Montserrat (400, 500, 600).

## Développer

```bash
npm install
npm run dev        # galerie sur http://localhost:5173
npm run check      # types, tests, build
```

Publier une release GitHub `vX.Y.Z` (égale à la version de `package.json`) lance les tests et publie le paquet sur npm, avec provenance.

## Traductions

Le romanche suit le Rumantsch Grischun ; une relecture par un·e locuteur·rice natif·ve est la bienvenue (étiquette `lang:rm`).

## Licence

MIT. Le kit est libre ; la marque Bazous, son logo et le service Bazous Cloud ne sont pas couverts par cette licence.
