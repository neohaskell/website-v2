---
title: Mesurer les performances de l'application
description: Étudiez la latence, la relecture, la contention et les budgets de base de données avec des charges représentatives.
sidebar:
  order: 7
---
<!-- translation-source-sha256: 428c5d9ce9bb07f4c23abfa7a27b03d7060923cc91a6997f3bc51ccecbe8e9be -->

Une application qui semble rapide avec un petit jeu de données peut se comporter autrement lorsque l'historique et l'activité concurrente grandissent. Le travail de performance commence par le choix de l'expérience qui doit rester acceptable : soumettre une modification, lire son résultat ou redémarrer après un déploiement. Une vente chargée dans le projet d'exercice de commerce en ligne fournit une charge concrète à examiner.

L'architecture de NeoHaskell donne à ces opérations des travaux différents. Mesurez-les séparément avant de modifier les tailles de pool ou d'ajouter du parallélisme.

## Choisir un budget observable

Écrivez ensemble un objectif et une charge. Pour l'exemple de commerce en ligne, « la disponibilité du stock apparaît dans le délai convenu pendant que plusieurs clients réservent les dernières tasses » est testable. « Le framework est rapide » ne l'est pas.

Mesurez au moins :

- Le temps de réponse des commandes, refus compris.
- Le temps jusqu'à ce que la requête concernée reflète un événement accepté.
- Le temps de démarrage jusqu'à `/health`, puis séparément jusqu'à `/ready`.
- La durée du fournisseur externe et l'âge du travail en attente.
- Les connexions de base de données, l'utilisation des ressources et le taux d'échec pendant le test.

Conservez avec le résultat la révision de l'application, la taille du jeu de données, la taille de la machine et la charge. Une mesure limitée au panier ne prédit pas la latence d'une intégration de paiement ultérieure.

## Comprendre la contention sur une entité

Des commandes concurrentes peuvent se disputer la modification d'une même entité. Dans l'exemple de commerce en ligne, deux clients peuvent tenter de réserver la dernière tasse de la même entité Stock. La concurrence optimiste détecte les écritures en conflit et l'exécuteur de commandes peut relire l'état puis retenter sa décision.

L'exécuteur actuel autorise au maximum 10 nouvelles tentatives de conflit, avec un backoff exponentiel, du jitter et un délai plafonné. Il s'agit d'un mécanisme de conflit borné, pas d'une garantie que toutes les demandes réussiront sous une contention illimitée. Gardez les décisions métier déterministes et gardez les effets externes hors d'une décision susceptible d'être rejouée.

Demandez-vous si une entité contient une activité sans lien qui n'a pas besoin d'y être. Séparer les activités indépendantes — par exemple le stock de produits différents — peut réduire la contention, mais diviser un invariant métier indivisible peut rendre la correction plus difficile. Préservez la règle que vous cherchez à faire respecter.

## Budgéter les connexions de base de données dans le déploiement

Les magasins d'événements Postgres, les magasins de requêtes, les magasins d'état des fichiers et les listeners contribuent à la demande de connexions. Les tailles de pool par défaut sont 6 pour `PostgresEventStore` et 4 pour `PostgresQueryObjectStoreConfig` ; ces nombres ne constituent pas une recommandation universelle de capacité.

Inventoriez les pools réellement créés par votre câblage, leurs limites, les connexions de listener et le nombre de processus. Incluez les anciens et nouveaux processus actifs pendant le déploiement, ainsi qu'une marge pour les opérateurs et la maintenance. Les abonnements par flux peuvent ajouter une demande supérieure à un simple total de pools fixes.

Augmenter un pool peut déplacer le goulot d'étranglement vers Postgres. Mesurez la mise en file, la durée des requêtes et les échecs avant et après la modification.

## Tester la relecture à mesure que l'historique grandit

Utilisez une base Postgres jetable configurée via [la persistance](/fr/operate/persistence/). Créez des paniers et des ajouts acceptés représentatifs avec les routes HTTP de votre application, notez les résultats attendus du panier et du stock, puis arrêtez l'application. Depuis le même répertoire `mug-shop` et sur la même base, redémarrez-la :

```sh
LOG_LEVEL=info neo --ci run
```

Dans un autre terminal, vérifiez séparément les deux signaux :

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

Notez le moment où chacun réussit et comparez les résultats des requêtes avec vos valeurs attendues. Répétez avec un historique connu plus volumineux. Utilisez des substituts contrôlés pour tout effet externe afin qu'une expérience de relecture ne puisse pas envoyer de vraies notifications ni répéter des actions de fournisseur. Le magasin initial en mémoire ne permet pas de mesurer la récupération de l'historique après redémarrage.

Conservez des scénarios de demande réutilisables sous `tests/` et exécutez `neo test` pour les vérifications de correction. Mesurez séparément les temps de demande et de disponibilité de l'application et le temps de compilation de la CLI. Des résultats rapides mais faux constituent un test en échec.

## Exercice : les deux dernières tasses

Dans le projet d'exercice de commerce en ligne, exécutez des tentatives de réservation simultanées pour les deux dernières tasses selon la politique implémentée. Décidez le nombre de réussites attendu avant d'exécuter le test.

<details>
<summary>Éléments à comparer</summary>

Vérifiez le nombre de réservations acceptées, les refus explicites, le stock final et les états de stock visibles. Comparez ensuite les temps de réponse avec une charge répartie sur de nombreux produits. La différence aide à isoler la contention de la capacité générale du serveur.

</details>

Utilisez [l'observabilité](/fr/operate/observability/) pour transformer un goulot d'étranglement mesuré en preuve sur laquelle votre agent peut agir.
