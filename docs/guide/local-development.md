# Développement local

Docker sert la démo ; pour développer, on fait tourner l’infra en conteneurs et le code sur la machine (hot-reload, debugger).

```bash
task setup        # pnpm install + .env
task dev:infra    # Postgres + Redis
task dev:api      # migrations puis API sur :3000 (tsx watch)
task dev:worker   # dans un 2e terminal
task dev:web      # dans un 3e terminal — Expo sur :8081
```

## Variables d’environnement

Toute la configuration est validée **au démarrage** par un schéma Zod (`apps/api/src/platform/config.ts`) : une variable invalide arrête le process avec un message lisible, au lieu d’un `undefined` découvert en production.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://pitwall:pitwall@localhost:5432/pitwall` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Cache |
| `CACHE_TTL_SECONDS` | `3600` | Durée de vie des analyses en cache |
| `OPENF1_MIN_INTERVAL_MS` | `2100` | Délai minimum entre deux appels OpenF1 |
| `WORKER_CONCURRENCY` | `2` | Jobs traités en parallèle |
| `FUEL_EFFECT_SECONDS_PER_LAP` | `0.035` | Correction carburant (voir [méthodologie](/domain/methodology)) |
| `EXPO_PUBLIC_API_URL` | — | URL de l’API pour l’app hors Docker |

## Sur un téléphone

`task dev:web` puis scanner le QR code avec Expo Go. Mettre `EXPO_PUBLIC_API_URL` sur l’IP de la machine (`http://192.168.x.x:3000`) : `localhost` désigne le téléphone.
