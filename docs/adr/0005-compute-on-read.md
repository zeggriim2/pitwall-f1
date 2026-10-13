# 0005 · Analyse calculée à la lecture, puis mise en cache

**Statut** : Acceptée

## Contexte
Deux options : pré-calculer les analyses à l’ingestion et les stocker, ou stocker les données brutes et calculer à la demande.

## Décision
On stocke les données **brutes normalisées** ; l’analyse est calculée à la lecture (≈ 1 000 tours, quelques ms) puis mise en cache dans Redis (`perf:v1:{sessionKey}:*`), invalidée à chaque ré-ingestion.

## Conséquences
- ✅ Améliorer un algorithme ne demande aucune migration ni ré-import : on incrémente le préfixe de cache (`v1` → `v2`).
- ✅ Le domaine reste pur et testable, sans état.
- ⚠️ Le premier appel après invalidation paie le calcul — mesuré et borné par le test k6.
- ⚠️ Si Redis tombe, l’API continue (le cache est best-effort) mais recalcule à chaque requête.
