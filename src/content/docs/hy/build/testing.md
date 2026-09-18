---
title: "Թեստավորեք վարքագիծը"
description: Գրեք ստուգումներ Ձեր ծրագրի որոշումների, վերակառուցված վիճակի և HTTP վարքագծի համար։
sidebar:
  order: 7
---
<!-- translation-source-sha256: 69e400893ac5fa78dc7f5610ae62af95ffec32b6f77f5a956175b82183e26e13 -->

«Կոդը կոմպիլյացվում է» և «այս հարցումը հետևում է նախատեսված կանոնին» տարբեր պնդումներ են։ Վստահությունն աճում է, երբ յուրաքանչյուր խոստում ստուգում եք այն տեղում, որտեղ այն կարող է ձախողվել։ Արագ որոշման թեստը բացատրում է մերժումը, իսկ HTTP թեստը ստուգում է, որ գործող ծրագիրն իրականում տրամադրում է խոստացված վարքագիծը։

Դուք եք տիրապետում նախատեսված արդյունքներին։ Ձեր գործակալը կարող է օգնել իրականացնել ստուգումները, գործարկել դրանք և բացատրել ձախողումը։ Պահեք ճանաչելի օրինակներ՝ երկու միավոր ընդունված, զրո մերժված և սահմանին մեկ միավոր ընդունված։

Ստորևի բոլոր ֆայլերը պատկանում են Ձեր կառուցած `mug-shop` նախագծին։ Պահեք դրա ստեղծված `tests/Spec.hs`-ը. CLI-ն հայտնաբերում է թեստերը և դրանք գործարկում `neo test`-ով։

Ստորև օրինակները ցույց են տալիս համապատասխան հայտարարություններն ու վարքագիծը՝ յուրաքանչյուր նպատակակետը անվանելով։ Կենտրոնացված հատվածները հեշտացնում են տեսնել թեստավորվող սահմանը։ Այս էջի վերջում ամբողջական թեստային մոդուլները ներառում են իրենց ներմուծումներն ու օգնականները, այնպես որ կարող եք դրանք անմիջապես ստեղծել նույն նախագծում։ [Build ֆայլերի ամբողջական արխիվը](/examples/mug-shop-build.tar.gz) լրացուցիչ է։

## Ստուգումը համապատասխանեցրեք խոստմանը

| Հարց | Օգտակար սահման |
| --- | --- |
| Զրո քանակը մերժվո՞ւմ է։ | Հրամանի որոշումը։ |
| Վերարտադրումը պահպանո՞ւմ է առանձին ավելացումները։ | Էության թարմացումը։ |
| Հարցումը վերադարձնո՞ւմ է խոստացված պատասխանը և ներկայացումը։ | Գործող HTTP ծրագիրը։ |
| Զամբյուղին ավելացնելը պահեստ ամրագրո՞ւմ է։ | Ինտեգրումը և երկու տիրույթները. ավելացվում է [Connect](/hy/connect/workflows/)-ում։ |
| Մատակարարն ընդունո՞ւմ է իրական հարցումը։ | Դրա sandbox-ը կամ վերահսկվող կենդանի ստուգումը։ |

Կեղծ մատակարարի պատասխանը տալիս է դետերմինիստիկ տեղային թեստ։ Այն չի կարող հաստատել, որ Ձեր հաշիվը, հավատարմագրերը կամ կենդանի հարցումն ընդունված են։

## Անմիջականորեն թեստավորեք որոշումը

`tests/Decider/Cart/AddItemSpec.hs`-ում մեկ թեստ ստուգում է ամբողջական ընդունված փաստը։ Դրա մարմինը օգտագործում է տարբեր, ֆիքսված Cart-ի և պահեստի UUID-ներ․

```haskell
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])
```

Ամբողջական իրադարձության ֆայլերը ներառում են հավասարության աջակցություն բեռի ամբողջական պնդումների համար։ Դա առանձին է իրադարձության նշիչի ստեղծած սերիալիզացման և ցուցադրման օրինակներից. հայեցակարգային դասերը այս թեստավորման մանրուքը բաց են թողնում։

Օգնականը գործարկում է `Decision`-ը ID-ներ ստեղծող համատեքստով։ Տվյալների բազա կամ սերվեր չկա։ Ընդունված արդյունքը ստուգվում է իր տեղադրման տիպի և ամբողջական իրադարձության բեռի համար, այնպես որ սխալ պահեստի ID-ն կամ քանակը տեսանելի են դառնում։

Երկու ֆիքսված UUID-ները միտումնավոր տարբեր են, որպեսզի Cart-ի ու պահեստի ID-ների փոխանակումը տեսանելի լինի։ Այս թեստերը ստուգում են որոշման կանոնները, ոչ թե UUID-ի ստեղծումը կամ հոսքի որոնումը։ Վիճակն ուղղակիորեն տրամադրելը միտումնավոր թեստավորում է որոշումն առանձնացված վիճակում։ Ծրագրի կատարողն է հաստատում, թե էությունն իրականում գոյություն ունի։

## Ստուգեք վերակառուցումը

`tests/Decider/Cart/ReplaySpec.hs`-ում ընդունված փաստերը փոխանցեք ծրագրի օգտագործած նույն թարմացման ֆունկցիային․

```haskell
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

Այս ստուգումը կիրառում է երկու առանձին ավելացում։ Այն պաշտպանում է գրառման ընտրված իմաստը։ Կարող եք նաև ստուգել յուրաքանչյուր գրառման մեջ պահվող քանակները. կրկնվող ապրանքները միավորելու հետագա փոփոխությունը պահանջում է նոր բացահայտ քաղաքականություն և համապատասխան ապացույց։

## Ներքին հրաման թեստավորեք

`ReserveStock`-ը HTTP-ով բացահայտելու կարիք չկա՝ դրա կանոնը թեստավորելու համար։ `tests/Decider/Stock/ReserveStockSpec.hs`-ում սկսեք մեկ միավորից և խնդրեք երկու․

```haskell
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")
```

Վերջին միավորն ընդունելն ու չափից շատը մերժելը տարբեր ստուգումներ են։ Այս հաջորդական թեստերը չեն հաստատում, թե ինչպես են երկու միաժամանակյա հարցումները մրցում նույն վերջին միավորի համար։ Այդ ավելի ուժեղ խոստումից առաջ ավելացրեք ծրագրի մակարդակի համաժամանակության սցենար։

## Հավաքեք թեստավորման ստուգակետը

Ստեղծեք այս գրացուցակները, եթե դեռ չկան․

```sh
mkdir -p tests/Decider/Cart tests/Decider/Stock tests/scenarios
```

Հետևյալ ամբողջական մոդուլները կարող եք ավելացնել ծրագրում որպես նոր ֆայլեր։ Պահեք ստեղծված `tests/Spec.hs`-ը. այն գտնում է այս մոդուլները։ Եթե մոդուլն արդեն կա, փոխարինեք համապատասխան ֆայլով, որպեսզի ներմուծումներն ու օգնականի համատեքստը համապատասխանեն պնդումներին։

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

Գործարկեք `neo build`, ապա `neo test`։ Այս մոդուլները հաստատում են մաքուր որոշման և վերարտադրման սահմանները, իսկ վերևի Hurl ֆայլը՝ գործող տրանսպորտի ու պրոյեկցիայի սահմանը։ Եթե հետագայում ավելացնեք սեփականության կամ կրկնօրինակ հարցման կանոններ, այդ որոշումների համար ավելացրեք թեստեր՝ առկա ակնկալիքը նոր իրականացմանը համապատասխանեցնելու փոխարեն։

Առաջին շերտի HTTP ստուգումը առանձին փոքր ֆայլ է։ Ստեղծեք կամ փոխարինեք `tests/scenarios/create-cart.hurl`-ը այս բովանդակությամբ, երբ ցանկանում եք առանձին ստուգել ստեղծման երթուղին և դրա դատարկ ամփոփումը․

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

## Թեստավորեք գործող ծրագիրը

Վերևի մոդուլները տեղադրելուց հետո ստեղծեք կամ փոխարինեք `tests/scenarios/cart-flow.hurl`-ը այս ամբողջական սցենարով․

<details>
<summary>Ամբողջական ֆայլ․ tests/scenarios/cart-flow.hurl</summary>

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

Այս թեստը ստեղծում է իր զամբյուղը, ուստի կախված չէ երեկվա ID-ներից։ Այն ստուգում է, որ մերժված զրո հարցումը ներկայացումը թողնում է մեկ ընդունված գրառման վրա։ Կրկնությունները վերաբերում են կարդալուն. ընդունված ավելացումը կրկնելը կարող է այն նորից ավելացնել։

Ցանկացած `neo run` սերվեր կանգնեցրեք, ապա նախագծի արմատից գործարկեք․

```sh
neo test
```

CLI-ն գործարկում է Ձեր Haskell թեստերը և Hurl սցենարների համար սկսում ծրագիրը։ Անցած որոշման թեստով ձախողված HTTP սցենարը հաճախ մատնանշում է գրանցման, սերիալիզացման, կազմաձևման կամ ինտեգրման խնդիր, ոչ թե միայն կանոնը։ Նախքան բիզնեսային տրամաբանությունը փոխելը ուսումնասիրեք ձախողված սահմանը։

## Պահեք սխալը բացատրող ռեգրեսիա

Ենթադրենք՝ գործակալը վեց միավորի **Cart-ի** սահմանն իրականացնում է՝ յուրաքանչյուր հարցում համեմատելով վեցի հետ։ Ավելացրեք չորս, ապա ևս չորս խնդրեք։ Այդ քաղաքականությամբ երկրորդ հարցումը պետք է մերժվի։ Ուղղելուց առաջ գործարկեք ձախողված ստուգումը և հետո պահեք այն։

Մի փոխեք սպասվող արդյունքը միայն թեստն անցնելու համար։ Եթե քաղաքականությունը փոխվում է, այդ փոփոխությունը բացահայտ նկարագրեք, ապա ապացույցը համապատասխանեցրեք նոր համաձայնությանը։

## Վարժություն․ կորած պատասխան

Հաճախորդը ժամանակի ավարտ է ստանում երկու բաժակ խնդրելուց հետո։ Ձեր գործակալն առաջարկում է հրամանը ինքնաբերաբար կրկին ուղարկել։ Ո՞ր թեստը կբացահայտի ռիսկը։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Կազմակերպեք այնպես, որ սերվերն ընդունի առաջին հարցումը, բայց պատասխանը կորչի։ Նույն հարցումը կրկին ուղարկեք և ուսումնասիրեք պատմությունն ու վիճակը։ Ընթացիկ հրամանը կարող է ընդունել երկրորդ ավելացումը։ Որոշեք, թե որ նույնացուցիչը կամ այլ քաղաքականությունն է տարբերելու կրկնությունը մեկ այլ դիտավորյալ հարցումից։ Թեստավորեք առաջին ուղարկումը, կրկնությունը և միտումնավոր այլ հարցումը։ Կոճակն անջատելը օգտակար միջերեսային վարքագիծ է, բայց սերվերի կողմի կրկնօրինակների կառավարում չի հաստատում։

</details>

Հաջորդը՝ [մուտքի կառավարումը](/hy/build/access-control/) նույն ապացույցի վրա հիմնված մոտեցումը կիրառում է թույլտվությունների նկատմամբ։
