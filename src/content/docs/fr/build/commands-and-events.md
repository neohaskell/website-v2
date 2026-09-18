---
title: "Commandes et événements"
description: Ajoutez une action métier tout en séparant les demandes, les faits acceptés et l'état.
sidebar:
  order: 2
---
<!-- translation-source-sha256: 104b60cec22bebd56f918af33bd935d5443f2466be9360c4352e624d560d94df -->

Une application doit distinguer ce que quelqu'un a demandé de ce qu'elle a accepté. Cette distinction vous donne un endroit où exprimer les règles, expliquer les refus et questionner l'implémentation d'un agent.

Une **commande** nomme une intention. Un **événement** nomme un fait accepté. Dans votre projet `mug-shop`, `AddItem` demande une sélection et une quantité ; `ItemAdded` enregistre un ajout que le Cart a accepté. Le [modèle d'événements](/fr/start/event-modeling/) donne à ces noms un sens partagé.

Cette page poursuit le Cart fonctionnel de [votre première tranche fonctionnelle](/fr/build/first-cart/). La première page a créé tous les fichiers source nécessaires à l'exécution de cette tranche. Ici, nous ajoutons une action en créant ou en remplaçant certains fichiers dans ce même projet. Les extraits ciblés expliquent d'abord les décisions ; les fichiers assemblés plus loin contiennent les véritables en-têtes de modules et imports.

## Choisir la règle avant les fichiers

Depuis la racine du projet `mug-shop`, arrêtez `neo run` pendant vos modifications. Les répertoires sous `src/Shop/Cart/Commands`, `src/Shop/Cart/Events` et `src/Shop/Cart/Queries` existent déjà depuis la première tranche. Si vous arrivez directement sur cette page, créez-les avec :

```sh
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Nous exigerons un Cart existant et une quantité positive. Chaque ajout accepté devient une entrée, même si le même stock est sélectionné à nouveau. La disponibilité et la propriété sont des politiques distinctes, traitées dans [stock](/fr/build/stock-and-checkout/) et [contrôle d'accès](/fr/build/access-control/). Cette action enregistre une sélection ; elle ne prétend pas que le stock a été réservé.

## 1. Donner au nouveau fait son propre fichier

Créez `src/Shop/Cart/Events/ItemAdded.hs`. Son payload conserve les identifiants et la quantité nécessaires pour expliquer l'ajout accepté :

```haskell
data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
```

`entityId` maintient le fait dans le flux du Cart. `stockId` identifie l'enregistrement de stock sélectionné et `quantity` enregistre l'entrée qui a satisfait la règle de la commande. Dérivez la prise en charge standard du payload d'événement avec le helper canonique :

```haskell
deriveEvent ''Event
```

Il s'agit d'un nouveau fichier ; son contenu complet apparaît donc dans le checkpoint assemblé ci-dessous.

## 2. Étendre le vocabulaire d'événements du Cart

Le `src/Shop/Cart/Event.hs` de la première tranche définit déjà `CartEvent` avec `CartCreated`. Remplacez la déclaration de l'événement par la liste étendue :

```haskell
data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
```

Modifiez la fonction `getEventEntityId` existante dans le même fichier en ajoutant le nouveau cas :

```haskell
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId
```

Conservez `deriveEvent ''CartEvent` après ces déclarations. `ItemAdded.Event` est le payload ; `ItemAdded` est son constructeur dans la liste des faits acceptés du domaine. Le marqueur fournit la prise en charge courante des événements, tandis que les noms et les champs restent votre modèle métier.

## 3. Conserver la sélection dans l'état du Cart

Créez `src/Shop/Cart/Item.hs` pour la valeur stockée dans chaque entrée du Cart :

```haskell
data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
```

Le type de valeur complet fournit également les instances JSON nécessaires. Remplacez maintenant `src/Shop/Cart/Entity.hs` par la version qui ajoute un tableau `items`. Sa nouvelle branche de mise à jour ajoute une entrée :

```haskell
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

La fonction de mise à jour applique un fait accepté ; elle ne valide pas une demande et ne contacte pas un fournisseur. La commande ci-dessous n'admet que les quantités positives. Tout autre producteur de `ItemAdded` doit préserver cet invariant, car la relecture traite l'événement comme un fait accepté.

La branche `CartCreated` existante doit également initialiser `items` avec `Array.empty`. Conservez cette initialisation lorsque vous remplacez le fichier.

## 4. Implémenter la décision

Créez `src/Shop/Cart/Commands/AddItem.hs`. La demande indique à l'exécuteur de commandes quel flux Cart charger :

```haskell
getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId
```

La décision refuse un Cart absent, puis vérifie la quantité. Remarquez que l'événement conserve la valeur acceptée :

```haskell
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]
```

Le `cartId` de la commande devient l'`entityId` de l'événement ; `stockId` est l'identifiant du stock sélectionné, pas un nom de produit. Sa déclaration de transport expose la demande via le transport web. Le marqueur de commande génère le câblage courant à partir des déclarations de décision, d'entité et de transport qui le précèdent :

```haskell
type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

## 5. Enregistrer l'action et actualiser la réponse

Remplacez `src/Shop/Cart/Service.hs` par un registre contenant les deux commandes. La nouvelle ligne vient à côté de l'enregistrement existant de `CreateCart` :

```haskell
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

Remplacez `src/Shop/Cart/Queries/CartSummary.hs` afin que sa projection compte les entrées actuelles :

```haskell
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Conservez `src/Shop/Cart/Core.hs` et `src/App.hs` de la première tranche. L'application enregistre déjà le service et la requête Cart ; modifier le service et la projection rend la nouvelle commande accessible et visible. La [leçon sur les requêtes](/fr/build/queries/) explique plus en détail ce modèle de lecture et sa mise à jour asynchrone.

## Créer les fichiers complets des ajouts au Cart

Les blocs suivants sont les fichiers assemblés de ce checkpoint. Chaque titre est le chemin exact relatif à la racine du projet `mug-shop`. Créez les nouveaux fichiers et remplacez ceux indiqués plus haut.

### `src/Shop/Cart/Events/ItemAdded.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/ItemAdded.hs"
module Shop.Cart.Events.ItemAdded (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — remplacer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Item.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Item.hs"
module Shop.Cart.Item (CartItem (..)) where

import Core
import Json qualified

data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
  deriving (Generic)

instance Json.FromJSON CartItem
instance Json.ToJSON CartItem
```

### `src/Shop/Cart/Entity.hs` — remplacer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified
import Array qualified
import Shop.Cart.Item (CartItem (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}

update :: CartEvent -> CartEntity -> CartEntity
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Commands/AddItem.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart :: AddItem -> CartEntity -> Decision CartEvent
addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]

type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

### `src/Shop/Cart/Queries/CartSummary.hs` — remplacer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

import Array qualified
import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Cart.Core (CartEntity (..))

data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }

canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.publicAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.publicView

deriveQuery ''CartSummary [''CartEntity]

instance QueryOf CartEntity CartSummary where
  queryId cart = cart.cartId
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — remplacer

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

Le `src/App.hs`, `src/Shop/Cart/Core.hs`, `CreateCart.hs` et `Events/CartCreated.hs` de la première tranche restent en place. L'[archive des ajouts au panier](/examples/mug-shop-cart.tar.gz) constitue un checkpoint de comparaison pratique ; cette page contient les fichiers nécessaires à l'ajout implémenté.

## Vérifier le nouveau comportement

Depuis la racine du projet `mug-shop` :

```sh
neo build
neo run
```

Créez un nouveau Cart avec la demande de [votre première tranche fonctionnelle](/fr/build/first-cart/), puis remplacez `YOUR-CART-UUID` ci-dessous. L'UUID de stock fixe est une sélection illustrative jusqu'à ce que la leçon Stock crée son véritable enregistrement.

```sh
curl -i http://localhost:8080/commands/add-item \
  -H 'Content-Type: application/json' \
  --data '{"cartId":"YOUR-CART-UUID","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}'
```

Attendez une acceptation, puis un résumé avec une entrée et `isEmpty: false`. Une entrée contient deux unités. Envoyez la quantité zéro : attendez HTTP 400 avec `reason: "Quantity must be positive"`, tandis que le compteur accepté reste à un.

La déclaration de transport, l'enregistrement du service et l'enregistrement de l'application exposent ensemble `/commands/add-item`. Un type présent dans un fichier n'est pas encore une fonctionnalité accessible. Le modèle de lecture peut mettre un court moment à rattraper son retard ; interrogez à nouveau plutôt que de soumettre l'ajout deux fois.

## Exercice : une limite par Cart

Choisissez une limite de six tasses **par Cart**. Votre agent refuse les demandes au-delà de six et affirme que le travail est terminé. Quel cas a-t-il oublié ?

<details>
<summary>Raisonnement et preuves suggérés</summary>

Deux ajouts de quatre passent ce contrôle mais totalisent huit. Précisez si la limite concerne un seul produit ou tous les produits, puis comparez les quantités existantes et la demande. Vérifiez un ajout normal, exactement six, plus de six et un autre ajout après avoir atteint six. Une opération refusée ne doit pas produire un `ItemAdded` réussi. Il s'agit d'une extension que vous concevez, pas d'une règle déjà présente dans ces fichiers.

</details>

Ensuite : [les entités et l'état](/fr/build/entities-and-state/) expliquent comment les faits acceptés éclairent la décision suivante.
