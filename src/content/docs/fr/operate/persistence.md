---
title: Rendre les données applicatives persistantes
description: Choisissez le stockage des événements, modèles de lecture, fichiers et identifiants, puis prouvez ce qui survit au redémarrage.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 16be86b1ad86ca0cea9a3ceedf55e41210cd17c287c35a5f5280b7900f75b354 -->

Redémarrer une application ne doit pas effacer le travail qu'elle a promis de conserver. Un tableau de bord temporaire peut en revanche être reconstruit sans risque. La persistance commence par cette distinction : décidez quelles informations font autorité et lesquelles peuvent être reconstruites. Un panier et ses ajouts acceptés dans `mug-shop` nous donnent un petit exemple à suivre lors d'un redémarrage.

Dans une application utilisant l'event sourcing, les événements acceptés préservent l'historique métier. Les entités et les requêtes interprètent cet historique à des fins différentes. Conserver les événements en sécurité est essentiel, mais ce ne sont pas les seules données que votre application peut devoir retenir.

Tous les chemins ci-dessous sont relatifs à la racine du projet `mug-shop` créée par `neo new`. La leçon explique d'abord le remplacement, puis donne les fichiers complets `ShopConfig`, la fabrique de stockage et `App.hs` nécessaires au checkpoint Postgres. Si vous avez déjà ajouté des intégrations, conservez leurs imports et enregistrements en fusionnant les fichiers de persistance complets.

## Identifier chaque type de stockage

| Information | Surface NeoHaskell | Décision applicative |
| --- | --- | --- |
| Événements acceptés | `Service.EventStore` | Utiliser un stockage durable avant d'accepter un travail qui doit survivre au redémarrage |
| Résultats de requêtes | `Service.QueryObjectStore` | Choisir la mémoire ou Postgres indépendamment du stockage d'événements |
| Octets importés | Magasin de blobs local configuré par `blobStoreDir` | Conserver et sauvegarder les fichiers réels |
| Propriété et cycle de vie des fichiers | Magasin d'état des fichiers | Choisir un état persistant en plus des octets persistants |
| Secrets de fournisseurs connectés | `Application.withSecretStore` | Fournir un stockage dont la durée de vie correspond aux besoins du déploiement |

Le starter configure `SimpleEventStore` avec `persistent = False`. Un chemin qui ressemble à un chemin de système de fichiers ne rend pas ce réglage durable. Il convient à la première expérience ; le redémarrage de cette expérience fait perdre son historique d'événements.

## Remplacer la configuration par des réglages de base de données

Continuez dans votre propre répertoire `mug-shop`. Les commandes agissent toujours sur `neo.json`, `src/App.hs` et les modules `src/Shop/`. C'est à ce moment du parcours que l'on ajoute une base de données ; Cart et Stock n'en avaient pas besoin pour les leçons précédentes.

Un mot de passe est un bon premier exemple : il est obligatoire, fourni par l'environnement et masqué lorsque le record de configuration est affiché :

```haskell
Config.field @Text "dbPassword"
  |> Config.doc "PostgreSQL password"
  |> Config.required
  |> Config.envVar "DB_PASSWORD"
  |> Config.secret
```

Les autres choix identifient le serveur et la base de données et définissent le pool de connexions ainsi que la politique TLS. Remplacez `src/Shop/Config.hs` par le fichier complet ci-dessous. Il conserve le champ `persistEvents` précédent afin que cet overlay reste une extension directe du checkpoint Build ; après le changement, ce champ ne contrôle plus le magasin d'événements Postgres et peut être supprimé lorsque plus rien ne l'utilise.

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
  , Config.field @Text "dbHost"
      |> Config.doc "PostgreSQL host"
      |> Config.defaultsTo ("localhost" :: Text)
      |> Config.envVar "DB_HOST"
  , Config.field @Int "dbPort"
      |> Config.doc "PostgreSQL port"
      |> Config.defaultsTo (5432 :: Int)
      |> Config.envVar "DB_PORT"
  , Config.field @Text "dbUser"
      |> Config.doc "PostgreSQL user"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_USER"
  , Config.field @Text "dbPassword"
      |> Config.doc "PostgreSQL password"
      |> Config.required
      |> Config.envVar "DB_PASSWORD"
      |> Config.secret
  , Config.field @Text "dbName"
      |> Config.doc "PostgreSQL database name"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_NAME"
  , Config.field @Int "dbPoolSize"
      |> Config.doc "Event-store connection pool size"
      |> Config.defaultsTo (6 :: Int)
      |> Config.envVar "DB_POOL_SIZE"
  , Config.field @Text "dbSslMode"
      |> Config.doc "PostgreSQL TLS mode"
      |> Config.defaultsTo ("unset" :: Text)
      |> Config.envVar "DB_SSL_MODE"
  , Config.field @Text "dbSslRootCert"
      |> Config.doc "Root CA certificate path, or empty for none"
      |> Config.defaultsTo ("" :: Text)
      |> Config.envVar "DB_SSL_ROOT_CERT"
  ]
```

Les réglages correspondent directement à `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` et `DB_SSL_ROOT_CERT`. Les valeurs locales par défaut correspondent à la base de données Docker Compose du projet généré. Le mot de passe est obligatoire afin que son absence produise une erreur de configuration. Lorsque vous quittez cet exercice local, choisissez l'adresse, les identifiants, le budget de pool et les exigences TLS réels de la base déployée.

## Créer une fabrique de stockage

Créez `src/Shop/Storage.hs`. Gardez la traduction des réglages vers le stockage dans ce fichier afin que `App.hs` ne fasse que sélectionner la fabrique. Commencez par son contrat :

```haskell
makePostgresConfig :: ShopConfig -> PostgresEventStore
```

La plupart des champs transmettent une valeur, par exemple `host = config.dbHost`. Le mode TLS doit être validé puisque l'environnement fournit du texte :

```haskell
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
```

Copiez la fabrique complète ci-dessous. Elle transmet les huit champs actuels de `PostgresEventStore`, y compris les réglages de pool et TLS, et traite un chemin de certificat racine vide comme absent.

<!-- complete-file -->
```haskell title="src/Shop/Storage.hs"
module Shop.Storage (makePostgresConfig) where

import Core
import Service.EventStore.Postgres (PostgresEventStore (..))
import Service.Infra.Postgres.ConnectionConfig qualified as ConnectionConfig
import Shop.Config (ShopConfig (..))
import Text qualified

makePostgresConfig :: ShopConfig -> PostgresEventStore
makePostgresConfig config =
  PostgresEventStore
    { user = config.dbUser,
      password = config.dbPassword,
      host = config.dbHost,
      databaseName = config.dbName,
      port = config.dbPort,
      poolSize = config.dbPoolSize,
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
      sslRootCert =
        if Text.isEmpty config.dbSslRootCert
          then Nothing
          else Just config.dbSslRootCert
    }
```

Un mode TLS inconnu échoue au démarrage ; `unset` laisse la négociation par défaut du pilote en place. Un réglage a un effet parce que la fabrique le transmet, pas parce qu'une variable d'environnement porte un nom qui semble reconnu.

## Remplacer le câblage du magasin d'événements de l'application

Dans `src/App.hs`, ajoutez cet import :

```haskell
import Shop.Storage qualified as Storage
```

Remplacez l'import `SimpleEventStore` et l'expression `Application.withEventStore` par la fabrique Postgres, en conservant votre transport, vos services, vos requêtes et vos enregistrements d'intégration :

```haskell
  |> Application.withEventStore Storage.makePostgresConfig
```

Le résultat complet ci-dessous poursuit les leçons de coordination Cart-Stock et d'upload tout en remplaçant le magasin d'événements. L'observation temporaire du timer est terminée, son enregistrement est donc absent. Si vous avez ignoré une fonctionnalité, omettez son import et son enregistrement ; conservez l'authentification ou les autres ajouts effectués. `ShopConfig` et `Shop.Storage` sont les deux fichiers complets créés précédemment.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Service.Application (Application)
import Service.Application qualified as Application
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig)
import Shop.Storage qualified as Storage
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore Storage.makePostgresConfig
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

Aucun package supplémentaire n'est nécessaire dans `neo.json` : l'implémentation du magasin d'événements est fournie par le framework. Conservez la CLI et les pins du framework de la même release Neo afin que le projet généré et ces exemples utilisent un compilateur et un framework compatibles.

## Démarrer la base locale et l'application

Avec Docker et sa commande Compose disponibles, utilisez le `docker-compose.yml` du projet généré :

```sh
docker compose up -d postgres
docker compose exec postgres pg_isready -U neohaskell
neo build
DB_PASSWORD=neohaskell neo run
```

Attendez que `pg_isready` indique que la base accepte les connexions. Le mot de passe ci-dessus est celui de l'exemple Docker Compose local. Fournissez les vrais identifiants via le mécanisme de secrets de votre déploiement. Le chargeur de configuration lit l'environnement du processus ; créer seul un fichier `.env` ne prouve pas qu'il a été transmis à l'application.

Si un autre service local utilise le port 5432, modifiez le mapping de l'hôte Compose vers un port libre, par exemple `55432:5432`, avant de le démarrer et fournissez `DB_PORT=55432` lors de l'exécution de l'application ou de ses tests. N'arrêtez pas une base sans rapport.

Changer de magasin ne migre ni l'historique antérieur en mémoire ni les fichiers d'événements locaux activés avec `persistEvents`. Créez le panier de l'expérience suivante après le démarrage avec Postgres. Pour des tests HTTP répétables, arrêtez l'application en cours et utilisez `DB_PASSWORD=neohaskell neo test` contre cette base locale jetable. La CLI démarre son propre serveur et les tests écrivent des données : ne pointez jamais cette commande vers une base de production.

## Les événements persistants et les requêtes persistantes sont distincts

Les requêtes utilisent la mémoire, sauf si vous fournissez un backend de magasin de requêtes avec `Application.withQueryObjectStore` (également exposé sous le nom `useQueryObjectStore`). `PostgresQueryObjectStoreConfig` possède ses propres réglages de connexion et de pool. Les magasins distinguent les requêtes par nom ainsi que par identifiant d'instance, de sorte que deux vues d'une même entité restent séparées.

Il existe une limite opérationnelle importante : les API de bas niveau du subscriber de requêtes fournissent la prise en charge des reconstructions sensibles aux checkpoints et aux hash, mais le câblage normal de `Application` construit actuellement `Subscriber.new`. Choisir un magasin de requêtes Postgres n'est **pas la preuve que le démarrage reprend depuis un checkpoint persistant**. Testez le redémarrage et la relecture avec votre câblage et votre logique de projection réels, en particulier si une projection accumule les valeurs au lieu de les remplacer.

## Prouver la durabilité avec une modification représentative

Utilisez les routes Cart de [HTTP et frontend](/fr/build/http-and-frontend/) avec la configuration Postgres locale :

1. Créez un panier, ajoutez une quantité positive et sauvegardez son identifiant ainsi que le contenu attendu.
2. Attendez que `CartSummary` affiche le résultat attendu, puis envoyez une quantité nulle et vérifiez le refus.
3. Arrêtez avec Ctrl-C et exécutez à nouveau `DB_PASSWORD=neohaskell neo run` depuis le même projet, sur la même base.
4. Attendez `/ready`, puis récupérez le résumé du même panier.
5. Comparez l'identifiant, le nombre d'entrées et l'état vide/non vide. Vérifiez que la relecture n'a pas compté un ajout deux fois et que la demande refusée n'a rien ajouté.

Répétez avec une pièce jointe importée si votre workflow en utilise une. Une ligne de base de données qui survit ne prouve pas que les octets correspondants ont survécu. Établissez aussi comment les uploads abandonnés sont supprimés : un worker de nettoyage de bas niveau existe dans `Service.FileUpload.Web`, mais le démarrage actuel de `Application.withFileUpload` ne le lance pas. Définir `cleanupIntervalSeconds` seul n'établit donc pas un nettoyage automatique. Vérifiez le câblage de cycle de vie choisi et surveillez la croissance du stockage.

Essayez de déplacer le processus vers un hôte vierge en ne conservant que les ressources que vous aviez l'intention de rendre persistantes. Le panier doit rester récupérable depuis le magasin d'événements conservé. Tout fichier ou toute connexion fournisseur manquant révèle une autre dépendance de persistance ; ajoutez-la au plan de déploiement et de sauvegarde, puis répétez l'expérience. Ne déduisez pas la durabilité d'un simple redémarrage réussi.

Continuez avec le [déploiement](/fr/operate/deployment/) et la [récupération](/fr/operate/recovery/).

<details>
<summary>Sources du framework et des checkpoints</summary>

- [Champs du magasin d'événements Postgres](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Postgres/Internal.hs)
- [Parsing du mode TLS](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Infra/Postgres/SslMode.hs)
- [Base locale générée](https://github.com/neohaskell/NeoHaskell/blob/main/neo/starter/docker-compose.yml)
- [Configuration complète de persistance](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Config.hs)
- [Fabrique complète de stockage de persistance](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Storage.hs)
- [Application complète de persistance](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/App.hs)

</details>
