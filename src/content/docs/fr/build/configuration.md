---
title: Configuration
description: Reliez des réglages typés aux parties de votre application qui les consomment.
sidebar:
  order: 9
---
<!-- translation-source-sha256: 3efdbe4acc9f0b262596a1e4e03d8517882c1c2c7856ae43dd8256fee4c90191 -->

Les applications ont besoin de réglages différents selon les environnements tout en conservant des règles métier cohérentes. La configuration donne un nom à ces choix, valide leurs types et rend explicite leur connexion à l'application en cours d'exécution.

Une adresse de base de données relève de la configuration. Le prix convenu d'une commande appartient à l'historique métier. Modifier un réglage demain ne doit pas réécrire l'accord d'hier.

Les exemples ci-dessous montrent les déclarations et le comportement concernés, en nommant chaque destination. Les petits extraits expliquent un choix à la fois ; les fichiers assemblés plus loin sur cette page incluent les imports nécessaires à ces déclarations. Le [bundle complet de fin des fichiers Build](/examples/mug-shop-build.tar.gz) est complémentaire et contient le même checkpoint ainsi que les tests.

## Ajouter un réglage utilisé par l'application

Jusqu'ici, votre application démarre toujours avec un historique vide en mémoire. Nous allons rendre la persistance locale explicite comme réglage de développement, avec le même comportement par défaut.

Commencez par nommer le choix et sa valeur par défaut :

```haskell
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

Placez ce champ dans `defineConfig "ShopConfig"` de `src/Shop/Config.hs`. Le checkpoint contient la définition complète.

`defineConfig` génère un record et son parseur. Le champ possède une documentation, un type booléen, une valeur par défaut et une variable d'environnement. La macro exige que chaque champ ait une documentation et une politique explicite de valeur par défaut ou de valeur obligatoire.

## Relier le réglage au magasin

Après avoir terminé les leçons Cart et Stock, reliez le réglage à votre **base locale de développement**. Si vous avez déjà ajouté l'authentification ou d'autres enregistrements, conservez-les : ajoutez l'import `Shop.Config`, insérez `withConfig @ShopConfig` et remplacez uniquement l'étape `withEventStore`. Ne supprimez pas la configuration des permissions de votre application.

Les étapes pertinentes du pipeline dans `src/App.hs` sont :

```haskell
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
```

`withConfig` enregistre le type à charger. La fabrique du magasin consomme le record chargé. C'est la connexion importante : déclarer `persistEvents` seul ne modifierait pas le stockage.

## Ajouter délibérément des valeurs obligatoires

Un identifiant de fournisseur peut être un champ secret obligatoire. Il s'agit d'un **fragment de liste de champs** à ajouter lorsque le fournisseur correspondant est implémenté, pas d'une exigence pour l'application actuelle :

```haskell
  , Config.field @Text "providerKey"
      |> Config.doc "Credential for the selected external provider"
      |> Config.required
      |> Config.envVar "SHOP_PROVIDER_KEY"
      |> Config.secret
```

Votre intégration doit alors consommer `config.providerKey`. `required` établit la présence de la valeur ; il ne peut pas prouver que le fournisseur distant acceptera l'identifiant.

`Config.secret` masque le champ dans l'affichage du record généré et dans le JSON. Il ne chiffre pas la valeur et n'empêche pas le code de journaliser le champ brut après extraction. Conservez les vrais identifiants dans le mécanisme de gestion des identifiants de votre déploiement.

## Vérifier le consommateur, pas seulement le parseur

Le chargeur lit les arguments du processus et les variables d'environnement. Un fichier `.env` n'entre pas automatiquement dans l'environnement du processus ; utilisez un chargeur explicite ou votre gestionnaire de processus si vous choisissez ce format.

Un champ nommé `httpPort` ne modifie pas non plus automatiquement un écouteur. Votre application utilise actuellement `WebTransport.server`, qui écoute sur 8080. Pour un autre port de développement fixe, remplacez cette étape du pipeline par :

```haskell
  |> Application.withTransport (WebTransport.server {port = 8081})
```

Mettez les clients à jour en conséquence. Le workflow HTTP actuel de `neo test` sonde le port 8080 : conservez ce port pour les tests du tutoriel ; modifier uniquement les URL Hurl ne change pas sa sonde de démarrage. Consultez la [référence CLI](/fr/reference/cli/). Si vous rendez ensuite le port configurable, suivez la valeur parsée jusqu'au transport réel et vérifiez l'adresse d'écoute.

## Assembler le checkpoint de persistance locale

Vous avez maintenant vu le champ et le consommateur séparément. Dans le même projet `mug-shop`, créez ou remplacez `src/Shop/Config.hs` avec le fichier complet ci-dessous.

<!-- complete-file -->
```haskell title="src/Shop/Config.hs"
module Shop.Config (ShopConfig (..), HasShopConfig) where

import Config (defineConfig)
import Config qualified
import Core

defineConfig
  "ShopConfig"
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

Puis remplacez le câblage applicatif de `src/App.hs` par ce checkpoint local complet. Si vous avez déjà ajouté la variante authentifiée de [contrôle d'accès](/fr/build/access-control/), conservez cette politique et insérez les étapes `withConfig` et `withEventStore` dans votre pipeline existant au lieu de remplacer le fichier entier.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig (..))
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

Exécutez `neo build` après avoir créé ou remplacé ces fichiers. Avec la valeur par défaut, exécutez `neo test`, puis supprimez `.neo/events` si vous voulez repartir d'un exercice local vierge. Avec `PERSIST_EVENTS=True`, conservez le répertoire d'événements du serveur entre les redémarrages et vérifiez que le même ID de panier possède toujours son résumé. Il s'agit d'un checkpoint de développement, pas d'une garantie de récupération durable en production.

Pour l'exercice de redémarrage, arrêtez les autres serveurs et exécutez :

```sh
PERSIST_EVENTS=True neo run
```

Utilisez `True` et `False` avec une majuscule : ce champ booléen utilise le parseur de valeurs Haskell typées. Créez un panier et gardez son ID. Arrêtez le serveur et exécutez à nouveau la même commande. Lisez le résumé du panier en laissant le temps nécessaire à la reconstruction et à la projection. Les paniers des exécutions précédentes en mémoire ne sont pas migrés vers des fichiers lorsque vous activez ce réglage.

Le [chapitre sur la persistance](/fr/operate/persistence/) explique le passage à PostgreSQL et la vérification d'une récupération durable. Les fichiers d'événements locaux sont une option de développement utile ; exploiter une application exige aussi des sauvegardes, des preuves de restauration, des choix de conservation et des accès appropriés.

## Exercice : facultatif ou mal configuré ?

Votre agent donne à une clé de fournisseur obligatoire une valeur par défaut égale à la chaîne vide afin que le démarrage réussisse. Quel comportement voulez-vous lorsque le fournisseur est indisponible ou non configuré ?

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Si la fonctionnalité est obligatoire, exigez son identifiant et signalez clairement au démarrage son absence. Si elle est facultative, modélisez explicitement l'état désactivé. Testez une configuration valide, une valeur obligatoire absente et une valeur typée invalide. Vérifiez le masquage avec des identifiants de test sans danger et vérifiez séparément que le fournisseur reçoit la valeur configurée.

</details>

Ensuite : [examiner votre application](/fr/build/your-shop/) avant de la connecter à d'autres systèmes.

Références API : [configuration](https://github.com/neohaskell/NeoHaskell/blob/main/core/config/Config.hs), [fabriques d'application](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs), [magasin simple](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Simple.hs).
