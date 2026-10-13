# 0003 · File de jobs dans PostgreSQL (Graphile Worker)

**Statut** : Acceptée

## Contexte
L’import OpenF1 est lent (rate-limit) et doit être fiable. Une file externe (SQS, RabbitMQ, BullMQ/Redis) ajoute une infra et un problème de *dual write* : la donnée est en base, le job ailleurs.

## Décision
Graphile Worker : jobs stockés dans PostgreSQL, distribués avec `SKIP LOCKED` et réveillés par `LISTEN/NOTIFY`.

## Conséquences
- ✅ Garanties ACID : un job peut être ajouté dans la même transaction que la donnée qui le déclenche.
- ✅ Déduplication native (`jobKey`), retries et backoff, zéro infra supplémentaire.
- ✅ Les jobs sont inspectables en SQL (`graphile_worker.jobs`).
- ⚠️ Débit plafonné par PostgreSQL — très au-delà des besoins ici ; Redis reste dédié au cache.
