# 0006 · Clés primaires UUID v7 et identité pilote

**Statut** : Acceptée

## Contexte
Le schéma initial reprenait les clés d’OpenF1 comme clés primaires : `meeting_key`, `session_key`, et un couple `(session_key, driver_number)` pour les pilotes. Trois problèmes en découlaient. La base dépendait d’un fournisseur pour son intégrité : changer de source, ou en ajouter une, imposait de refaire toutes les clés. Ces identifiants fuyaient jusque dans les URLs publiques, alors qu’ils ne veulent rien dire pour un utilisateur. Et surtout, un pilote n’existait **que** dans une course : aucune ligne ne le reliait d’un Grand Prix au suivant, ce qui rendait impossible toute vue transversale — une page profil, un duel entre coéquipiers sur une saison.

## Décision
Chaque table porte un `id uuid` qui nous appartient, en **UUID v7** généré par l’application (`platform/id.ts`). La version 7 préfixe un horodatage : les clés restent ordonnées par création, donc les index B-tree ne se fragmentent pas comme avec de l’UUID v4. Postgres 17 n’a pas encore `uuidv7()` natif — générer côté application permet d’ailleurs à l’ingestion de construire un graphe complet (une course, ses engagements, leurs tours) en une passe pure, sans aller relire un défaut serveur ligne par ligne.

Les clés OpenF1 survivent comme simples colonnes uniques sur `meetings` et `races`. Elles servent à retrouver ce qu’on a déjà importé, aucune clé étrangère ne les référence, et elles ne sortent pas du module `ingestion/`.

L’identité du pilote est séparée en deux tables :

- `drivers` — l’identité stable, unique par acronyme (le seul champ qu’OpenF1 garde constant d’une course à l’autre) ;
- `driver_entries` — l’engagement sur une course : le numéro porté ce jour-là, l’équipe, sa couleur, la photo.

Les mesures (`laps`, `stints`, `pit_stops`, `results`) se rattachent à un engagement, plus à un couple `(session_key, driver_number)`. Leur clé naturelle devient une contrainte d’unicité, ce qui préserve l’idempotence d’une ré-ingestion.

## Conséquences
- ✅ Le modèle ne dépend plus d’OpenF1 pour son intégrité : une seconde source s’ajoute sans toucher aux clés.
- ✅ Un pilote existe en tant que tel, d’une course et d’une saison à l’autre : la page profil et les duels sur une saison deviennent possibles.
- ✅ Les URLs exposent nos identifiants (`/races/<uuid>`), pas ceux d’un fournisseur.
- ⚠️ L’unicité de l’identité repose sur l’acronyme. Deux pilotes partageant un acronyme sur la fenêtre couverte (2023+) seraient fusionnés — aucun cas sur la période, mais c’est le point à revoir si l’historique remonte plus loin.
- ⚠️ Dans l’URL d’une course, le pilote reste désigné par son **numéro** (`/races/<uuid>/drivers/44`). C’est une donnée métier F1, lisible et unique dans une course, pas une clé de fournisseur : le domaine pur reste inchangé. L’`id` stable est exposé dans `DriverRef` pour les liens transversaux.
- ⚠️ Le préfixe de cache passe à `perf:v2:{raceId}:`.
