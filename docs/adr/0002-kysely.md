# 0002 · Kysely plutôt qu’un ORM

**Statut** : Acceptée

## Contexte
Les lectures sont analytiques (agrégats, filtres `FILTER`, jointures) et l’ingestion fait des remplacements en masse. Un ORM orienté entités cache le SQL qu’on veut justement maîtriser.

## Décision
Kysely : un query builder **typé** depuis une interface `Database` écrite à la main, des migrations versionnées en TypeScript importées statiquement.

## Conséquences
- ✅ SQL explicite et prévisible, types inférés jusqu’au résultat de la requête.
- ✅ Aucune génération de code ni runtime lourd.
- ⚠️ Pas de relations « magiques » : les repositories font le mapping vers le domaine, explicitement.
