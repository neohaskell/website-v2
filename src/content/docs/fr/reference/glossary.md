---
title: "Les mots que vous rencontrerez"
description: "Les concepts NeoHaskell en langage clair, avec des liens vers des exemples pratiques."
sidebar:
  order: 2
---
<!-- translation-source-sha256: ef2f1ca1d5d5325ef36283f7ec245a635a7d7bb7867216d08e4c4430d9a409bc -->

Utilisez cette page lorsqu'un terme s'interpose entre vous et le comportement applicatif que vous cherchez à comprendre. Les définitions s'appliquent à tous les domaines. Les exemples du projet d'exercice de commerce en ligne récurrent les rendent concrets ; les liens mènent à des explications plus approfondies.

| Terme | Signification et exemple | En savoir plus |
| --- | --- | --- |
| Commande | Une demande telle qu'ajouter deux tasses à un panier ; elle peut être refusée | [Commandes et événements](/fr/build/commands-and-events/) |
| Événement | Un fait accepté tel qu'un article ayant été ajouté | [Commandes et événements](/fr/build/commands-and-events/) |
| Entité | Un objet métier dont l'état éclaire les décisions, comme un panier particulier | [Entités et état](/fr/build/entities-and-state/) |
| Flux d'événements | L'historique ordonné appartenant à une entité | [Persistance](/fr/operate/persistence/) |
| Event sourcing | Conserver les faits acceptés et en reconstruire l'état | [Event Modeling](/fr/start/event-modeling/) |
| Event Modeling | Décrire comment se relient les demandes, faits, vues et actions externes | [Event Modeling](/fr/start/event-modeling/) |
| Decider | La logique qui accepte ou refuse une demande à partir de l'état actuel | [Commandes et événements](/fr/build/commands-and-events/) |
| Requête / modèle de lecture / projection | Informations préparées pour la lecture, comme un résumé de panier | [Requêtes](/fr/build/queries/) |
| CQRS | Séparer les demandes qui modifient le système des lectures d'informations préparées | [Requêtes](/fr/build/queries/) |
| Cohérence éventuelle | Une vue de lecture peut prendre brièvement du retard sur une modification acceptée | [Requêtes](/fr/build/queries/) |
| Relecture | Réappliquer des événements stockés pour reconstruire l'état ou les vues | [Récupération](/fr/operate/recovery/) |
| Snapshot | Un état mis en cache qui réduit la quantité d'historique à relire | [Performance](/fr/operate/performance/) |
| Intégration | Une connexion explicite à une autre partie de l'application ou à un service externe | [Intégrations](/fr/connect/) |
| Sortant | Travail déclenché par les événements acceptés de l'application, comme la préparation d'un e-mail | [Cycle de vie des intégrations](/fr/connect/) |
| Entrant | Un déclencheur qui soumet du travail à l'application, comme un timer | [Timers](/fr/connect/timers/) |
| Idempotence | Répéter une demande produit le même effet métier attendu que l'exécuter une fois | [HTTP et paiements](/fr/connect/http-and-payments/) |
| Identifiant de corrélation | Une valeur qui relie une demande aux réponses ultérieures du fournisseur ou aux faits métier | [Workflows](/fr/connect/workflows/) |
| Concurrence optimiste | Détecter que l'état a changé pendant une décision et gérer le conflit | [Stock et passage en caisse](/fr/build/stock-and-checkout/) |
| Authentification | Établir qui a effectué une demande | [Contrôle d'accès](/fr/build/access-control/) |
| Autorisation | Décider ce que cette personne peut faire ou voir | [Contrôle d'accès](/fr/build/access-control/) |
| Schéma | Description de la forme attendue des données | [HTTP et frontend](/fr/build/http-and-frontend/) |
| Transport | La manière dont les demandes et réponses franchissent la limite de l'application, par exemple HTTP | [HTTP et frontend](/fr/build/http-and-frontend/) |
| Vivacité | Indique si le processus HTTP en fonctionnement répond | [Déploiement](/fr/operate/deployment/) |
| Disponibilité | Indique si les projections de requêtes enregistrées ont rattrapé leur retard afin que cette révision puisse servir du trafic | [Déploiement](/fr/operate/deployment/) |
| Invariant métier | Règle qui doit rester vraie, comme refuser une quantité négative | [Tests](/fr/build/testing/) |

## Trois distinctions à garder

**Une demande n'est pas un fait.** Dans l'exemple de commerce en ligne, « Débiter le client » est une demande. Un paiement confirmé est la preuve de quelque chose qui s'est produit. Un timeout laisse une incertitude ; il n'établit pas qu'aucun débit n'a eu lieu.

**L'état n'est pas une vue pour chaque lecteur.** L'état d'une entité sert aux décisions. Des lecteurs différents peuvent avoir besoin de vues et de règles d'accès différentes. Dans l'exemple de commerce en ligne, le résumé d'un client et le rapport d'un commerçant répondent à des objectifs différents.

**Une vérification réussie a un périmètre.** La compilation, la validation du modèle, les tests et les vérifications sandbox du fournisseur répondent à des questions différentes. Le [chapitre sur la confiance](/fr/start/trusting-your-agent/) explique comment les combiner lorsque vous acceptez le travail de votre agent.
