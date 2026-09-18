---
title: "Tester le comportement"
description: Écrivez des vérifications pour les décisions, l'état reconstruit et le comportement HTTP de votre propre projet.
sidebar:
  order: 7
---
<!-- translation-source-sha256: 69e400893ac5fa78dc7f5610ae62af95ffec32b6f77f5a956175b82183e26e13 -->

« Le code compile » et « cette demande respecte la règle attendue » sont deux affirmations différentes. La confiance grandit lorsque vous vérifiez chaque engagement à l'endroit où il pourrait échouer. Un test de décision rapide explique un refus ; un test HTTP vérifie que l'application en cours d'exécution expose réellement le comportement promis.

Vous êtes propriétaire des résultats attendus. Votre agent peut aider à implémenter les vérifications, à les exécuter et à expliquer un échec. Conservez des exemples que vous pouvez reconnaître : deux unités acceptées, zéro refusée et une unité acceptée à la limite.

Tous les fichiers ci-dessous appartiennent au projet `mug-shop` que vous construisez. Conservez son `tests/Spec.hs` généré ; la CLI découvre les tests et les exécute avec `neo test`.

Les exemples ci-dessous montrent les déclarations et le comportement concernés, en nommant chaque destination. Les extraits ciblés rendent la limite testée facile à voir. Les modules de test complets plus bas incluent leurs imports et helpers, afin que vous puissiez les créer directement dans le même projet. Le [bundle complet de fin des fichiers Build](/examples/mug-shop-build.tar.gz) est complémentaire.

## Faire correspondre la vérification à l'engagement

| Question | Limite utile |
| --- | --- |
| La quantité zéro est-elle rejetée ? | La décision de la commande. |
| La relecture préserve-t-elle les ajouts distincts ? | La mise à jour de l'entité. |
| Une demande renvoie-t-elle la réponse et la vue promises ? | L'application HTTP en cours d'exécution. |
| L'ajout à un panier réserve-t-il du stock ? | L'intégration et les deux domaines ; ajouté dans [Connect](/fr/connect/workflows/). |
| Le fournisseur accepte-t-il la vraie demande ? | Son sandbox ou une vérification en direct contrôlée. |

Une réponse de fournisseur simulée fournit un test local déterministe. Elle ne peut pas établir que votre compte, vos identifiants ou votre demande réelle sont acceptés.

## Tester directement une décision

Dans `tests/Decider/Cart/AddItemSpec.hs`, un test vérifie le fait accepté complet. Son corps utilise des UUID fixes et distincts pour le panier et le stock :

```haskell
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])
```

Les fichiers d'événements complets incluent le support de l'égalité pour ces assertions de payload complet. C'est distinct des instances de sérialisation et d'affichage générées par le marqueur d'événement ; les leçons conceptuelles omettent ce détail de test.

Le helper exécute une `Decision` avec un contexte capable de générer des identifiants. Il n'y a ni base de données ni serveur. Le résultat accepté est vérifié pour son type d'insertion et son payload d'événement complet : un mauvais ID de stock ou une mauvaise quantité devient donc observable.

Les deux UUID fixes sont volontairement différents, afin qu'une inversion des IDs du panier et du stock soit observable. Ces tests exercent les règles de décision, pas la génération d'UUID ni la recherche du flux. Fournir directement un état permet de tester délibérément la décision en isolation. L'exécuteur applicatif établit si une entité existe réellement.

## Vérifier la reconstruction

Dans `tests/Decider/Cart/ReplaySpec.hs`, faites passer des faits acceptés par la même fonction de mise à jour que celle utilisée par l'application :

```haskell
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

Cette vérification applique deux ajouts distincts. Elle protège le sens choisi pour une entrée. Vous pourriez aussi vérifier les quantités stockées dans chaque entrée ; une modification ultérieure visant à fusionner les produits répétés nécessite une nouvelle politique explicite et les preuves correspondantes.

## Tester une commande interne

Vous n'avez pas besoin d'exposer `ReserveStock` via HTTP pour tester sa règle. Dans `tests/Decider/Stock/ReserveStockSpec.hs`, commencez avec une unité et demandez-en deux :

```haskell
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")
```

Accepter la dernière unité et en refuser trop sont deux vérifications distinctes. Ces tests séquentiels n'établissent pas comment deux demandes simultanées se disputent la même dernière unité. Ajoutez un scénario de concurrence au niveau de l'application avant de prendre cet engagement plus fort.

## Assembler le checkpoint de test

Créez ces répertoires s'ils n'existent pas :

```sh
mkdir -p tests/Decider/Cart tests/Decider/Stock tests/scenarios
```

Les modules complets suivants peuvent être ajoutés au projet comme nouveaux fichiers. Conservez le `tests/Spec.hs` généré ; il découvre ces modules. Si un module existe déjà, remplacez-le par le fichier correspondant afin que ses imports et son contexte de helpers restent synchronisés avec les assertions.

<!-- complete-file -->
```haskell title="tests/Decider/Cart/CreateCartSpec.hs"
module Decider.Cart.CreateCartSpec (spec) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.CreateCart (CreateCart (..), decide)
import Shop.Cart.Core (CartEvent (..), initialState)
import Task qualified
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Task.yield Uuid.nil}) decision

spec :: Spec Unit
spec = describe "CreateCart" do
  it "records the generated cart and anonymous owner" \_ -> do
    result <- runDecision (decide CreateCart Nothing Auth.emptyContext)
    result |> shouldBe (AcceptCommand StreamCreation
      [CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = Uuid.toText Uuid.nil})])

  it "rejects an existing cart" \_ -> do
    result <- runDecision (decide CreateCart (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart already exists!")
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/AddItemSpec.hs"
module Decider.Cart.AddItemSpec (spec) where

import Core
import Array qualified
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Maybe qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.AddItem (AddItem (..), decide)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

cartIdFixture :: Uuid
cartIdFixture = Uuid.fromText "11111111-1111-1111-1111-111111111111" |> Maybe.getOrDie

stockIdFixture :: Uuid
stockIdFixture = Uuid.fromText "22222222-2222-2222-2222-222222222222" |> Maybe.getOrDie

spec :: Spec Unit
spec = describe "AddItem" do
  it "records the requested stock and quantity" \_ -> do
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])

  it "rejects a missing cart" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart not found!")

  it "rejects zero" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 0}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "accepts the smallest positive quantity" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 1})])
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/ReplaySpec.hs"
module Decider.Cart.ReplaySpec (spec) where

import Array qualified
import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Core (CartEntity (..), CartEvent (..), initialState, update)
import Test
import Uuid qualified

spec :: Spec Unit
spec = describe "Cart replay" do
  it "starts empty after creation" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let cart = initialState |> update created
    cart.items |> Array.length |> shouldBe 0
    cart.ownerId |> shouldBe "owner"

  it "retains separate entries for successive additions" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

<!-- complete-file -->
```haskell title="tests/Decider/Stock/ReserveStockSpec.hs"
module Decider.Stock.ReserveStockSpec (spec) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Stock.Commands.ReserveStock (ReserveStock (..), decide)
import Shop.Stock.Core (StockEntity (..), StockEvent (..), initialState)
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

request :: Int -> ReserveStock
request quantity = ReserveStock {stockId = Uuid.nil, cartId = Uuid.nil, quantity = quantity}

spec :: Spec Unit
spec = describe "ReserveStock" do
  it "accepts the last available unit" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 1) (Just stock) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [StockReserved (StockReserved.Event {entityId = Uuid.nil, quantity = 1, cartId = Uuid.nil})])

  it "rejects more units than remain" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")

  it "rejects zero quantity" \_ -> do
    result <- runDecision (decide (request 0) (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "rejects missing stock" \_ -> do
    result <- runDecision (decide (request 1) Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Stock not found!")
```

Exécutez `neo build`, puis `neo test`. Ces modules établissent les limites de décision et de relecture pures ; le fichier Hurl ci-dessus établit la limite du transport et de la projection en fonctionnement. Si vous ajoutez ensuite des règles de propriété ou de doublon, ajoutez des tests pour ces décisions au lieu de modifier un résultat attendu existant.

La vérification HTTP de la première tranche est un petit fichier séparé. Créez ou remplacez `tests/scenarios/create-cart.hurl` avec ce contenu lorsque vous voulez vérifier isolément la route de création et son résumé vide :

<!-- complete-file -->
```hurl title="tests/scenarios/create-cart.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true
```

## Exercer l'application en fonctionnement

Créez ou remplacez `tests/scenarios/cart-flow.hurl` avec ce scénario complet après avoir mis en place les modules précédents :

<details>
<summary>Fichier complet : tests/scenarios/cart-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/cart-flow.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}

HTTP 200

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":0}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Quantity must be positive"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false
```

</details>

Ce test crée son propre panier, il ne dépend donc pas des IDs d'hier. Il vérifie qu'une demande nulle refusée laisse la vue à une entrée acceptée. Les nouvelles tentatives appartiennent à la lecture : réessayer un ajout accepté pourrait l'ajouter à nouveau.

Arrêtez tout serveur `neo run`, puis exécutez depuis la racine du projet :

```sh
neo test
```

La CLI exécute vos tests Haskell et démarre l'application pour les scénarios Hurl. Un test de décision réussi avec un scénario HTTP en échec indique souvent un problème d'enregistrement, de sérialisation, de configuration ou d'intégration plutôt que de règle seule. Inspectez la limite en échec avant de modifier la logique métier.

## Conserver une régression qui explique l'erreur

Supposons que votre agent implémente une limite de six unités **par panier** en comparant chaque demande à six. Ajoutez quatre unités, puis demandez-en quatre autres. La seconde demande doit être refusée avec cette politique. Exécutez la vérification en échec avant de corriger l'implémentation et conservez-la ensuite.

Ne modifiez pas un résultat attendu uniquement pour faire réussir le test. Si la politique change, décrivez explicitement ce changement, puis mettez à jour les preuves pour correspondre au nouvel accord.

## Exercice : une réponse perdue

Le client expire après avoir demandé deux tasses. Votre agent propose de soumettre automatiquement la commande à nouveau. Quel test révélerait le risque ?

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Faites en sorte que le serveur accepte la première demande alors que la réponse est perdue. Soumettez la même demande une seconde fois et inspectez l'historique et l'état. La commande actuelle peut accepter un deuxième ajout. Décidez quel identifiant ou quelle autre politique doit distinguer une nouvelle tentative d'une autre demande intentionnelle. Testez la première soumission, une nouvelle tentative et une demande intentionnellement différente. Désactiver un bouton est un comportement d'interface utile, mais cela n'établit pas la gestion des doublons côté serveur.

</details>

Ensuite : [le contrôle d'accès](/fr/build/access-control/) applique la même approche fondée sur les preuves aux permissions.
