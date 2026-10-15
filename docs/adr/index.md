# Architecture Decision Records

Une décision d’architecture = un fichier court : **contexte, décision, conséquences**. Ils évitent de re-débattre des choix et expliquent le *pourquoi* aux nouveaux arrivants (humains ou agents).

| # | Décision | Statut |
| --- | --- | --- |
| [0001](./0001-typescript-monorepo) | Monorepo TypeScript pnpm avec contrats partagés | Acceptée |
| [0002](./0002-kysely) | Kysely (query builder) plutôt qu’un ORM | Acceptée |
| [0003](./0003-graphile-worker) | File de jobs dans PostgreSQL (Graphile Worker) | Acceptée |
| [0004](./0004-react-native-web) | React Native + React Native Web pour le front | Acceptée |
| [0005](./0005-compute-on-read) | Analyse calculée à la lecture + cache | Acceptée |
| [0006](./0006-cles-primaires-uuid) | Clés primaires UUID v7 et identité pilote | Acceptée |
