# Démarrage rapide

## Prérequis

| Outil | Version | Pourquoi |
| --- | --- | --- |
| [Docker](https://docs.docker.com/get-docker/) + Compose v2 | 24+ | Toute la stack tourne en conteneurs |
| [Task](https://taskfile.dev/installation/) | 3.x | Les commandes du projet |
| Node.js *(optionnel)* | 22.12+ | Seulement pour développer hors Docker |

## Lancer la démo

```bash
task start                 # build + démarre la stack, puis importe la saison 2024
```

C’est tout. `task start` :

1. construit les images (API, worker, app web, documentation) ;
2. démarre PostgreSQL et Redis, applique les migrations, attend que tout soit *healthy* ;
3. met en file un job `sync_season` pour 2024 — le worker importe ensuite chaque course depuis [OpenF1](https://openf1.org).

| Service | URL |
| --- | --- |
| Application | <http://localhost:8080> |
| Référence API (Scalar / OpenAPI) | <http://localhost:3000/docs> |
| Cette documentation | <http://localhost:4000> |
| Healthcheck | <http://localhost:3000/health> |

::: tip Durée de l’import
OpenF1 limite les clients anonymes (~30 requêtes/min). Une course demande 6 appels :
une saison complète prend **≈ 5 minutes**. Les cartes de l’accueil s’allument au fil de l’eau.
:::

## Importer d’autres saisons

```bash
task sync YEARS="2023 2025"   # OpenF1 couvre 2023 → aujourd’hui
task sync:force YEARS=2024    # ré-importe même les courses déjà prêtes
```

On peut aussi cliquer sur **+ 2025** dans l’interface : c’est le même endpoint `POST /api/seasons/:year/sync`.

## Arrêter

```bash
task down     # garde les données
task reset    # supprime aussi le volume PostgreSQL
```
