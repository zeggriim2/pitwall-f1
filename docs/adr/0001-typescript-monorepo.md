# 0001 · Monorepo TypeScript avec contrats partagés

**Statut** : Acceptée

## Contexte
L’API et l’app manipulent les mêmes structures (course, pilote, analyse). Dupliquer les types, c’est garantir qu’ils divergent.

## Décision
- Un monorepo **pnpm workspaces** : `apps/api`, `apps/web`, `packages/contracts`, `docs`.
- `@pitwall/contracts` contient des **schémas Zod** (pas seulement des types) : ils servent à la validation runtime des deux côtés et à la génération OpenAPI.
- Le package est consommé en source TypeScript (pas de build intermédiaire) ; l’API le bundle avec tsup.

## Conséquences
- ✅ Une modification de contrat casse la compilation de l’API **et** de l’app dans le même diff.
- ✅ Une seule CI, un seul lockfile, des versions alignées.
- ⚠️ `node-linker=hoisted` est requis par Metro (Expo) ; on accepte un `node_modules` plat.
