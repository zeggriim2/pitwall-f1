# Ingestion & jobs

## Pourquoi en tâche de fond

Une course représente ~1 000 tours et 6 appels OpenF1, et l’API publique limite les clients anonymes. Faire ça dans une requête HTTP serait lent et fragile : on délègue à un **worker**.

```mermaid
sequenceDiagram
  participant U as App / CLI
  participant API
  participant Q as PostgreSQL (graphile_worker)
  participant W as Worker
  participant O as OpenF1
  U->>API: POST /api/seasons/2024/sync
  API->>Q: addJob sync_season {year} (jobKey: sync_season:2024)
  API-->>U: 202 Accepted
  W->>Q: récupère le job (SKIP LOCKED)
  W->>O: meetings + sessions 2024
  W->>Q: upsert calendrier (transaction)
  loop pour chaque course terminée et non prête
    W->>Q: addJob ingest_race {raceId}
  end
  W->>Q: récupère ingest_race
  W->>O: drivers, laps, stints, pit, position, session_result
  W->>W: mapRace() — pur, testé
  W->>Q: DELETE + INSERT + status=ready (1 transaction)
  W->>W: invalide perf:v2:{raceId}:*
```

## Garanties

| Propriété | Comment |
| --- | --- |
| **Idempotence** | Une ingestion remplace toutes les lignes de la course dans une transaction. La rejouer donne le même état. |
| **Déduplication** | `jobKey` unique par saison / course : cliquer 10 fois n’empile pas 10 jobs. |
| **Retry** | 3 tentatives avec backoff exponentiel (Graphile), statut `failed` + `last_error` visibles. |
| **Rate-limit** | Le client OpenF1 sérialise les appels (délai minimum configurable) et respecte `Retry-After` sur un 429. |
| **Robustesse du schéma** | Chaque payload est validé par Zod : un changement d’OpenF1 casse le job, jamais la base. |
| **Cohérence du cache** | Le cache de la course est purgé après le commit. |

## Positions par tour

OpenF1 publie les positions comme une **timeline de changements**, pas par tour. `resolveLapPositions()` projette cette timeline : la position à la fin du tour *n* est le dernier échantillon antérieur au passage sur la ligne (`date_start + lap_duration`), trouvé par recherche dichotomique. La position sur la grille est le premier échantillon (pré-course).
