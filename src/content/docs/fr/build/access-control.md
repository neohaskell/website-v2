---
title: Contrôle d'accès
description: Décidez qui peut agir, quels enregistrements chacun peut voir et comment vérifier ces limites.
sidebar:
  order: 8
---
<!-- translation-source-sha256: e3b1320bfc67c0e36c85bdbdfdef805140d4e633600619dd900940207a5facdf -->

Des personnes différentes ont besoin de droits différents dans une application. Quelqu'un peut être autorisé à consulter un enregistrement sans pouvoir le modifier, ou à gérer ses propres enregistrements sans voir ceux des autres. Ce sont des politiques applicatives avant de devenir des réglages d'authentification.

NeoHaskell fournit des mécanismes d'identité et de permission, mais votre application doit les relier et déclarer ses politiques. Nous allons nous exercer avec des clients qui doivent voir leurs propres paniers et un commerçant disposant de permissions plus larges. Votre projet `mug-shop` actuel autorise délibérément la pratique locale anonyme. Ce chapitre montre comment renforcer ces politiques lorsque vous introduirez un véritable service d'identité.

## Séparer identité et permission

L'**authentification** établit l'identité de l'appelant. L'**autorisation** décide ce que cet appelant peut faire ou voir.

Le transport web peut valider des identifiants JWT lorsque l'application câble `Application.withAuth`. Les commandes reçoivent ensuite l'identité dans `RequestContext.user`. Un `ownerId` fourni par le client n'est pas équivalent à une identité utilisateur validée.

Ajoutez cette **étape au pipeline de l'application** dans `src/App.hs` pour activer l'authentification JWT de l'application à l'aide de l'URL d'un serveur d'authentification. Le nom d'hôte d'exemple est un placeholder, pas un fournisseur fonctionnel :

```haskell
Application.withAuth @() (\_ -> "https://auth.example.com")
```

Conservez cet enregistrement lorsque les chapitres suivants étendent `App.hs`. Utilisez votre véritable service d'identité et testez sa découverte, son issuer, son audience et sa configuration de jetons. `withAuthOverrides` prend en charge les remplacements de configuration. La configuration d'identité propre au déploiement appartient à la documentation opérationnelle de votre application.

## Protéger la commande et l'enregistrement

Les commandes peuvent définir une fonction `canAccess` de niveau supérieur avant leur marqueur `deriveCommand`. Le marqueur la relie à la vérification de permission préalable à l'exécution. Sans fonction explicite, la classe de commande exige par défaut une authentification.

La permission d'utiliser une commande peut encore dépendre de l'enregistrement précis qu'elle affecte. Dans le projet d'exercice, un client authentifié ne devrait pas modifier le panier d'un autre client. Dans la fonction de décision, comparez le sujet validé avec le propriétaire enregistré du panier avant d'accepter une modification. Le `AddItem` écrit dans `src/Shop/Cart/Commands/AddItem.hs` ignore actuellement son contexte de demande.

Il existe une limite de déploiement importante : **sans `Application.withAuth`, le transport web actuel crée un contexte de commande de confiance et contourne la barrière de permission de la commande**. Déclarer simplement `canAccess` ne sécurise pas une application dont l'authentification n'est pas câblée. Les vérifications de domaine à l'intérieur de `decide` restent sous votre responsabilité.

## Vérifier le propriétaire avant d'accepter une modification

Dans `src/Shop/Cart/Commands/AddItem.hs`, remplacez `decide` et ajoutez `addForOwner` en dessous. Conservez le helper de quantité `addToCart` existant et les déclarations de types :

```haskell
decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"
```

Il s'agit d'une **variante authentifiée**, à introduire en même temps que la configuration du service d'identité. Elle modifie le contrat anonyme précédent : les tests HTTP anonymes d'origine échoueront tant que vous ne fournirez pas des identifiants de test valides et ne créerez pas les paniers sous cette identité. Conservez un checkpoint de développement avant la modification et ajoutez des tests pour le propriétaire, l'autre utilisateur et l'utilisateur absent, au lieu d'affaiblir silencieusement la nouvelle règle.

`CreateCart` enregistre déjà `context.user.sub` pour un appelant connecté. Les paniers créés anonymement dans les exercices précédents n'appartiennent pas automatiquement à un nouvel utilisateur connecté. Utilisez de nouveaux paniers authentifiés pour vérifier cette variante ; un transfert invité-vers-compte nécessite sa propre conception explicite.

## Protéger la vue séparément

Les requêtes nécessitent deux politiques. `canAccess` décide si l'appelant peut utiliser le type de requête ; `canView` décide si une ligne précise est visible.

Ce **remplacement des politiques de CartSummary** utilise la véritable API de helpers. Il suppose que `CartSummary` conserve son champ `ownerId :: Text` ; `AccessControl` fournit le helper de propriété :

```haskell
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)
```

Placez ces définitions avant `deriveQuery`. `ownerOnly` compare le propriétaire de la ligne au claim `sub` validé. L'endpoint exclut les lignes qui échouent à `canView` ; il calcule les totaux de pagination après autorisation et filtrage. Un utilisateur qui peut accéder à la requête mais ne possède aucun panier correspondant reçoit un ensemble de résultats vide, pas les informations d'un autre client.

Votre CartSummary initial utilise `publicAccess` et `publicView`. Cela peut convenir à un catalogue de produits, mais faites un choix délibéré avant de l'appliquer à des données client. D'autres helpers incluent `requirePermission`, `requireAnyPermission`, `requireAllPermissions` et `tenantOnly`.

## Concevoir explicitement les paniers invités

`CreateCart` enregistre le sujet authentifié lorsqu'il est disponible ; sinon, il génère un identifiant de propriétaire anonyme. Cet identifiant généré ne devient pas automatiquement une session de navigateur sécurisée et ne donne pas la propriété à un utilisateur connecté ultérieurement.

Si vous ajoutez un passage en caisse invité au projet d'exercice, décidez comment un invité prouve son accès à son panier et comment la propriété change après la connexion. La même question de conception se pose chaque fois qu'un travail anonyme doit ensuite appartenir à un utilisateur authentifié. Modélisez et testez cette transition. Ne la résolvez pas en acceptant un identifiant de propriétaire arbitraire dans le corps de la demande.

## Assembler la variante authentifiée

Une fois le service d'identité choisi, remplacez les fichiers de commande et de requête ci-dessous par ces versions complètes. Elles assemblent les vérifications de propriétaire expliquées plus haut. Il s'agit d'une branche optionnelle du projet d'exercice anonyme : ses tests doivent fournir des identités authentifiées. Conservez votre checkpoint précédent si vous ne configurez pas encore l'authentification.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"

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
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)

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

Enfin, remplacez `src/App.hs` par le câblage d'authentification assemblé ci-dessous, en substituant l'URL de votre service d'identité à `https://auth.example.com`. Ce nom d'hôte est un placeholder. Si vous avez déjà étendu votre application, conservez ces ajouts et insérez `withAuth` après l'enregistrement du transport.

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
  |> Application.withAuth @() (\_ -> "https://auth.example.com")
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

Après avoir configuré le véritable fournisseur, exécutez `neo build`. Mettez à jour les tests de décision avec des contextes de demande connectés et les tests HTTP avec des identifiants valides avant d'exécuter `neo test` ; les attentes de réussite anonymes précédentes ne s'appliquent plus. Vérifiez le propriétaire, un autre utilisateur, les identifiants absents et les jetons invalides. Ces fichiers complets assemblent la politique applicative ; la configuration du fournisseur et la vérification avec identifiants restent à votre charge pour adopter cette branche optionnelle.

## Exercice : le panier d'un autre client

Créez un plan de test pour le projet d'exercice avec deux clients et un commerçant. Que devrait pouvoir lire et modifier chacun ? Incluez une demande sans identifiants et une autre avec un jeton invalide.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Le propriétaire doit pouvoir lire son panier et effectuer les modifications autorisées. L'autre client ne doit ni voir sa ligne ni la modifier avec succès. L'accès du commerçant dépend de votre politique explicite de permissions, pas du seul fait d'être connecté. Des identifiants absents doivent faire échouer une requête authentifiée ; un jeton invalide doit être rejeté par le transport. Exercez la véritable configuration web authentifiée en plus des tests unitaires : un test unitaire ne peut pas détecter que la production a oublié de câbler l'authentification.

</details>

Ensuite : la [configuration](/fr/build/configuration/) rend ces choix de déploiement explicites.

Sources publiques : [helpers d'accès](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/AccessControl.hs), [contexte de requête](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Auth.hs), [valeurs par défaut des commandes](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Command/Core.hs), [endpoint de requête](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Endpoint.hs), [distribution de l'authentification web](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs).

La connexion d'un compte externe est distincte de la connexion à votre application. Consultez [les comptes fournisseurs et le consentement](/fr/connect/provider-accounts/) pour ce workflow.
