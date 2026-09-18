---
title: Importer et joindre des fichiers
description: Stockez les octets importés, validez les références de fichiers et joignez-les à des actions applicatives acceptées.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 0a81f2fdd4de6e40404671fbcce68f5cdbb189b58e661c2e8a4fec26d9c10443 -->

Quelqu'un importe un fichier, puis ferme le navigateur avant de terminer le formulaire. L'application a besoin d'un stockage temporaire pour cet upload inachevé et d'une association claire lorsque le fichier devient partie d'une action acceptée.

NeoHaskell fournit des références de fichiers, des routes d'upload et de téléchargement, des contrôles de propriété sur le parcours destiné aux utilisateurs et un cycle de vie des fichiers. Vous décidez quels fichiers sont acceptables et quand les joindre. Continuez dans votre propre projet `mug-shop` : créez un fichier de configuration d'upload, ajoutez un enregistrement à l'application, importez un petit exemple, puis concevez la manière dont une illustration devient attachée à une tasse personnalisée.

Tous les chemins ci-dessous sont relatifs à la racine du projet `mug-shop`. Les extraits ciblés expliquent d'abord les choix. Les fichiers complets montrent les imports exacts et le code applicatif environnant nécessaires à un checkpoint exécutable.

## Choisir la politique d'upload

Pour cet exercice local, autorisez les petites notes texte, les illustrations PNG et les PDF. Conservez les octets dans `./uploads`, gardez les métadonnées du cycle de vie en mémoire et faites expirer les références inachevées après six heures :

```haskell
uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Cette politique sert à l'apprentissage. Le magasin de métadonnées est en mémoire : un redémarrage fait donc perdre les références, même si les octets restent dans `uploads/`. Une application déployée doit choisir ensemble des métadonnées persistantes et un stockage de blobs persistant.

## Créer le fichier de configuration d'upload

Créez `src/Shop/Uploads.hs`. Copiez le fichier complet ci-dessous en un seul fichier au lieu de deviner quels types d'upload importer.

<!-- complete-file -->
```haskell title="src/Shop/Uploads.hs"
module Shop.Uploads (uploadConfig) where

import Core
import Service.FileUpload.Core (FileUploadConfig (..), FileStateStoreBackend (..))


uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Les champs sont des décisions applicatives :

| Champ | Décidez de sa signification pour votre déploiement |
| --- | --- |
| `blobStoreDir` | Où résident les octets réels du fichier |
| `stateStoreBackend` | Où persistent les métadonnées du cycle de vie du fichier |
| `maxFileSizeBytes` | Taille du plus grand upload accepté |
| `pendingTtlSeconds` | Durée pendant laquelle un upload inachevé reste utilisable |
| `cleanupIntervalSeconds` | Configuration de la planification du nettoyage |
| `allowedContentTypes` | Types média déclarés autorisés, ou aucune restriction |
| `storeOriginalFilename` | Conservation ou non des noms d'origine |

Les vérifications au démarrage imposent des valeurs de taille et de durée positives, exigent un répertoire non vide et exigent que l'intervalle de nettoyage soit inférieur au TTL en attente. Le câblage applicatif actuel ne démarre pas le worker de nettoyage disponible. L'expiration est appliquée lors de l'accès, mais les octets abandonnés des blobs ne sont pas automatiquement récupérés par cette configuration. Organisez et testez le nettoyage pour le backend que vous déployez.

## Ajouter la prise en charge des uploads à `App.hs`

Dans `src/App.hs`, ajoutez cet import qualifié avec les autres imports `Shop` :

```haskell
import Shop.Uploads qualified as Uploads
```

Ajoutez cet enregistrement après le transport, les services et les requêtes existants :

```haskell
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

La fabrique `@()` est indépendante de `ShopConfig` pour cet exemple local. Lorsque le répertoire et les limites deviennent des réglages de déploiement, remplacez la fabrique par une fonction issue du type de configuration enregistré par `Application.withConfig`.

Après avoir terminé [la leçon sur les workflows](/fr/connect/workflows/), voici le `src/App.hs` complet obtenu. Il conserve l'enregistrement sortant et ajoute les uploads. Si vous arrivez directement sur cette page, ajoutez les deux lignes de workflow de cette leçon aux mêmes emplacements, ou omettez-les jusqu'à la fin de la page précédente.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig (..))
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock
import Shop.Uploads qualified as Uploads

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
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

## Importer les octets avant de les joindre

Arrêtez et reconstruisez après la modification, puis démarrez l'application depuis la racine du projet :

```sh
neo build
neo test
neo run
```

Dans un autre terminal à la racine du même projet, créez une fixture et envoyez-la au serveur en cours :

```sh
mkdir -p examples
printf 'Blue mug artwork draft\n' > examples/artwork-note.txt
curl -F 'file=@examples/artwork-note.txt;type=text/plain' \
  http://localhost:8080/files/upload
```

Attendez un JSON contenant `fileRef`, `filename`, `contentType`, `sizeBytes` et `expiresAt`. Ce premier aller-retour utilise l'application locale sans authentification. Si vous avez activé l'authentification, fournissez des identifiants comme indiqué dans le [contrôle d'accès](/fr/build/access-control/).

Utilisez la référence renvoyée pour demander les octets. Remplacez le placeholder par le `fileRef` renvoyé :

```sh
curl http://localhost:8080/files/YOUR-FILE-REFERENCE
```

**Limitation actuelle du téléchargement authentifié :** la route de téléchargement utilise le mode middleware `Everyone`, qui renvoie des claims anonymes même lorsqu'un token est présent. Un upload appartenant à un sujet authentifié ne peut donc pas être considéré comme téléchargeable par cette route. Vérifiez et résolvez ce parcours avant d'activer les pièces jointes privées ; l'exercice anonyme n'établit pas une prise en charge de bout en bout de la propriété authentifiée.

## Joindre une référence via une action acceptée

Importer des octets n'a pas modifié un panier. Pour ajouter une fonctionnalité d'illustration, créez une commande avec un champ `attachment :: FileRef`. `FileRef` est le type de référence défini dans `Service.FileUpload.Core`. Utilisez le marqueur de commande de [commandes et événements](/fr/build/commands-and-events/). Le framework résout la référence avant l'exécution de la commande et fournit les métadonnées via `RequestContext.files`.

Conservez la référence du fichier dans l'événement accepté avec son association au panier ou à la demande d'illustration. Ne copiez pas les octets bruts dans l'événement. La commande, l'événement et la vue qui affichent l'illustration sont un nouveau travail applicatif : créez ces fichiers avant de proposer une action « joindre » à l'écran.

Le résolveur vérifie l'existence du fichier, sa suppression, l'expiration en attente, la propriété et la présence du blob. Les références en attente expirent ; les références confirmées ne sont pas rejetées uniquement parce que leur TTL en attente est dépassé. L'application a toujours besoin de règles de conservation et de suppression.

Le contexte d'accès aux fichiers d'une intégration en arrière-plan est différent du contexte de demande d'un utilisateur. Son implémentation récupère par référence depuis le stockage ; elle ne transporte pas de contrôle de propriété lié à l'utilisateur demandeur. Ne déclenchez le traitement qu'à partir d'une action autorisée qui a validé l'association. N'acceptez pas une référence arbitraire provenant d'un prompt non fiable pour la transmettre à un processeur en arrière-plan.

Un type média déclaré est utile pour le routage et les limites, mais ne prouve pas que les octets sont une illustration valide ou un document sûr. Validez les propriétés sur lesquelles votre application s'appuie avant de les accepter.

## Exercice : l'illustration abandonnée d'un client

Dans le projet d'exercice, décidez quand l'illustration devient attachée à une commande, ce qui se passe après l'expiration en attente et ce que l'écran affiche si les octets stockés manquent. Testez une référence valide appartenant au bon utilisateur, une référence d'un autre utilisateur, un upload en attente expiré, une référence supprimée, des octets de blob manquants, des données multipart manquantes et un fichier trop volumineux. Gardez la commande refusée lorsque sa pièce jointe obligatoire ne peut pas être résolue. Exécutez ces vérifications avec `neo test` et exercez séparément la route HTTP d'upload en direct. Ajoutez un scénario de propriété authentifiée avant d'activer les pièces jointes privées.

Continuez avec [le traitement des documents](/fr/connect/documents/) lorsque le cycle de vie des pièces jointes est clair.

<details>
<summary>Notes sur le code source du framework</summary>

- [core/auth/Auth/Middleware.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/Middleware.hs)
- [core/service/Service/Transport/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [core/service/Service/FileUpload/Resolver.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Resolver.hs)
- [core/service/Service/FileUpload/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Web.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/src/Testbed/Document/Commands/CreateDocument.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Document/Commands/CreateDocument.hs)
- [testbed/tests/files/upload.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload.hurl)
- [testbed/tests/files/download.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/download.hurl)
- [testbed/tests/files/upload-errors.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload-errors.hurl)

</details>
