# CLAUDE.md — conventions pour les agents IA (et les humains)

## Commandes (toujours passer par Task)
- `task ci` — lint + typecheck + tests. À lancer avant de considérer un travail terminé.
- `task test` — Vitest (domaine API, mapping d'ingestion, client OpenF1).
- `task up` / `task logs -- <service>` / `task sync YEARS=2024` — stack Docker.
- `task dev:infra` puis `task dev:api` / `task dev:web` pour le hot reload sur la machine hôte.

## Règles d'architecture
- Screaming Architecture : le code est groupé par domaine métier (`races/`, `performance/`, `ingestion/`). `platform/` est le seul module horizontal.
- `apps/api/src/performance/domain/**` doit rester pur : aucun import de `platform/`, aucune I/O, aucun `Date.now()`. Ajouter un test pour chaque changement de comportement.
- Tout payload qui traverse une frontière est un schéma Zod dans `packages/contracts`. Modifier le contrat d'abord, puis se laisser guider par le compilateur pour l'API et l'app.
- Le SQL passe par Kysely dans `*.repository.ts` (lectures) ou `ingestion/` (écritures). Toute nouvelle table nécessite une migration dans `platform/db/migrations` enregistrée dans `migrator.ts`, ainsi que la mise à jour de l'interface `Database`.
- Branchements exhaustifs avec `ts-pattern` (`match(...).exhaustive()` dès que possible).
- Traitement en arrière-plan = job Graphile Worker avec un `jobKey` ; les jobs doivent être idempotents.
- Incrémenter le préfixe de cache (`perf:v1` → `perf:v2`) dans `performance.service.ts` quand la sortie d'une analyse change.

## Style
- TypeScript strict, `noUncheckedIndexedAccess` ; pas de `any`, pas d'assertions non-null (Biome l'impose).
- Formatage Biome : quotes simples, pas de point-virgule, 110 colonnes. Lancer `task format`.
- Les textes d'interface sont en français ; le code, les identifiants et les commentaires sont en anglais.
- React Native : sous `<Link asChild>`, passer des styles aplatis — utiliser `HoverPressable` pour les états de survol.

## Git
- **Ne jamais commiter sans demander.** Présenter les changements et le découpage proposé, attendre l'accord explicite.
- Même chose pour tout ce qui sort du poste : push, pull request, tag.

## Décisions
Lire `docs/adr/` avant de proposer un changement structurel ; ajouter un ADR pour toute nouvelle décision.
