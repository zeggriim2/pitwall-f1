# Commandes Task

Toutes les opérations passent par [Task](https://taskfile.dev) : une seule interface, documentée, identique en local et en CI. `task` sans argument liste tout.

## Stack Docker

| Commande | Effet |
| --- | --- |
| `task start` | `up` + import de la saison `YEARS` (2024 par défaut) |
| `task up` | Build et démarre toute la stack, attend les healthchecks |
| `task down` / `task reset` | Arrête / arrête et efface les volumes |
| `task ps` | État des services |
| `task logs -- worker` | Suit les logs d’un service |

## Données

| Commande | Effet |
| --- | --- |
| `task sync YEARS="2023 2024"` | Met en file l’import des saisons |
| `task sync:force` | Ré-importe tout, même les courses prêtes |
| `task migrate` | Applique les migrations Kysely |
| `task db:psql` | Shell `psql` |

## Développement & qualité

| Commande | Effet |
| --- | --- |
| `task dev:infra` | Postgres + Redis seulement |
| `task dev:api` / `task dev:worker` | API / worker en hot-reload (tsx) |
| `task dev:web` | App Expo — web sur :8081, `i`/`a` pour iOS/Android |
| `task dev:docs` | Documentation en hot-reload |
| `task lint` / `task format` | Biome (lint + format) |
| `task typecheck` | `tsc` sur chaque package |
| `task test` | Tests unitaires Vitest |
| `task ci` | lint + typecheck + tests, comme la CI |
| `task load-test` | Scénario k6 contre l’API qui tourne |
