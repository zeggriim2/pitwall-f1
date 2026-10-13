# Roadmap

Ce qui manque délibérément à la v0.1 et comment je l’ajouterais, dans la stack cible.

| Sujet | Approche |
| --- | --- |
| **Authentification** | Better Auth (sessions en base, plugin organisation) pour des favoris et des comparaisons sauvegardées. |
| **Déploiement** | Railway : un service par point d’entrée (`server`, `worker`) sur la même image, PostgreSQL Neon (branches par PR), Redis managé. |
| **Observabilité** | `dd-trace` + logs pino → Datadog ; SLO sur la latence p95 des endpoints d’analyse. |
| **Live timing** | Sessions en cours via l’API authentifiée d’OpenF1 + Server-Sent Events. |
| **Tests d’intégration** | Testcontainers PostgreSQL pour les repositories et la transaction d’ingestion. |
| **Analyses** | Undercut/overcut, effet du trafic (air sale), comparaison qualif ↔ course, corrélation météo. |
| **Mobile** | Builds EAS iOS / Android — le code est déjà partagé. |
