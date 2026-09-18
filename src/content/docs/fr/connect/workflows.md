---
title: Coordonner le travail entre les entités
description: Reliez les événements et les commandes entre services tout en gardant chaque règle explicite.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 7916e17a3e9a10332cb125157f4a090af1d94900dad98769570db76df4cba7b4 -->

Une modification acceptée peut nécessiter du travail dans une autre partie de l'application. Séparer ces responsabilités donne à chaque règle un foyer clair, mais introduit une période pendant laquelle un côté a changé et l'autre pas encore. Une intégration rend ce transfert explicite.

Continuez dans votre propre répertoire `mug-shop` depuis [stock et passage en caisse](/fr/build/stock-and-checkout/). Ses services Cart et Stock prennent déjà des décisions séparées. Reliez-les maintenant : l'ajout de deux tasses enregistre le choix dans Cart, puis demande à Stock de réserver deux unités. Cette politique réserve lors de l'ajout ; réserver au moment du passage en caisse est une variation ultérieure.

Tous les chemins ci-dessous sont relatifs à la racine du projet `mug-shop`. Les exemples font évoluer le même projet. Les petites déclarations expliquent d'abord la décision ; les fichiers complets de chaque section sont les checkpoints que vous pouvez copier.

## Décider ce qui franchit la limite

Le transfert n'a qu'un rôle : transformer un événement `ItemAdded` accepté en demande de stock. La valeur importante est la commande envoyée au service Stock :

```haskell
ReserveStock
  { stockId = added.stockId
  , quantity = added.quantity
  , cartId = cart.cartId
  }
```

`added` est le payload contenu dans `ItemAdded` ; `cart` fournit l'identifiant du panier. Enveloppez cette valeur dans `Command.Emit` afin que le runtime d'intégration puisse la livrer. Il s'agit d'une commande applicative : elle préserve la décision de Stock et ses règles de refus au lieu de les contourner.

## Créer l'intégration sortante

Depuis la racine du projet, créez le répertoire d'intégration :

```sh
mkdir -p src/Shop/Cart/Integrations
```

Créez le répertoire et le fichier depuis la racine du projet : `mkdir -p src/Shop/Cart/Integrations`, puis créez `src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs`. Commencez par la déclaration et la règle ci-dessous, puis copiez le fichier complet. `CartEntity` est l'état reconstruit pour l'événement ; `CartEvent` est la famille d'événements déjà définie par la tranche Cart.

```haskell
data ReserveStockOnItemAdded = ReserveStockOnItemAdded

type instance EntityOf ReserveStockOnItemAdded = CartEntity

handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none

deriveOutboundIntegration ''ReserveStockOnItemAdded
```

Lorsqu'un article est ajouté, demandez à Stock de réserver la quantité demandée. Les autres événements Cart ne produisent aucune action. `Command.Emit` soumet une commande à un autre service enregistré ; il ne réalise pas d'appel HTTP externe.

Le marqueur relie `handleEvent` au mécanisme sortant. La fonction fournit toujours la règle métier ; le marqueur ne choisit pas quand le stock doit être réservé.

### Fichier d'intégration complet

Copiez tout le contenu au chemin indiqué par le fence ci-dessous, y compris les imports nécessaires aux déclarations précédentes.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs"
module Shop.Cart.Integrations.ReserveStockOnItemAdded (
  ReserveStockOnItemAdded (..),
  handleEvent,
) where

import Core
import Integration qualified
import Integration.Command qualified as Command
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Stock.Commands.ReserveStock (ReserveStock (..))


data ReserveStockOnItemAdded = ReserveStockOnItemAdded


type instance EntityOf ReserveStockOnItemAdded = CartEntity


handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none


deriveOutboundIntegration ''ReserveStockOnItemAdded
```

## Enregistrer la commande Stock et l'intégration

Le nouveau handler ne peut émettre `ReserveStock` que si le service Stock enregistre cette commande avec `InternalTransport`, comme le fait déjà le code source de la leçon Stock. Conservez aussi les commandes publiques Cart.

Conservez les enregistrements `CreateCart` et `AddItem` du service Cart. L'enregistrement de l'intégration appartient à `App.hs` ; ce n'est pas une autre commande Cart.

Si votre service Cart correspond encore à ce checkpoint Build, le fichier complet ci-dessous est le résultat. Si vous avez déjà ajouté le chapitre du timer, conservez son import et son enregistrement supplémentaires de `CreateCartInternal`.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

N'ajoutez pas `CreateCartInternal` uniquement pour ce workflow ; il est introduit dans [la leçon du timer](/fr/connect/timers/).

## Ajouter l'intégration à `App.hs`

Dans `src/App.hs`, ajoutez cet import avec les autres imports `Shop.Cart` :

```haskell
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
```

Ajoutez l'enregistrement après les services et les requêtes existants, en les conservant tous :

```haskell
  |> Application.withOutbound @ReserveStockOnItemAdded
```

Si votre fichier correspond encore au checkpoint Build, le remplacer par le résultat complet ci-dessous est le chemin le plus court. Si vous avez déjà ajouté des uploads, des timers, l'authentification ou d'autres intégrations, conservez ces imports et enregistrements et ajoutez ces deux lignes aux emplacements correspondants.

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
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
  |> Application.withOutbound @ReserveStockOnItemAdded
```

L'intégration typée reconstruit l'état Cart depuis son historique enregistré. Son enregistrement a besoin d'une valeur de départ par défaut pour `CartEntity` ; le marqueur de l'entité la fournit déjà depuis `initialState` :

```haskell
deriveEntity ''CartEntity ''CartEvent
```

Conservez cette déclaration dans `src/Shop/Cart/Entity.hs`, après `initialState`, `update` et `getEventEntityId`. Le marqueur fournit le mécanisme de l'entité ; n'ajoutez pas une seconde instance `Default` manuelle.

## Exécuter le comportement connecté

Depuis la racine du projet, arrêtez tout serveur existant avant de modifier les fichiers, puis exécutez :

```sh
neo build
neo run
```

Utilisez un autre terminal pour les demandes de [stock et passage en caisse](/fr/build/stock-and-checkout/). Créez un stock vierge avec trois unités disponibles et un panier vierge, puis ajoutez deux unités avec les identifiants renvoyés. Interrogez la requête de stock jusqu'à ce qu'elle indique une unité disponible et deux réservées. Une réponse Cart réussie ne signifie pas que la requête Stock a déjà rattrapé son retard.

Lisez aussi le résumé Cart. Son `itemCount` vaut un parce qu'il compte les entrées, même si l'ajout demandait deux unités. Stock suit les quantités unitaires. Ces vues répondent à des questions différentes sur le même workflow.

## Ajouter le test d'intégration répétable

Créez `tests/stock-reservation.hurl` depuis la racine du projet. Arrêtez `neo run` avant `neo test` ; la CLI démarre elle-même le serveur de test. Le fichier complet ci-dessous capture de nouveaux identifiants, vérifie les deux vues, refuse zéro sans modifier ces vues, puis réserve la dernière unité disponible.

```hurl
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}
HTTP/1.1 200
[Captures]
stock_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]
HTTP/1.1 200
[Captures]
cart_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":2}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":0}
HTTP/1.1 400

GET http://localhost:8080/queries/cart-summary
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1

GET http://localhost:8080/queries/stock-level
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":1}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 2

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 0
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 3
```

Exécutez `neo test` depuis `mug-shop`. Les nouvelles tentatives de requêtes attendent l'intégration et les projections asynchrones ; elles ne soumettent pas à nouveau un ajout accepté. Conservez aussi les tests plus petits de Cart et Stock : ce scénario teste le comportement connecté, tandis que les petits tests montrent quelle règle locale a échoué.

## Le cas que le parcours heureux ne tranche pas

> **Jess :** « Si le stock est indisponible, annule automatiquement l'ajout. »
>
> **Agent :** « La commande Stock refuse la réservation, donc le panier reste inchangé. »
>
> **Jess :** « L'événement Cart a déjà été accepté. Montre-moi le chemin de retour qui met à jour le panier. »

Un refus du côté Stock ne peut pas effacer un événement Cart déjà enregistré. Le handler ci-dessus fournit une direction de communication. Un workflow complet nécessite un chemin de résultat explicite, par exemple l'enregistrement de l'échec de réservation et la modification de ce que le passage en caisse autorise. Implémenter ce chemin de retour est une extension utile du projet d'exercice.

Il s'agit d'un problème de **gestionnaire de processus** : coordonner des étapes entre entités, suivre la progression et gérer le travail incomplet. Représentez explicitement le travail en attente et sa récupération. Dans cet exemple, le passage en caisse ne peut pas être considéré comme terminé simplement parce que Cart a accepté un article.

## Exercice : choisir le moment de réserver le stock

Modifiez la politique du projet d'exercice pour passer de « à l'ajout » à « à la demande de passage en caisse ». Écrivez la séquence d'événements avant de modifier le code. L'ajout au panier ne doit plus réserver le stock. Le passage en caisse doit demander une réservation une fois pour une opération métier stable. Vérifiez un stock suffisant, un stock insuffisant, les demandes en double et l'annulation pendant l'attente de la réservation. Définissez ce que voit le client dans chaque cas.

Continuez avec [les appels de fournisseurs](/fr/connect/http-and-payments/) lorsque l'étape suivante quitte votre application.

<details>
<summary>Notes sur le code source du framework</summary>

- [testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs)
- [core/service/Service/OutboundIntegration/TH.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/OutboundIntegration/TH.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/tests/scenarios/stock-reservation.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/scenarios/stock-reservation.hurl)

</details>
