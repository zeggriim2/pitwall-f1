# Qualité & tests

## Pyramide

| Niveau | Outil | Cible |
| --- | --- | --- |
| Statique | TypeScript strict, Biome | Tout le code — `task lint`, `task typecheck` |
| Unitaire | Vitest | Domaine `performance/domain`, mapping et client OpenF1 |
| Contrat | Zod (runtime) | Chaque frontière : env, OpenF1, HTTP, jobs, client |
| Charge | k6 | Parcours utilisateur sur l’API, seuils p95 |

Les tests ciblent **la logique qui peut être fausse sans que le compilateur le voie** : formules statistiques, exclusion des tours, projection des positions, mapping OpenF1, retry sur 429. Le client OpenF1 est testé avec un `fetch` injecté : aucun appel réseau en test.

```bash
task test            # ~100 ms
task test:coverage
```

## Test de charge (k6)

`load-tests/race-analysis.js` simule un parcours réel : vue course → analyse pilote → duel, de 0 à 50 utilisateurs virtuels.

```bash
task load-test
```

Seuils (la CI de charge échoue s’ils sont dépassés) :

| Endpoint | p95 |
| --- | --- |
| Vue course | < 150 ms |
| Analyse pilote | < 150 ms |
| Duel | < 200 ms |
| Taux d’erreur | < 1 % |

## CI (GitHub Actions)

`.github/workflows/ci.yml` : lint → typecheck → tests, puis build des trois images Docker avec cache de couches. `task ci` exécute la même chose en local.

## Observabilité

- Logs JSON structurés (pino) avec contexte (`sessionKey`, `component`), prêts pour Datadog.
- `/health` vérifie PostgreSQL et Redis, utilisé par le `HEALTHCHECK` Docker et `compose --wait`.
- Statut d’ingestion par course (`pending` / `ingesting` / `ready` / `failed` + `last_error`) visible dans l’UI.
