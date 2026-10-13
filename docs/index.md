---
layout: home

hero:
  name: Pitwall
  text: Lire une course de F1 comme un ingénieur
  tagline: Rythme réel, dégradation des pneus corrigée du carburant, régularité, stratégie et duels tour par tour — pour chaque pilote, sur chaque Grand Prix.
  image:
    src: /favicon.svg
    alt: Pitwall
  actions:
    - theme: brand
      text: Démarrer en 2 minutes
      link: /guide/getting-started
    - theme: alt
      text: Architecture
      link: /architecture/overview
    - theme: alt
      text: Méthodologie
      link: /domain/methodology

features:
  - icon: 🧱
    title: TypeScript de bout en bout
    details: Un seul package de contrats Zod partagé par l’API et l’app. Les réponses sont validées côté serveur ET côté client, le compilateur relie la base au pixel.
  - icon: 📣
    title: Screaming Architecture
    details: Le code est rangé par domaine métier — races, performance, ingestion — pas par couche technique. On lit l’arborescence, on comprend le produit.
  - icon: 🧮
    title: Un domaine pur et testé
    details: Toute l’analyse est faite de fonctions pures, sans I/O, couvertes par des tests unitaires. Le SQL et le HTTP restent aux frontières.
  - icon: ⚙️
    title: Jobs ACID dans PostgreSQL
    details: L’import OpenF1 tourne en tâche de fond avec Graphile Worker — idempotent, dédupliqué, retry avec backoff, rate-limit respecté.
  - icon: ⚡️
    title: Cache Redis & tests de charge
    details: Cache-aside invalidé à chaque ingestion. Un scénario k6 vérifie les p95 sur le parcours utilisateur réel.
  - icon: 📱
    title: Web + mobile, une seule base
    details: L’interface est en React Native (Expo Router) et compilée pour le web avec React Native Web.
---
