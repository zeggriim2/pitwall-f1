# Référence API

La référence interactive est générée **depuis le code** (schémas Zod → OpenAPI 3.1) et servie par [Scalar](https://scalar.com) :

- **Référence interactive :** <http://localhost:3000/docs>
- **Spécification OpenAPI JSON :** <http://localhost:3000/docs/openapi.json>

## Endpoints

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + état PostgreSQL / Redis |
| `GET` | `/api/seasons` | Saisons connues, nombre de courses analysées |
| `GET` | `/api/seasons/:year/races` | Calendrier d’une saison et statut d’import |
| `POST` | `/api/seasons/:year/sync?force=true` | Met en file l’import d’une saison → `202` |
| `GET` | `/api/races/:sessionKey` | Vue course : classement, rythme, faits marquants, positions |
| `GET` | `/api/races/:sessionKey/drivers/:driverNumber` | Analyse d’un pilote |
| `GET` | `/api/races/:sessionKey/compare?a=1&b=16` | Duel entre deux pilotes |

## Erreurs

Format unique `{ error, message }`, mappé dans `platform/http/app.ts` avec `ts-pattern` :

| Statut | `error` | Quand |
| --- | --- | --- |
| 400 | `bad_request` | Paramètre invalide (validation Zod) |
| 404 | `not_found` | Course ou pilote inconnu |
| 409 | `not_ready` | Course pas encore importée |
| 500 | `internal_error` | Bug — loggé avec la stack, jamais exposé |

## Exemple

```bash
curl -s localhost:3000/api/races/9472 | jq '.drivers[0] | {driver: .driver.acronym, pace: .pace}'
```

```json
{
  "driver": "VER",
  "pace": {
    "bestLap": 92.608,
    "bestLapNumber": 39,
    "medianPace": 95.529,
    "consistency": 1.067,
    "cleanLaps": 52,
    "theoreticalBest": 92.608,
    "topSpeed": 314
  }
}
```
