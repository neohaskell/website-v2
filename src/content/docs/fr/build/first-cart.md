---
title: "Votre première tranche fonctionnelle"
description: Donnez à votre propre projet une demande, un fait enregistré et une réponse utile.
sidebar:
  order: 1
---
<!-- translation-source-sha256: ee9faef1c553e39b9740cb67730af2c3f85b251152a601d0d4ff137b366cae87 -->

La plus petite tranche applicative utile relie la demande d'une personne à quelque chose qu'elle peut observer. Ici, vous allez construire cette tranche dans **votre propre projet `mug-shop`** : accepter « créer un panier », vous souvenir que cela s'est produit et afficher un résumé de panier vide.

Le panier est notre exemple d'exercice. La même forme peut servir à commencer une réservation ou une révision de document. Vous décidez ce que signifie l'action ; NeoHaskell relie la demande, l'historique, l'état et la vue.

Nous allons assembler la tranche en donnant une responsabilité à la fois. Chaque section explique l'idée avant de montrer un élément ciblé. Ensuite, lorsque toutes les décisions seront claires, la page vous donnera chaque fichier source de l'application à sa véritable destination. Vous pouvez créer le projet à la main sans télécharger d'archive ni deviner quelles définitions et quels imports manquent.

## Commencer dans votre propre projet

Terminez d'abord la [mise en route](/fr/getting-started/). Cette page a déjà créé `mug-shop` avec `neo new mug-shop`. Ouvrez un terminal dans ce projet existant :

```sh
cd mug-shop
```

Tous les chemins de cette page sont relatifs au répertoire `mug-shop`. Conservez son `neo.json`, son lanceur et sa configuration de build générée. `neo` fournit la configuration du compilateur du projet ; les fichiers applicatifs n'ont pas besoin de pragmas de langage.

Le projet généré contient un exemple Counter. Supprimez ou déplacez les fichiers applicatifs fournis avant de créer les fichiers Cart :

```sh
rm -r src/Starter tests/Decider/Counter
rm tests/Property/CounterReplaySpec.hs
rm tests/scenarios/counter-flow.hurl tests/integration/smoke.hurl
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Conservez `tests/Spec.hs` ; la [leçon sur les tests](/fr/build/testing/) ajoutera les fichiers de test Cart. Les fichiers source ci-dessous constituent la première tranche complète. Ils remplacent `src/App.hs` et créent les fichiers sous `src/Shop/Cart/`. `neo build` découvre ces fichiers source ; vous ne tenez pas de liste de modules séparée.

Le module framework nommé `Core` et la petite façade de domaine nommée `Shop.Cart.Core` ont des rôles différents. Les fichiers qui utilisent les types du framework importent `Core`. `Shop.Cart.Core` ré-exporte les types d'entité et d'événement Cart afin que les commandes et les requêtes Cart puissent partager un même import orienté domaine.

## 1. Nommer le fait à mémoriser

Commencez par le fait accepté, car c'est la réponse durable à « que s'est-il passé ? ». Le fait est **un panier a été créé**. Il a besoin de l'identifiant du panier et d'un identifiant de propriétaire. Créez `src/Shop/Cart/Events/CartCreated.hs` et commencez par cette déclaration ciblée :

```haskell
data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
```

Les champs sont les informations qui donnent son sens au fait lorsqu'il sera relu plus tard. Le marqueur demande à NeoHaskell de fournir la prise en charge courante des événements :

```haskell
deriveEvent ''Event
```

La déclaration dit ce que signifie l'événement ; le marqueur fournit les instances mécaniques et le câblage des événements. Le fichier complet apparaît plus bas, après que nous avons donné à l'événement sa place dans le modèle Cart.

## 2. Donner à l'événement Cart un foyer et une route

Créez `src/Shop/Cart/Event.hs`. Le type d'événement du domaine liste les faits qui peuvent modifier un panier. À ce premier jalon, il possède un constructeur :

```haskell
data CartEvent
  = CartCreated CartCreated.Event
```

`CartCreated.Event` est le payload du fichier précédent. `CartCreated` est le constructeur du vocabulaire d'événements du Cart. Le helper de routage renvoie l'identifiant du flux correspondant au fait :

```haskell
getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
```

Gardez `getEventEntityId` dans le module d'événement. Le fichier d'entité l'importe avant son marqueur `deriveEntity`, afin que la relecture puisse associer chaque fait au Cart qu'il modifie. Le marqueur `deriveEvent` vient après ces déclarations.

## 3. Transformer le fait en état actuel

Une entité est l'état métier actuel reconstruit à partir de ses événements acceptés. Créez `src/Shop/Cart/Entity.hs`. Pour la première tranche, un Cart n'a besoin que d'un identifiant et d'un propriétaire :

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }
```

La reconstruction commence avec un identifiant nul et un propriétaire vide, puis applique le fait de création :

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}
```

La valeur nulle initiale est un point de départ pour la relecture. Elle ne prouve pas qu'un véritable Cart existe ; un `CartCreated` accepté établit cette identité. Placez `initialState` et `update` avant `deriveEntity ''CartEntity ''CartEvent`. Vous fournissez ce comportement métier ; `deriveEntity` le relie à la relecture, au JSON, à l'état par défaut et au routage d'événements du framework.

## 4. Accepter la demande de la personne

`CreateCart` est une commande : une demande faite par quelqu'un. Elle n'a aucun champ d'entrée puisque cette application génère l'identité du Cart. Créez `src/Shop/Cart/Commands/CreateCart.hs`.

La décision refuse d'abord un flux qui possède déjà un état, puis délègue la création :

```haskell
decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context
```

Le helper génère un UUID de Cart et enregistre `CartCreated`. Lorsqu'aucune identité authentifiée n'existe, cet exercice local génère un identifiant de propriétaire anonyme. Ce libellé dans l'historique n'établit pas une session de navigateur et ne prouve pas qu'un appelant futur possède le Cart ; le [contrôle d'accès](/fr/build/access-control/) rendra cette politique explicite plus tard.

La commande déclare également l'entité et le transport qu'elle utilise. Son marqueur provient de l'import `Core` destiné au framework :

```haskell
type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

Le fichier de commande complet inclut la génération de l'UUID et les deux branches de décision.

## 5. Répondre à la question de l'écran

Un écran a besoin d'une réponse utile, pas de tout l'historique des événements. Définissez un `CartSummary` dans `src/Shop/Cart/Queries/CartSummary.hs` avec la question posée par le premier écran :

```haskell
data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }
```

À ce jalon, chaque Cart est vide, donc la première projection de la requête fixe intentionnellement `count` à zéro :

```haskell
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Il s'agit d'un modèle de lecture. Il ne décide pas si un Cart peut être créé. Sa politique d'accès public est délibérée pour cet exercice local ; les données privées d'une application nécessitent une autre politique et d'autres tests. Le marqueur de requête relie la vue à l'entité qu'elle lit :

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

Le fichier de requête complet place le marqueur avant son instance `QueryOf`, car celle-ci utilise la prise en charge `Query` générée par le marqueur.

## 6. Rendre les éléments accessibles

Le service est le registre des commandes Cart. Créez `src/Shop/Cart/Service.hs` et enregistrez `CreateCart` :

```haskell
service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

Remplacez le `src/App.hs` généré afin que l'application sélectionne son magasin d'événements, son transport web, son service Cart et sa requête Cart :

```haskell
app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

Le fichier `App.hs` complet ci-dessous fournit la configuration de l'`eventStore`. Il utilise `persistent = False`, donc un redémarrage efface l'historique de cet exercice. La [configuration](/fr/build/configuration/) et la [persistance](/fr/operate/persistence/) feront plus tard du stockage un choix explicite.

## Créer les fichiers complets de la première tranche

Les blocs suivants sont des fichiers assemblés, pas des fragments pédagogiques. Chaque titre est le chemin du fichier à créer ou à remplacer depuis la racine du projet `mug-shop`. Copiez chaque bloc tel quel.

Les fichiers d'événements complets incluent `deriving (Eq)` parce que les exemples de décideur comparent les valeurs des payloads enregistrés. Ce support de l'égalité est distinct du marqueur d'événement ; `deriveEvent` reste le helper canonique pour les instances d'événement générées par le framework.

### `src/App.hs` — remplacer l'application générée

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

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

### `src/Shop/Cart/Events/CartCreated.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/CartCreated.hs"
module Shop.Cart.Events.CartCreated (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated

data CartEvent
  = CartCreated CartCreated.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Entity.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Core.hs` — créer la façade de domaine

<!-- complete-file -->
```haskell title="src/Shop/Cart/Core.hs"
module Shop.Cart.Core (
  module Shop.Cart.Entity,
  module Shop.Cart.Event,
) where

import Shop.Cart.Entity
import Shop.Cart.Event
```

### `src/Shop/Cart/Commands/CreateCart.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCart.hs"
module Shop.Cart.Commands.CreateCart (CreateCart (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Uuid qualified

data CreateCart = CreateCart

getEntityId :: CreateCart -> Maybe Uuid
getEntityId _ = Nothing

decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context

createCart :: RequestContext -> Decision CartEvent
createCart context = do
  cartId <- Decider.generateUuid
  case context.user of
    Just user ->
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = user.sub})]
    Nothing -> do
      anonymousId <- Decider.generateUuid
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = Uuid.toText anonymousId})]

type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

### `src/Shop/Cart/Queries/CartSummary.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

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
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — créer

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

L'[archive du premier panier](/examples/mug-shop-first-cart.tar.gz) reste un checkpoint de comparaison pratique, mais elle n'est pas nécessaire pour obtenir ces fichiers. Les tests de cette archive sont introduits comme preuves écrites dans la [leçon sur les tests](/fr/build/testing/).

## Construire et envoyer une demande

Depuis la racine du projet `mug-shop` :

```sh
neo build
neo run
```

Dans un autre terminal, demandez un Cart :

```sh
curl -i http://localhost:8080/commands/create-cart \
  -H 'Content-Type: application/json' \
  --data '[]'
```

Attendez HTTP 200 et un objet JSON contenant `entityId`. Conservez cet UUID. Le corps `[]` est l'encodage de cette commande sans champs.

Lisez la vue :

```sh
curl http://localhost:8080/queries/cart-summary
```

Trouvez la ligne dont `cartSummaryId` correspond à votre `entityId`. Elle doit avoir `itemCount: 0` et `isEmpty: true`. La réponse est une page contenant `items`, `total`, `hasMore` et `effectiveLimit`.

Le modèle de lecture se met à jour de manière asynchrone. Répétez brièvement la lecture si votre ligne n'est pas encore apparue. Soumettre à nouveau la commande de création créerait un autre Cart, pas une actualisation de l'original.

## Conserver des preuves réexécutables

La [leçon sur les tests](/fr/build/testing/) ajoute une spécification unitaire pour l'événement `CartCreated` accepté et le refus d'un Cart existant, ainsi qu'un scénario HTTP qui attend le résumé vide. D'ici là, le build, la réponse du serveur et la réponse de la requête ci-dessus constituent le premier checkpoint exécutable. L'archive facultative contient ces sources de test publiques à titre de comparaison.

Vous avez créé un Cart, pas une commande acceptée. Aucun engagement de prix, de paiement ou d'exécution n'apparaît dans le modèle. Demandez à votre agent de vous montrer le fait derrière chaque affirmation proposée.

## Essayer une variation

Créez deux Carts et identifiez leurs deux résumés. Envoyez ensuite un JSON mal formé, par exemple un corps contenant seulement `{`. Que doit-il rester inchangé après cette demande refusée ?

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Deux demandes réussies doivent renvoyer des identifiants différents et obtenir des résumés vides distincts. Un JSON mal formé doit produire une erreur client sans réponse de création acceptée. Un Cart vide est une entité créée valide, distincte d'un Cart absent. Redémarrer cette application non persistante démarre un nouvel exercice.

</details>

Ensuite : [explorer votre Cart dans l'IDE visuel](/fr/getting-started/visual-ide/), en exécutant `neo ide` depuis ce même projet. Puis [ajouter une nouvelle commande](/fr/build/commands-and-events/).
