# Contribuer à Bazous UI

Merci ! Le moyen le plus utile de contribuer est d’ajouter **une question** : une chose qu’un ménage se demande sur son argent et à laquelle le snapshot sait déjà répondre.

## Ajouter un module en cinq étapes

1. **Choisir la question.** Elle doit se répondre avec les champs de `schema/snapshot.schema.json`. S’il manque une donnée, ouvrez d’abord une issue « Nouvelle question » : le contrat évolue côté serveur, pas dans le kit.
2. **Créer le dossier** `src/modules/<id>/index.tsx`. L’`id` est en kebab-case anglais et devient une API publique : il ne change plus.
3. **Écrire le module** avec `defineModule` :

```tsx
import { Tile } from "../../primitives";
import { defineModule } from "../types";

type Model = { amount: string; currency: string };

export default defineModule<Model>({
  id: "debt-total",
  size: "tile",
  question: {
    fr: "Combien dois-je en tout ?",
    de: "Wie viel schulde ich insgesamt?",
    it: "Quanto devo in totale?",
    rm: "Quant stoss jau en tut?",
    en: "How much do I owe in total?",
  },
  reads: ["debts", "base_currency"],
  messages: {
    fr: { label: "Dettes court terme" },
    de: { label: "Kurzfristige Schulden" },
    it: { label: "Debiti a breve termine" },
    rm: { label: "Debits a curta vista" },
    en: { label: "Short-term debt" },
  },
  select: (s) => (s.debts.items.length ? { amount: s.debts.total_base, currency: s.base_currency } : null),
  View: ({ model, t, fmt }) => <Tile question={t("question")} label={t("label")} value={fmt.num(model.amount)} unit={model.currency} />,
});
```

4. **L’enregistrer** dans `src/modules/registry.ts` (une ligne, à la place où il doit apparaître dans le cockpit).
5. **Vérifier** : `npm run check`, puis `npm run dev` et regardez votre module dans les cinq langues, les deux thèmes et les trois ménages (`demo`, `tight`, `empty`).

## Ce que la CI refuse

- une clé de traduction absente d’une langue, ou un rendu contenant `⟦clé⟧`, `NaN` ou `undefined` ;
- un `select` qui modifie le snapshot ou ne rend pas deux fois le même résultat ;
- `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `document.cookie`, `eval` ou une URL dans `src/` ;
- un champ lu (`reads`) qui n’existe pas dans le contrat ;
- une classe du canevas Capture sans style, ou `schema/canvas.json` désynchronisé.

## Style

- Utilisez les primitives (`Card`, `Tile`, `Row`, `Button`, `CashflowChart`) et les classes `bz-*` ; pas de couleurs en dur, pas d’attribut `style` sauf pour une largeur proportionnelle.
- Chiffres via `fmt.num` / `fmt.signed` / `fmt.money`, dates via `fmt.shortDate` / `fmt.longDate`.
- La question du module s’affiche en surtitre ; le titre dit ce qu’on voit, la valeur répond.
- Un module qui ne peut pas répondre renvoie `null` : l’hôte affiche « pas encore assez de données ».

## Certificat d’origine (DCO)

Chaque commit porte une ligne `Signed-off-by` (`git commit -s`), par laquelle vous certifiez avoir le droit de publier ce code sous licence MIT ([developercertificate.org](https://developercertificate.org)).

## Traductions

Les corrections de traduction sont des contributions à part entière. Pour le romanche, indiquez l’idiome si vous n’écrivez pas en Rumantsch Grischun.
