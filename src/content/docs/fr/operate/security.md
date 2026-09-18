---
title: Protéger les utilisateurs, les données et les actions
description: Transformez les règles d'accès, les secrets, le transport de la base de données et les limites d'intégration en vérifications concrètes.
sidebar:
  order: 6
---
<!-- translation-source-sha256: 86870c6f535cd8add11952759265ae8bdc0fb26e8d3741d1dad52c2b666369e0 -->

Des personnes différentes ont besoin de droits différents dans une application. Décidez quelles actions chaque rôle peut effectuer, quels enregistrements il peut voir et ce qui est volontairement public. Ces choix s'appliquent aussi bien aux outils internes qu'aux services publics. Le projet d'exercice de commerce en ligne les illustre avec des paniers clients, un accès du personnel et un catalogue public.

NeoHaskell fournit des briques d'authentification et d'autorisation. Votre application définit toujours qui peut faire quoi, câble le fournisseur d'authentification et teste les limites. Le framework ne peut pas déduire vos rôles ou vos règles de propriété.

## Séparer identité et permission

L'authentification établit l'identité de la personne qui effectue une demande. L'autorisation décide si cette identité peut effectuer une action ou voir un résultat.

Les requêtes ont deux points de décision utiles :

- `canAccess` : cet appelant peut-il accéder à ce type de requête ?
- `canView` : cet appelant peut-il voir ce résultat précis ?

Les helpers de `Service.AccessControl` incluent `authenticatedAccess`, `requirePermission`, `ownerOnly`, `tenantOnly`, `publicAccess` et `publicView`. L'accès public est un choix explicite ; le réserver aux informations de catalogue est un exemple de politique métier, pas une règle universelle du framework.

Dans l'exemple de commerce en ligne, ce sont des **expressions de politique pour une requête de panier**, pas un module complet exécutable :

```haskell
AccessControl.authenticatedAccess
AccessControl.ownerOnly (\cart -> cart.ownerId)
```

La seconde expression suppose que la requête d'exemple possède un champ de propriété `Text` nommé `ownerId`, dont la valeur correspond au sujet authentifié. Ajouter simplement un champ appelé « owner » n'impose pas la propriété. Reliez les expressions à `src/Shop/Cart/Queries/CartSummary.hs` comme indiqué dans le [contrôle d'accès](/fr/build/access-control/) et testez-les.

Les permissions de commande sont distinctes : être autorisé à lire un enregistrement n'accorde pas automatiquement la permission de le modifier. Dans l'exemple du panier, l'accès en lecture n'accorde pas le droit d'ajouter des articles. Configurez `Application.withAuth` à la limite web : sans câblage d'authentification, le chemin de commande Web actuel utilise `trustedContext` et contourne la barrière d'accès de la commande. Ajouter une politique de commande seule est insuffisant. Suivez le [contrôle d'accès](/fr/build/access-control/) pour le véritable câblage et [les tests](/fr/build/testing/) pour les vérifications comportementales.

## Tester avec plusieurs identités

Créez une matrice d'accès compacte pour votre application. Cet exemple utilise les rôles client, personnel et public du projet d'exercice :

| Appelant | Son propre panier | Panier d'un autre client | Catalogue public |
| --- | --- | --- | --- |
| Anonyme | Refusé | Refusé | Autorisé s'il est volontairement public |
| Client | Autorisé | Refusé | Autorisé |
| Membre du personnel | Selon la permission attribuée | Selon la permission attribuée | Autorisé |

Testez les routes de collection et de résultat individuel. Vérifiez aussi les identifiants absents, les identifiants invalides et un appelant légitime sans permission suffisante. Une demande administrateur réussie fournit une preuve faible de l'isolation entre utilisateurs ordinaires. Gardez ces cas dans le répertoire `tests/` de votre projet et exécutez `neo test` avec une base jetable après avoir activé la persistance.

## Garder les secrets hors de la sortie ordinaire

Déclarez la configuration sensible avec `Config.secret`, comme le champ de mot de passe de base de données dans [la persistance](/fr/operate/persistence/). Cela fournit une gestion au niveau de la configuration ; cela ne nettoie pas les chaînes arbitraires, les corps de requête ou les réponses de fournisseur que vous journalisez ensuite.

Les connexions persistantes à des fournisseurs nécessitent également un magasin de secrets correctement configuré. Le magasin de secrets en mémoire par défaut a la durée de vie du processus. Traitez le stockage choisi et ses contrôles d'accès comme une partie de la conception du déploiement.

Pour Postgres, `SslModeUnset` laisse la négociation par défaut du niveau inférieur. La configuration prend en charge des modes explicites comme `SslModeRequire`, `SslModeVerifyCa` et `SslModeVerifyFull`, ainsi qu'un chemin d'AC racine facultatif. Reliez les réglages prévus à **chaque** sous-système de base de données concerné et vérifiez la connectivité en staging. Un réglage TLS appliqué uniquement au magasin d'événements ne configure pas un magasin de fichiers ou de requêtes créé séparément.

## Garder l'IDE de développement local

`neo ide` se lie par défaut à `127.0.0.1:2323`. Passer `--host 0.0.0.0` le rend accessible sur d'autres interfaces. Il s'agit d'une modification d'exposition délibérée pour un outil qui agit sur votre projet ; la commande n'est pas un portail utilisateur de production.

## Exercice : remettre en question la proposition de l'agent

Dans le projet d'exercice, votre agent propose de rendre toutes les requêtes de panier publiques afin de simplifier une erreur frontend. Demandez-lui d'identifier la limite d'autorisation défaillante, de conserver la politique attendue et de démontrer la réussite d'une demande client ainsi que le refus d'une demande d'un autre client.

Le résultat utile est une règle d'accès expliquée et étayée par des preuves. Faire disparaître une erreur en élargissant l'accès ne suffit pas.

Ensuite, évaluez les [performances](/fr/operate/performance/) avec ces mêmes règles métier et d'accès.
