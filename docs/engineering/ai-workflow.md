# Workflow avec l’IA

Ce projet a été construit avec **Claude Code** comme pair de programmation. L’IA y est un accélérateur, pas un pilote automatique : ce qui compte, c’est le cadre qui rend sa production vérifiable.

## Ce qui rend l’IA efficace ici

| Pratique | Effet |
| --- | --- |
| `CLAUDE.md` à la racine | Conventions, commandes et règles d’architecture lues par l’agent à chaque session |
| Commandes `task` uniques | L’agent lance `task ci` comme un humain — pas de commandes inventées |
| Types stricts + contrats Zod | Une hallucination d’API devient une erreur de compilation immédiate |
| Domaine pur et testé | L’agent peut itérer sur une formule avec un feedback en 100 ms |
| ADR | Les décisions passées ne sont pas re-débattues à chaque prompt |

## Comment je l’utiliserais en équipe

- **Revue** : l’IA fait une première passe (bugs, sécurité, cohérence avec les ADR) ; l’humain juge le design et le produit.
- **Tests** : demander d’abord les cas limites, puis l’implémentation — on garde la main sur la spécification.
- **Onboarding** : la doc et le `CLAUDE.md` servent autant aux nouveaux arrivants qu’aux agents.
- **Garde-fous** : CI obligatoire, pas de merge sans revue humaine, secrets hors du contexte de l’agent.
