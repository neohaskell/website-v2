---
title: "Coordonner les modifications : stock et passage en caisse"
description: Ajoutez un second domaine et définissez où ses décisions doivent être coordonnées.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 3365d2858cbd3e34499d408fb35db1cab4fe86484c41948e1edd6f1059e483a0 -->

Une action acceptée peut mener à une autre décision. Une application de planification peut accepter une demande avant qu'une salle soit réservée ; un workflow documentaire peut enregistrer un brouillon avant qu'un réviseur ne l'accepte. Une application utile rend cette distinction visible.

Votre projet d'exercice gagne maintenant **Stock**. Un panier enregistre des sélections ; le stock suit les unités disponibles et réservées. Nous allons implémenter et tester la décision de stock ici, puis la relier aux ajouts du panier dans [la leçon sur les intégrations](/fr/connect/workflows/).

Les exemples ci-dessous montrent les déclarations et le comportement concernés, en nommant chaque destination. Les petits extraits enseignent une décision à la fois. Les fichiers Stock assemblés plus loin sur cette page incluent les modules complets nécessaires à ce checkpoint. Le [bundle complet de fin des fichiers Build](/examples/mug-shop-build.tar.gz) est complémentaire ; vous pouvez construire le checkpoint en créant les fichiers indiqués ici dans le même projet.

## Énoncer les engagements

`InitializeStock` crée un enregistrement avec une quantité disponible non négative. `ReserveStock` réserve une quantité positive uniquement lorsqu'il en reste suffisamment. Une réservation déplace des unités de `available` vers `reserved`.

Les identifiants de produit et de stock ont des rôles différents. Le produit identifie le modèle de la tasse ; l'ID de stock identifie l'enregistrement de disponibilité. Dans cet exercice, initialisez vous-même un enregistrement de stock par produit ; la commande n'impose pas l'unicité des produits.

Depuis la racine de votre projet, créez les répertoires de modules :

```sh
mkdir -p src/Shop/Stock/Commands src/Shop/Stock/Events src/Shop/Stock/Queries
```

## Donner à chaque fait un fichier ciblé

L'initialisation enregistre le produit et la quantité de départ. La réservation enregistre une quantité engagée envers un panier. Ensemble, ils forment le type d'événement du domaine Stock dans `src/Shop/Stock/Event.hs` :

```haskell
data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
```

Le marqueur d'événement gère les instances standard :

```haskell
deriveEvent ''StockEvent
```

Chaque payload vit séparément dans `Events/`. `Event.hs` liste les faits possibles et identifie le flux de stock que chacun affecte.

## Appliquer l'historique accepté

L'entité contient la disponibilité actuelle. Appliquer une réservation déplace sa quantité entre les deux compteurs :

```haskell
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }
```

Cette mise à jour appartient à `Entity.hs`. Elle ne demande pas à l'entrepôt d'aujourd'hui si la réservation acceptée hier était raisonnable. La commande valide la demande avant qu'elle ne devienne un fait.

Comme pour Cart, `Core.hs` ne fait que ré-exporter les types et les opérations du domaine. Ajouter une commande ne la transforme pas en gros fichier d'implémentation.

## Initialiser le stock, y compris à zéro

Dans `src/Shop/Stock/Commands/InitializeStock.hs`, `InitializeStock` possède deux champs d'entrée :

```haskell
data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }
```

La commande génère un identifiant de stock et refuse une quantité initiale négative. Zéro est autorisé : un produit peut avoir un enregistrement de stock alors qu'il ne reste aucune unité disponible. Une fois ses déclarations de décision, d'entité et de transport en place, son marqueur les relie :

```haskell
deriveCommand ''InitializeStock
```

## Protéger une réservation

`ReserveStock` vérifie l'existence, la quantité positive et la disponibilité. Sa décision finale dans `src/Shop/Stock/Commands/ReserveStock.hs` compare la demande à l'état actuel :

```haskell
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]
```

Cette commande utilise `InternalTransport`. Elle est destinée au travail de l'application ; nous ne l'exposons pas comme endpoint HTTP client. La leçon sur les intégrations fournira son déclencheur.

La [leçon sur les tests](/fr/build/testing/) appelle directement cette décision. Vous pouvez établir la règle de la dernière unité avant qu'une automatisation ne l'invoque.

## Présenter le résultat et enregistrer le domaine

`StockLevel` fournit une vue du produit, de la disponibilité et de la quantité réservée. Sa politique publique actuelle convient à cet exercice local ; réfléchissez à ce qu'un véritable catalogue devrait révéler.

Ajoutez ces étapes au pipeline d'application existant, en conservant Cart et tous les autres enregistrements :

```haskell
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## Décider ce que le passage en caisse promettra

Même après avoir relié les domaines, un ajout au panier peut être accepté alors que la réservation ultérieure est refusée. Un passage en caisse a besoin d'un résultat de réservation observable et d'une réponse à l'échec partiel. Concevez les engagements suivants comme des tranches supplémentaires :

| Engagement | Décision encore nécessaire |
| --- | --- |
| Le stock a été réservé | Comment Cart apprend-il si la réservation a réussi ? |
| Une commande a été acceptée | Quels prix, quantités, devise et détails de livraison deviennent fixes ? |
| Le paiement a été confirmé | Quelles preuves du fournisseur établissent le paiement, y compris les réponses tardives ou en double ? |
| Une réservation a expiré | Quel fait la libère et comment l'expiration interagit-elle avec le paiement ? |

Ce sont des politiques applicatives, pas des conséquences du simple fait de nommer un domaine Stock ou Cart.

## Assembler le checkpoint Stock

Lorsque les décisions sont claires, créez les répertoires avec la commande précédente et ajoutez ou remplacez les fichiers ci-dessous dans le même projet `mug-shop`. Conservez les fichiers Cart et `tests/Spec.hs` que vous avez déjà. Ce checkpoint conserve le magasin local non persistant de la première leçon du panier ; si vous avez ajouté l'authentification ou une autre politique de transport, fusionnez plutôt les étapes du service et de la requête Stock dans votre pipeline `app` existant.

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockInitialized.hs"
module Shop.Stock.Events.StockInitialized (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , productId :: Uuid
  , available :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockReserved.hs"
module Shop.Stock.Events.StockReserved (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Event.hs"
module Shop.Stock.Event (StockEvent (..), getEventEntityId) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved

data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
  deriving (Eq)

getEventEntityId :: StockEvent -> Uuid
getEventEntityId change = case change of
  StockInitialized fact -> fact.entityId
  StockReserved fact -> fact.entityId

deriveEvent ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Entity.hs"
module Shop.Stock.Entity (StockEntity (..), initialState, update) where

import Core
import Shop.Stock.Event (StockEvent (..), getEventEntityId)
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Uuid qualified

data StockEntity = StockEntity
  { stockId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

initialState :: StockEntity
initialState = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 0, reserved = 0}

update :: StockEvent -> StockEntity -> StockEntity
update change stock = case change of
  StockInitialized initialized ->
    StockEntity
      { stockId = initialized.entityId
      , productId = initialized.productId
      , available = initialized.available
      , reserved = 0
      }
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }

deriveEntity ''StockEntity ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Core.hs"
module Shop.Stock.Core (
  module Shop.Stock.Entity,
  module Shop.Stock.Event,
) where

import Shop.Stock.Entity
import Shop.Stock.Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/InitializeStock.hs"
module Shop.Stock.Commands.InitializeStock (
  InitializeStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Stock.Core

data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }

getEntityId :: InitializeStock -> Maybe Uuid
getEntityId _ = Nothing

decide :: InitializeStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Just _ -> Decider.reject "Stock already initialized for this product!"
  Nothing -> initialize request

initialize :: InitializeStock -> Decision StockEvent
initialize request =
  if request.available < 0
    then Decider.reject "Available stock cannot be negative"
    else do
      stockId <- Decider.generateUuid
      Decider.acceptNew
        [StockInitialized (StockInitialized.Event {entityId = stockId, productId = request.productId, available = request.available})]

type instance EntityOf InitializeStock = StockEntity

type instance TransportsOf InitializeStock = '[WebTransport]

deriveCommand ''InitializeStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/ReserveStock.hs"
module Shop.Stock.Commands.ReserveStock (
  ReserveStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Stock.Core

-- | Command to reserve stock for a cart.
-- Keep reservation internal; the integration lesson supplies its trigger.
data ReserveStock = ReserveStock
  { stockId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }

getEntityId :: ReserveStock -> Maybe Uuid
getEntityId cmd = Just cmd.stockId

decide :: ReserveStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Stock not found!"
  Just stock -> reservePositiveQuantity request stock

reservePositiveQuantity :: ReserveStock -> StockEntity -> Decision StockEvent
reservePositiveQuantity request stock =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else reserveAvailableStock request stock

reserveAvailableStock :: ReserveStock -> StockEntity -> Decision StockEvent
reserveAvailableStock request stock =
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]

type instance EntityOf ReserveStock = StockEntity

type instance TransportsOf ReserveStock = '[InternalTransport]

deriveCommand ''ReserveStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Queries/StockLevel.hs"
module Shop.Stock.Queries.StockLevel (
  StockLevel (..),
  canAccess,
  canView,
) where

import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Stock.Core (StockEntity (..))

data StockLevel = StockLevel
  { stockLevelId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

-- | Authorization: Anyone can access stock levels (public catalog data)
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess claims = AccessControl.publicAccess claims

-- | Authorization: Anyone can view any stock level
canView :: Maybe UserClaims -> StockLevel -> Maybe AccessError
canView claims stockLevel = AccessControl.publicView claims stockLevel

-- | Use TH to derive Query instances.
-- Wires canAccess -> canAccessImpl, canView -> canViewImpl
deriveQuery ''StockLevel [''StockEntity]

instance QueryOf StockEntity StockLevel where
  queryId stock = stock.stockId

  combine stock _maybeExisting =
    Update
      StockLevel
        { stockLevelId = stock.stockId
        , productId = stock.productId
        , available = stock.available
        , reserved = stock.reserved
        }
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Service.hs"
module Shop.Stock.Service (
  service,
) where

import Core
import Service qualified
import Shop.Stock.Commands.InitializeStock (InitializeStock)
import Shop.Stock.Commands.ReserveStock (ReserveStock)
import Shop.Stock.Core ()

service :: Service _ _
service =
  Service.new
    |> Service.command @InitializeStock
    |> Service.command @ReserveStock
```

Si vous avez terminé les leçons Cart et Configuration, `src/App.hs` doit contenir les enregistrements du service et de la requête Stock présentés ici. Créez ou remplacez uniquement le pipeline si votre application n'a pas encore d'autres politiques ; sinon, ajoutez les deux dernières étapes en conservant votre magasin, votre transport et vos enregistrements Cart existants.

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
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## Créer et inspecter le stock

Exécutez maintenant le checkpoint depuis la racine du projet :

```sh
neo build
neo run
```

Créez un enregistrement de stock :

```sh
curl -i http://localhost:8080/commands/initialize-stock \
  -H 'Content-Type: application/json' \
  --data '{"productId":"11111111-1111-1111-1111-111111111111","available":3}'
```

Conservez l'`entityId` renvoyé comme ID de stock. Lisez sa vue :

```sh
curl --get http://localhost:8080/queries/stock-level \
  --data-urlencode 'q=.stockLevelId == "YOUR-STOCK-UUID"'
```

Lorsque la projection a rattrapé son retard, attendez-vous à trois unités disponibles et zéro réservée. Créez un panier et envoyez `AddItem` avec cet ID de stock et la quantité deux. Le panier doit avoir une entrée. **Le stock possède toujours trois unités disponibles et zéro réservée** : nous avons implémenté les deux décisions, mais nous ne les avons pas reliées.

Cette observation constitue une preuve. Deux services enregistrés n'impliquent pas que l'un appelle l'autre. Dans [la connexion des étapes applicatives](/fr/connect/workflows/), vous ajouterez la connexion et vérifierez le passage à une unité disponible et deux unités réservées.

## Conserver une vérification de stock répétable

Enregistrez le scénario HTTP ci-dessous sous `tests/scenarios/stock-flow.hurl`. Il crée son propre enregistrement, attend sa vue et vérifie le refus d'une quantité initiale négative. Arrêtez `neo run` avant d'exécuter `neo test`.

<details>
<summary>Fichier complet : tests/scenarios/stock-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/stock-flow.hurl"
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}

HTTP 200
[Captures]
stock_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 3
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 0

POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"22222222-2222-2222-2222-222222222222","available":-1}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Available stock cannot be negative"
```

</details>

Exécutez `neo test` depuis la racine du projet. L'ID de stock capturé par le scénario rend la vérification indépendante des exécutions précédentes et la nouvelle tentative de requête permet à la projection de rattraper son retard. Cette page ne relie pas encore `AddItem` à `ReserveStock` ; ce déclencheur est une intégration interne enseignée dans [Connect](/fr/connect/workflows/).

## Exercice : la dernière tasse

Votre agent affirme qu'une demande de panier réussie prouve que la dernière tasse appartient au client. Identifiez la preuve manquante.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

La demande du panier établit une sélection. Vérifiez la décision de réservation et le résultat qu'elle enregistre. Réservez deux unités sur trois, refusez quatre unités sur trois et acceptez exactement trois. Les demandes concurrentes pour la dernière unité nécessitent une vérification simultanée au niveau de l'application. Les demandes répétées nécessitent une politique de doublon délibérée ; la commande actuelle peut réserver à nouveau lorsqu'il reste assez de stock.

</details>

Ensuite : [HTTP et interfaces frontend](/fr/build/http-and-frontend/) transforment ces résultats en interface honnête.
