---
title: Planifier un travail périodique
description: Utilisez les impulsions de timer pour demander du travail sans les confondre avec des planifications durables.
sidebar:
  order: 9
---
<!-- translation-source-sha256: b7d1f56484358a4c2ceb5fccedb2f55daa5519c02ebd35d2446b232de48cea87 -->

Certains travaux doivent se produire périodiquement : vérifier les enregistrements expirés, interroger un service ou actualiser un résumé. Un timer peut demander ce travail pendant que les règles de l'application décident de ce qui est réellement dû. Séparer ces responsabilités rend le comportement au redémarrage plus facile à comprendre.

NeoHaskell fournit une intégration de timer simple, en processus. Elle est utile pour les demandes périodiques pendant que l'application fonctionne. Ce n'est pas un ordonnanceur de tâches persistant qui se souvient de chaque exécution manquée.

Observez d'abord un timer avec votre règle de création de panier existante. Concevez ensuite l'expiration des réservations de stock : leurs échéances doivent survivre à un redémarrage même si le timer lui-même ne le fait pas.

Tous les chemins ci-dessous sont relatifs à la racine de votre projet `mug-shop`. La leçon crée trois fichiers Cart, remplace un fichier de service et ajoute un enregistrement à l'application. Les déclarations ciblées viennent d'abord ; les fichiers complets obtenus suivent chaque modification.

## Donner au timer une commande interne

Les commandes d'un timer utilisent le dispatcher d'intégration, qui n'enregistre que les commandes déclarées avec `InternalTransport`. Le `CreateCart` existant appartient à `WebTransport`. Conservez cette action publique et donnez au timer un point d'entrée séparé qui délègue à la même décision.

La délégation est le choix métier : changer la manière dont arrive la demande tout en gardant la création du panier cohérente.

```haskell
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context
```

Créez `src/Shop/Cart/Commands/CreateCartInternal.hs`. La commande n'a aucun champ et crée un nouveau panier, donc `getEntityId` renvoie `Nothing`. Son transport est interne :

```haskell
data CreateCartInternal = CreateCartInternal

getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing

type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]

deriveCommand ''CreateCartInternal
```

### Fichier complet de la commande interne

Créez le fichier au chemin nommé par le fence et copiez le fichier entier, avec son en-tête de module et ses imports.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCartInternal.hs"
module Shop.Cart.Commands.CreateCartInternal (
  CreateCartInternal (..),
  getEntityId,
  decide,
) where

import Core
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Cart.Commands.CreateCart qualified as CreateCart
import Shop.Cart.Core (CartEntity, CartEvent)


data CreateCartInternal = CreateCartInternal


getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing


decide :: CreateCartInternal -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context


type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]


deriveCommand ''CreateCartInternal
```

N'ajoutez pas les deux types de transport à `CreateCart` ; le framework refuse de mélanger les transports internes et publics sur une même commande. Cet exercice crée des paniers vides pour observation. Supprimez l'enregistrement du timer après l'avoir observé.

## Remplacer l'enregistrement du service Cart

Remplacez `src/Shop/Cart/Service.hs` par le fichier ci-dessous, ou ajoutez la dernière ligne `Service.command` à votre service Cart existant si ses deux premiers enregistrements sont inchangés :

```haskell
  |> Service.command @CreateCartInternal
```

La commande doit être enregistrée avant que le timer puisse la distribuer. Ce fichier complet est l'overlay Connect exact.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
  |> Service.command @CreateCartInternal
```

## Créer l'intégration du timer

Créez `src/Shop/Cart/Timers.hs`. Le timer transforme chaque impulsion en commande interne. La valeur de l'impulsion est volontairement ignorée : la commande est la demande de travail, pas un identifiant de planification durable.

```haskell
periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

### Fichier complet du timer

Copiez ce fichier entier au chemin indiqué dans le titre.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Timers.hs"
module Shop.Cart.Timers (periodicCartCreator) where

import Core
import Integration qualified
import Integration.Timer qualified as Timer
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal (..))


periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

## Ajouter le timer à `App.hs`

Dans `src/App.hs`, ajoutez cet import avec les autres imports Cart :

```haskell
import Shop.Cart.Timers (periodicCartCreator)
```

Ajoutez l'enregistrement après les services et requêtes existants :

```haskell
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

La fabrique `@()` n'a pas besoin de configuration applicative. Ce fichier complet poursuit les leçons sur le workflow et les uploads, en conservant leurs enregistrements tout en ajoutant le timer. Si vous avez ignoré l'une de ces fonctionnalités facultatives, omettez son import et son enregistrement ; conservez les réglages d'authentification que vous avez ajoutés.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig (..))
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Cart.Timers (periodicCartCreator)
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
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

## Lancer le timer et observer la première impulsion

Arrêtez tout serveur en cours avant de modifier les fichiers, puis exécutez depuis `mug-shop` :

```sh
neo build
neo test
neo run
```

Dans un autre terminal, interrogez `/queries/cart-summary`. Un panier vide doit apparaître après le démarrage et d'autres doivent apparaître pendant l'exécution du timer. Chacun indique zéro entrée. Arrêtez le serveur et supprimez la ligne `withInbound` ainsi que l'import `Shop.Cart.Timers` après avoir observé le comportement. Conservez les modules de commande et de timer si vous voulez que le checkpoint complet compile ; un timer non enregistré ne s'exécute pas.

`Timer.every` appelle `toCommand` avec le compteur d'impulsions **1 immédiatement au démarrage du worker**, émet cette commande, puis s'endort. Les impulsions suivantes incrémentent le compteur. Les helpers d'intervalle convertissent les secondes, minutes et heures en millisecondes.

Le compteur redémarre avec le worker. Ce n'est ni un identifiant durable, ni une séquence persistée, ni une preuve du temps écoulé sur l'horloge. Le travail et la distribution prennent aussi du temps : cette boucle n'est donc pas un ordonnanceur aligné sur le calendrier. L'application redémarre les workers entrants après les échecs signalés avec un backoff croissant ; cela ne récupère pas une file durable d'impulsions manquées. Plusieurs instances applicatives peuvent également créer plusieurs workers de timer.

## Adapter le modèle aux réservations

Dans le projet d'exercice, concevez une commande qui demande une vérification d'expiration à partir d'un état durable. Décidez comment elle trouve les réservations en attente, quelle quantité de travail elle effectue par exécution et comment la propre commande d'une réservation vérifie qu'elle est toujours éligible à l'expiration.

Le timer doit lancer ce processus ; il ne doit pas coder « l'impulsion 20 signifie que cette réservation expire ». Stockez l'échéance réelle avec la réservation ou son workflow associé. Utilisez l'horloge de l'application et les faits persistés dans la couche responsable de la décision d'éligibilité.

Rendez les vérifications d'expiration répétées inoffensives. Par exemple, une réservation déjà libérée ne doit pas restaurer le stock une seconde fois. Cette règle appartient au domaine et à ses tests, pas à l'intervalle de sommeil du timer.

## Exercice : redémarrer à mi-parcours de l'expiration

Supposez qu'une réservation expire après dix minutes et que l'application redémarre après six minutes. Expliquez ce qui arrive à la première impulsion du timer après le démarrage. Le timer demande immédiatement une vérification, mais la réservation utilise toujours son échéance originale. Vérifiez avant l'expiration, exactement à la limite choisie et après l'expiration. Répétez ensuite la commande, redémarrez le worker et exécutez deux workers sur la même réservation. Le résultat du stock doit correspondre à votre politique de gestion des doublons.

Un test de démarrage doit attendre une première commande immédiate. Un test métier contrôlé par horloge doit prouver l'expiration sans dormir dix minutes.

Lorsque votre application nécessite une planification durable, choisissez ou construisez explicitement cette capacité et reliez-la via [l'abstraction d'intégration entrante](/fr/connect/custom-integrations/). Utilisez le [déploiement](/fr/operate/deployment/) pour raisonner sur le nombre de workers et les redémarrages.

<details>
<summary>Notes sur le code source du framework</summary>

- [core/service/Integration/Timer.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Timer.hs)
- [testbed/src/Testbed/Cart/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
