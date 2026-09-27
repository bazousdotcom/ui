# La matrice des questions

**Les questions d’argent que personne ne pense à poser.** Bazous répond, pour un ménage, aux questions que la communauté et des experts ont jugées importantes, avant même qu’on pense à les poser. Le moteur calcule les chiffres ; ce kit les montre, sur [bazous.com](https://bazous.com) comme dans Claude et ChatGPT. Chaque question est un module : une question, une réponse, un dessin.

[Voir la matrice vivante dans la galerie](https://bazousdotcom.github.io/ui/#view=matrix) · [L’histoire Avant / Après](https://bazousdotcom.github.io/ui/#view=answers&data=before) · [Contribuer](../CONTRIBUTING.md) (en anglais) · [English](matrix.md)

## Le moteur calcule, le kit montre

```
Moteur Bazous (privé)  ──►  contrat JSON public  ──►  @bazous/ui (MIT)  ──►  bazous.com · Claude · ChatGPT
prévisions, point bas,      snapshot.schema.json      modules React,          la même réponse,
meilleur report,            answers.schema.json       dessins SVG,            le même dessin,
légendes en 5 langues                                 aucun appel réseau      partout
```

- **bazous.com** importe le kit : la page « Aujourd’hui » dessine les réponses avec `<AnswerPicture>`.
- **La carte de Claude et ChatGPT** (MCP App, serveur `https://bazous.com/mcp`) embarque `@bazous/ui/answers` au moment du build ; elle ne charge rien du réseau.
- Une contribution fusionnée ici arrive donc au même moment sur le site et dans les assistants.

## Les 16 questions

Les réponses citées sont celles de **Léa et Sam**, une famille inventée que la galerie raconte en deux actes :

- **Avant**, le 1er octobre (thème sombre) : 2’200 sur le compte, mais le loyer et l’assurance maladie tombent le jour même et le salaire n’arrive que le 30. Résultat : 58 jours sur 68 sous zéro, un fond à −6’000, des charges fixes à 95 % du revenu, 240 de frais par an (2’400 en 10 ans), une prime maladie qui prend 900 de plus par an. Bazous relève 15 points.
- **Après**, trois mois plus tard (thème clair) : le loyer payé le jour du salaire, la carte et le prêt soldés, une caisse moins chère, un compte sans frais, 500 par mois de côté pour les impôts. Il reste 4 points ; 9 réponses sont au vert.

Les chiffres viennent toujours du moteur ; un module ou un dessin ne les recalcule jamais.

| id | Question | Source | Ce que Bazous répond (exemple) | Chiffres fournis | Dessin | Dans le kit |
| --- | --- | --- | --- | --- | --- | --- |
| `available-now` | Combien ai-je maintenant ? | communauté | « 2’200.00 CHF disponibles, mais loyer et assurance maladie tombent aujourd’hui. » | `amount`, `accounts_without_balance` | 🎨 à créer | [module](../src/modules/available-now) |
| `due-before-payday` | Que dois-je payer avant le salaire ? | communauté | « Il te manque 3’800.00 CHF pendant 29 jours, jusqu’au salaire du 30.10. » | `due`, `available`, `gap`, `next_income_date` | `runway` | [module](../src/modules/due-before-payday) |
| `low-point` | Jusqu’où puis-je descendre ? | communauté | « 58 jours sous zéro dans les 68 prochains jours ; le fond : −6’000.00 CHF le 28.11. » | `balance`, `date`, `days_from_now` | `valley` | [module](../src/modules/low-point) |
| `margin-after-payday` | Que me restera-t-il ? | communauté | « Il te restera 0.00 CHF au 07.12, et une récurrence sans montant le rendra plus bas. » | `balance`, `date` | `horizon` | [module](../src/modules/margin-after-payday) |
| `what-if` | Et si je décale un paiement ? | communauté | « Décale Facture dentiste au 30.11 : ton fond remonte de 2’000.00 CHF. » | `label`, `amount`, `from`, `target`, `low_before`, `low_after` | `shift` | [module](../src/modules/what-if) |
| `next-actions` | Que faire ensuite ? | communauté | « 18 décisions, dont deux aujourd’hui : Loyer (1’800.00 CHF) et Assurance maladie (900.00 CHF). » | `count`, `overdue` | 🎨 à créer | [module](../src/modules/next-actions) |
| `monthly-structure` | Combien me coûte un mois ? | communauté | « Tes charges fixes prennent 95 % de tes revenus : il reste environ 300.00 CHF par mois. » | `fixed_monthly`, `income_monthly`, `ratio` | 🎨 à créer | [module](../src/modules/monthly-structure) |
| `pay-cycles` | Qu’est-ce qui tombe à chaque salaire ? | communauté | « Ce cycle laisse un trou de 2’200.00 CHF : 8’200.00 CHF sortent pour 6’000.00 CHF qui entrent. » | `start`, `end`, `total_out`, `total_in` | `balance` | [module](../src/modules/pay-cycles) |
| `annual-bills` | Quelle grosse dépense de l’année arrive bientôt ? | expert | « Dans 61 jours : Assurance voiture, 1’200.00 CHF. Mettre 600.00 CHF de côté par mois d’ici là suffit. » | `items: label, amount, next_date` | `calendar` | réponse du moteur |
| `safety-cushion` | Combien de temps tiendrais-je sans revenu ? | expert | « Sans salaire, ton argent paie tes charges fixes 11 jours sur les 90 conseillés. » | `months`, `fixed_monthly`, `target_months`, `gap` | `days` | réponse du moteur |
| `income-loss` | Et si l’un des revenus manquait ? | expert | « Sans « Salaire Léa », ton point bas passerait de −6’000.00 à −10’000.00 CHF. » | `income`, `low_point_before`, `low_point` | 🎨 à créer | réponse du moteur |
| `avoidable-fees` | Est-ce que je paie des frais évitables ? | expert | « Ces frais te coûtent 240.00 CHF par an, soit 2’400.00 CHF en 10 ans. » | `per_year`, `items` | `leak` | réponse du moteur |
| `health-insurance` | Ma prime d’assurance maladie augmente-t-elle, et puis-je changer ? | expert | « Il te reste 60 jours pour changer de caisse ; la hausse te coûte 900.00 CHF par an. » | `deadline`, `monthly_premium`, `next_year_monthly_premium`, `increase_per_year` | `countdown` | réponse du moteur |
| `tax-provision` | Ai-je mis de côté pour mes impôts ? | expert | « Pour le prochain bordereau (6’000.00 CHF), mets 500.00 CHF de côté chaque mois : 16.44 CHF par jour. » | `last_annual_bill`, `needed_per_month`, `set_aside_per_month` | `jar` | réponse du moteur |
| `pillar-3a` | Puis-je encore verser sur mon 3e pilier cette année ? | expert | « Il te reste 7’258.00 CHF à verser sur ton 3e pilier d’ici le 31.12, dans 91 jours. » | `left`, `limit`, `year` | `gauge` | réponse du moteur |
| `contract-notice` | Un contrat doit-il être résilié bientôt ? | expert | « Pour résilier Salle de sport (fin le 31.12), ta lettre doit arriver avant le 31.10. » | `contracts: name, ends_on, deadline` | `deadline` | réponse du moteur |

**Bilan :** 16 questions, 12 dessinées sur bazous.com, dans Claude et dans ChatGPT, 4 ouvertes aux contributions.

## Les 12 dessins

Tous dans [`src/answers/draw.ts`](../src/answers/draw.ts), contrat dans [`schema/answers.schema.json`](../schema/answers.schema.json).

| `kind` | Pour | Données du bloc `visual` |
| --- | --- | --- |
| `runway` | avant le salaire | `today`, `payday`, `available`, `due`, `gap`, `bills[]`, `short_days` |
| `valley` | point bas | `series[[date, balance]]`, `low`, `days_below_zero`, `incomes[]` |
| `shift` | avant / après | `before[]`, `after[]`, `move{label, amount, from, to}`, `low_before`, `low_after` |
| `days` | coussin de sécurité | `covered`, `target`, `balance` |
| `balance` | cycle de paie | `in`, `out`, `gap`, `start`, `end` |
| `countdown` | assurance maladie | `deadline`, `days_left`, `window_days`, `current`, `next`, `increase_per_year` |
| `horizon` | fin de période | la courbe, la ligne d’arrivée, ce qu’elle vaut en jours de charges fixes |
| `calendar` | factures annuelles | les 90 prochains jours et les factures qui y tombent |
| `leak` | frais évitables | ce que les frais coûtent par an et sur 10 ans |
| `jar` | impôts | douze mois à remplir face au bordereau |
| `gauge` | 3e pilier | versé, encore possible, jours jusqu’au 31.12 |
| `deadline` | résiliation | aujourd’hui, le jour où la lettre doit arriver, le renouvellement |

Un exemple de réponse avec son dessin :

```json
{
  "id": "safety-cushion",
  "question": "Combien de temps tiendrais-je sans revenu ?",
  "answer": "Ton disponible couvre 0.4 mois de charges fixes (5’700.00 CHF par mois). Pour atteindre 3 mois, il manque 14’900.00 CHF, soit 1’241.67 CHF par mois pendant un an.",
  "tone": "risk",
  "source": "expert",
  "figures": {
    "months": "0.4",
    "fixed_monthly": "5700",
    "target_months": 3,
    "gap": "14900.00"
  },
  "visual": {
    "kind": "days",
    "covered": 11,
    "target": 90,
    "balance": "2200.00",
    "caption": "Sans salaire, ton argent paie tes charges fixes 11 jour(s) sur les 90 conseillés."
  }
}
```

## Ajouter un dessin

1. **Choisir une question sans dessin** (🎨 ci-dessus) et ouvrir une [issue](https://github.com/bazousdotcom/ui/issues/new) avec ton angle : ce que la personne comprendra d’un coup d’œil qu’elle ne voyait pas avant.
   - `available-now` : le disponible, et ce qu’il représente face à la prochaine échéance.
   - `next-actions` : les décisions du jour, triées par urgence, en une image.
   - `monthly-structure` : où part chaque franc du revenu, charges fixes et marge.
   - `income-loss` : la courbe avec et sans ce revenu, le jour où tout bascule.
2. **Partir des chiffres du contrat.** S’il te manque un chiffre, demande-le dans l’issue : c’est le moteur qui l’ajoutera, jamais le dessin qui le calculera.
3. **Dessiner en SVG, sans réseau**, dans `src/answers/draw.ts` et `src/answers/contract.ts` : couleurs par jetons `--bz-*`, clair et sombre, lisible de 320 à 390 px, aucun texte sur un autre.
4. **Passer par la galerie** (`npm run dev`, vues « Réponses » et « Matrice »), avec les ménages fictifs de `fixtures/answers-*.json`, dans les cinq langues et les deux thèmes. `npm run check` doit passer.

## Installer

```bash
npm install @bazous/ui
```
