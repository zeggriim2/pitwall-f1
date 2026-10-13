# Vue d’ensemble

Pitwall est un **monolithe modulaire** TypeScript : une seule image API qui expose quatre points d’entrée (serveur HTTP, worker, migrations, CLI), une app React Native compilée pour le web, et un package de contrats partagé.

```mermaid
flowchart LR
  user([Utilisateur]) -->|HTTPS| web["App web<br/>Expo · React Native Web<br/>nginx :8080"]
  mobile([iOS / Android]) -->|même code| api
  web -->|/api proxy| api["API Fastify<br/>:3000"]
  api -->|Kysely| pg[(PostgreSQL)]
  api -->|cache-aside| redis[(Redis)]
  api -->|addJob| pg
  worker["Worker<br/>Graphile Worker"] -->|LISTEN / SKIP LOCKED| pg
  worker -->|throttle + retry| openf1{{OpenF1 API}}
  worker -->|invalidate| redis
  contracts["@pitwall/contracts<br/>schémas Zod"] -.types + validation.- api
  contracts -.types + validation.- web
```

## Les briques

| Brique | Techno | Rôle |
| --- | --- | --- |
| `apps/api` | Node 24, Fastify 5, Kysely, Zod, ts-pattern | HTTP, jobs, migrations |
| `apps/web` | Expo Router, React Native Web, TanStack Query, react-native-svg | Interface web + mobile |
| `packages/contracts` | Zod 4 | Source unique de vérité des payloads |
| PostgreSQL 17 | — | Données **et** file de jobs (Graphile Worker) |
| Redis 7 | ioredis | Cache des analyses |
| `docs` | VitePress + Mermaid | Cette documentation |

## Cycle de vie d’une requête

```mermaid
sequenceDiagram
  participant App
  participant API as API (Fastify)
  participant Cache as Redis
  participant Svc as PerformanceService
  participant DB as PostgreSQL
  App->>API: GET /api/races/9472
  API->>API: validation params (Zod)
  API->>Svc: getRaceOverview(9472)
  Svc->>Cache: GET perf:v1:9472:overview
  alt hit
    Cache-->>Svc: JSON
  else miss
    Svc->>DB: 5 requêtes indexées (laps, stints, pits, results, drivers)
    Svc->>Svc: analyseRace() — fonctions pures
    Svc->>Cache: SET … EX 3600
  end
  Svc-->>API: RaceOverview
  API->>API: sérialisation validée (Zod)
  API-->>App: 200 JSON
  App->>App: RaceOverview.parse(body)
```

## Choix structurants

Chaque décision non triviale est tracée dans un [ADR](/adr/). En résumé :

- **Monolithe modulaire** plutôt que micro-services : une équipe, un déploiement, des frontières dans le code.
- **PostgreSQL fait aussi la queue** : un job est écrit dans la même transaction que les données, sans *dual write*.
- **L’analyse est calculée à la lecture** puis mise en cache : on peut faire évoluer un algorithme sans ré-ingérer.
- **Le domaine ne connaît ni SQL ni HTTP** : il reçoit des types métier, il est testable en millisecondes.
