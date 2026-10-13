# Méthodologie d’analyse

Toutes les formules vivent dans `apps/api/src/performance/domain/` : ce sont des fonctions pures, testées, sans dépendance à la base ou au réseau.

## 1. Tours représentatifs

Le temps au tour brut mélange le pilote, la voiture et les circonstances. On ne garde que les tours qui décrivent le **rythme réel** :

| Exclu | Raison |
| --- | --- |
| Tour sans chrono | Données manquantes |
| Tour 1 | Départ arrêté, peloton groupé |
| Tour d’entrée / de sortie des stands | Temps perdu dans la voie des stands |
| Tour > 107 % de la médiane du pilote | Safety car, VSC, drapeau jaune, trafic, incident |

La règle des **107 %** s’applique sur la médiane des tours restants (robuste aux valeurs aberrantes, contrairement à la moyenne).

## 2. Métriques de rythme

| Métrique | Définition |
| --- | --- |
| **Rythme médian** | Médiane des tours représentatifs. C’est la métrique de classement « rythme de course ». |
| **Régularité σ** | Écart-type (échantillon, n−1) des tours représentatifs. Plus bas = plus constant. |
| **Tour théorique** | Somme des trois meilleurs secteurs du pilote. |
| **Écart au meilleur** | Rythme médian − meilleur rythme médian du plateau. |

Un pilote n’est classé au rythme qu’à partir de **5 tours représentatifs** (10 pour « le plus régulier »), pour qu’un abandon précoce ne remporte pas le titre.

## 3. Dégradation des pneus

Pour chaque relais, on ajuste par **moindres carrés** le temps au tour en fonction de l’âge du pneu :

```
temps(âge) = a + b × âge
```

La pente *b* (en s/tour) est la dégradation brute. Elle est **sous-estimée** : en brûlant ~1,5 kg d’essence par tour, la voiture s’allège et gagne du temps. On ajoute donc l’effet carburant avant la régression :

```
temps_corrigé = temps + k × (n° de tour − 1)      avec k = 0,035 s/tour
```

La pente corrigée isole l’usure du pneu. *k* est configurable (`FUEL_EFFECT_SECONDS_PER_LAP`). Il faut au moins 4 tours représentatifs dans le relais pour publier une pente.

## 4. Duel et écart cumulé

- **Delta par tour** : `tA − tB`, négatif quand A est plus rapide.
- **Tours gagnés** : comptés seulement quand le tour est représentatif *pour les deux* pilotes (un arrêt au stand n’est pas une défaite).
- **Écart cumulé** : différence des instants de passage sur la ligne (`date_start + lap_duration`). Utiliser l’horodatage plutôt que la somme des chronos rend l’écart juste même si un chrono manque.

## 5. Positions gagnées

`grille − arrivée`, où la grille est la première position publiée par OpenF1 avant le départ. Les pilotes non classés (DNF, DNS, DSQ) n’entrent pas dans « la plus belle remontée ».

## Limites connues

- Les neutralisations très longues (SC de 8 tours) peuvent laisser passer quelques tours juste sous 107 %.
- L’effet carburant est une constante : il varie en réalité selon le circuit.
- Les données OpenF1 sont non officielles et parfois incomplètes ; elles sont validées mais pas corrigées.
