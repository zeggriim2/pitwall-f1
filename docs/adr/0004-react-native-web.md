# 0004 · React Native + React Native Web

**Statut** : Acceptée

## Contexte
Un outil d’analyse de course se consulte au bord de la piste comme au bureau. Maintenir une app web et deux apps natives séparées est hors de portée d’une petite équipe.

## Décision
Expo Router (routing par fichiers) en React Native, compilé pour le web avec React Native Web. Graphiques en `react-native-svg` (un seul composant pour toutes les plateformes). Données avec TanStack Query.

## Conséquences
- ✅ Une base de code, trois plateformes ; l’export web est un SPA statique servi par nginx.
- ✅ Les graphiques sont maison : légers, thémables, interactifs au doigt comme à la souris.
- ⚠️ Quelques spécificités web à connaître (styles aplatis sous `<Link asChild>`, survol non typé) — encapsulées dans `HoverPressable`.
