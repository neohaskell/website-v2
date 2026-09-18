---
title: Exploiter et faire évoluer une application
description: Passez d'une démonstration fonctionnelle à une application que vous pouvez exploiter avec confiance.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 5401f1a6a368f698485734072b0d639da084c866fe8e4d4cbd59b06e3319afc2 -->

Une application doit préserver le travail accepté après les redémarrages et servir le comportement attendu après une release. L'exploiter signifie transformer ces attentes en vérifications que vous pouvez répéter. Les bonnes vérifications dépendent de son objectif, qu'elle gère des réservations, des documents, des commandes ou un autre type de travail.

NeoHaskell fournit le stockage d'événements, les modèles de lecture, les endpoints de santé, la journalisation et les tests. Vous choisissez toujours l'environnement d'hébergement, protégez les données et décidez à quoi ressemble un service acceptable. Un build réussi produit un type de confiance différent de celui d'une répétition de restauration réussie.

## Faire cinq promesses

Pour un service utilisant l'event sourcing, commencez par ces promesses et adaptez-les à votre application avant de choisir l'infrastructure :

| Promesse | Preuves nécessaires |
| --- | --- |
| Les modifications acceptées survivent à un redémarrage | Un magasin d'événements durable et un test de redémarrage |
| Les utilisateurs voient des informations exactes | Des vérifications de disponibilité et des résultats de requêtes représentatifs |
| Une release sert la révision attendue | L'identité du build et un smoke test sur cette révision |
| Les échecs peuvent être diagnostiqués | Des journaux, identifiants et procédure de récupération utiles |
| Les modifications préservent l'historique métier existant | Des fixtures d'anciens événements et des tests de compatibilité |

Continuez dans le projet `mug-shop` créé avec `neo new`. Ses modules `src/Shop/Cart/` et `src/Shop/Stock/` vous donnent un comportement concret à exploiter. Les mêmes vérifications s'appliquent à d'autres domaines. À ce stade, le magasin d'événements en mémoire perd encore l'historique au redémarrage ; le prochain chapitre modifie cela délibérément.

## Suivre le parcours opérationnel

1. [Choisir ce qui survit au redémarrage](/fr/operate/persistence/) : les événements, les modèles de lecture, les fichiers importés et les identifiants fournisseur ont des besoins de stockage différents.
2. [Déployer une révision](/fr/operate/deployment/) : construire un exécutable, fournir la configuration et n'admettre le trafic que lorsque la révision est prête.
3. [Observer l'application en fonctionnement](/fr/operate/observability/) : distinguer un processus qui répond d'un travail métier terminé.
4. [Pratiquer la récupération](/fr/operate/recovery/) : restaurer dans un environnement isolé et rapprocher les effets externes.
5. [Faire évoluer sans risque](/fr/operate/evolution/) : préserver le sens des événements historiques lorsque les exigences changent.
6. Examinez la [sécurité](/fr/operate/security/) et la [performance](/fr/operate/performance/) avant d'augmenter l'exposition ou le trafic.

Ces sujets sont liés, pas une checklist de certification. Un pilote sur un seul hôte et un service public très utilisé ont des besoins de disponibilité différents ; tous deux ont besoin d'une description honnête de leurs hypothèses.

## Donner à votre agent un résultat à démontrer

Pour le projet d'exercice de commerce en ligne :

> « Montre-moi qu'un panier et les quantités de ses articles acceptés survivent au redémarrage d'un processus. Identifie où vivent leurs événements, affiche le résumé du panier reconstruit et démontre qu'une quantité refusée ne l'a pas modifié. »

Utilisez l'[IDE visuel](/fr/getting-started/visual-ide/) pour localiser l'entité concernée et ses consommateurs — dans cet exemple, le panier et son résumé. Le graphe aide à expliquer l'application ; les journaux de déploiement et les tests établissent ce que la révision en fonctionnement a réellement fait.

Une fois que vous pouvez exploiter et modifier votre propre application, la [contribution](/fr/operate/contributing/) offre un parcours distinct pour améliorer NeoHaskell.
