---
title: Համակարգեք աշխատանքը էությունների միջև
description: Իրադարձություններն ու հրամանները միացրեք ծառայությունների միջև՝ յուրաքանչյուր կանոն բացահայտ պահելով։
sidebar:
  order: 1
---
<!-- translation-source-sha256: 7916e17a3e9a10332cb125157f4a090af1d94900dad98769570db76df4cba7b4 -->

Մեկ ընդունված փոփոխությունը կարող է աշխատանք պահանջել ծրագրի մեկ այլ մասում։ Այդ պատասխանատվություններն առանձին պահելը յուրաքանչյուր կանոնին հստակ տեղ է տալիս, բայց ստեղծում է մի շրջան, երբ մի կողմը փոխվել է, իսկ մյուսը՝ ոչ։ Ինտեգրումը այդ փոխանցումը բացահայտ է դարձնում։

Շարունակեք Ձեր սեփական `mug-shop` գրացուցակից՝ [պահեստ և վճարում](/hy/build/stock-and-checkout/) էջից։ Cart-ի և Stock-ի ծառայություններն արդեն առանձին որոշումներ են կայացնում։ Այժմ դրանք կապեք. երկու բաժակ ավելացնելը Cart-ում գրանցում է ընտրությունը, ապա Stock-ին խնդրում է ամրագրել երկու միավոր։ Այս քաղաքականությունն ամրագրում է ավելացնելիս. վճարման պահին ամրագրելը հետագա տարբերակ է։

Ստորևի բոլոր ուղիները հարաբերական են `mug-shop` նախագծի արմատին։ Օրինակները զարգացնում են նույն նախագիծը։ Փոքր հայտարարությունները նախ բացատրում են որոշումը, իսկ յուրաքանչյուր բաժնի վերջում ամբողջական ֆայլերն են, որոնք կարող եք պատճենել։

## Որոշեք, թե ինչն է անցնում սահմանով

Փոխանցումն ունի մեկ աշխատանք՝ ընդունված `ItemAdded` իրադարձությունը պահեստի հարցման վերածել։ Կարևոր արժեքը Stock ծառայությանը ուղարկվող հրամանն է․

```haskell
ReserveStock
  { stockId = added.stockId
  , quantity = added.quantity
  , cartId = cart.cartId
  }
```

`added`-ը `ItemAdded`-ի ներսի բեռն է, իսկ `cart`-ը տրամադրում է զամբյուղի նույնացուցիչը։ Այդ արժեքը փաթեթավորեք `Command.Emit`-ով, որպեսզի ինտեգրման միջավայրը կարողանա այն առաքել։ Սա ծրագրի հրաման է, ուստի պահպանում է Stock-ի որոշումն ու մերժման կանոնները՝ դրանք շրջանցելու փոխարեն։

## Ստեղծեք ելքային ինտեգրումը

Նախագծի արմատից ստեղծեք ինտեգրման գրացուցակը․

```sh
mkdir -p src/Shop/Cart/Integrations
```

Գրացուցակն ու ֆայլը ստեղծեք նախագծի արմատից՝ `mkdir -p src/Shop/Cart/Integrations`, ապա ստեղծեք `src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs`։ Սկսեք ստորև հայտարարությունից ու կանոնից, հետո պատճենեք ամբողջական ֆայլը։ `CartEntity`-ը իրադարձության համար վերակառուցված վիճակն է, իսկ `CartEvent`-ը Cart-ի շերտի արդեն սահմանած իրադարձությունների ընտանիքն է։

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

Ապրանք ավելացնելիս խնդրեք Stock-ին ամրագրել պահանջված քանակը։ Cart-ի մյուս իրադարձությունները գործողություն չեն ստեղծում։ `Command.Emit`-ը հրամանն ուղարկում է մեկ այլ գրանցված ծառայության, բայց արտաքին HTTP կանչ չի կատարում։

Նշիչը `handleEvent`-ը կապում է ելքային մեխանիզմին։ Ֆունկցիան դեռ տրամադրում է բիզնեսային կանոնը. նշիչը չի որոշում, թե երբ պետք է պահեստ ամրագրվի։

### Ինտեգրման ամբողջական ֆայլը

Ստորև fence-ի նշած ուղում պատճենեք ամբողջ բովանդակությունը՝ ներառյալ վերևի հայտարարությունների համար անհրաժեշտ ներմուծումները։

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

## Գրանցեք Stock-ի հրամանն ու ինտեգրումը

Նոր մշակիչը կարող է `ReserveStock` արտածել միայն այն դեպքում, երբ Stock ծառայությունը այդ հրամանը գրանցում է `InternalTransport`-ով, ինչպես արդեն արել է պահեստի դասի սկզբնաղբյուրը։ Պահեք նաև Cart-ի հանրային հրամանները։

Cart-ի ծառայության `CreateCart` և `AddItem` գրանցումները պահեք։ Ինտեգրման գրանցումը պատկանում է `App.hs`-ին. այն ևս մեկ Cart հրաման չէ։

Եթե Cart-ի ծառայությունը դեռ համապատասխանում է Build-ի այդ ստուգակետին, ստորև ամբողջական ֆայլն է արդյունքը։ Եթե արդեն անցել եք ժամաչափի դասը, պահեք դրա լրացուցիչ `CreateCartInternal` ներմուծումն ու գրանցումը։

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

Մի ավելացրեք `CreateCartInternal` միայն այս աշխատանքային հոսքի համար. այն ներկայացված է [ժամաչափի դասում](/hy/connect/timers/)։

## Ինտեգրումը ավելացրեք `App.hs`-ին

`src/App.hs`-ում մյուս `Shop.Cart` ներմուծումների կողքին ավելացրեք․

```haskell
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
```

Առկա ծառայություններից և հարցումներից հետո ավելացրեք գրանցումը՝ բոլորը պահպանելով․

```haskell
  |> Application.withOutbound @ReserveStockOnItemAdded
```

Եթե ֆայլը դեռ համապատասխանում է Build-ի ստուգակետին, ամբողջական արդյունքով փոխարինելը ամենակարճ ճանապարհն է։ Եթե արդեն ավելացրել եք վերբեռնումներ, ժամաչափեր, նույնականացում կամ այլ ինտեգրումներ, պահեք դրանց ներմուծումներն ու գրանցումները և այս երկու տողն ավելացրեք համապատասխան տեղերում։

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

Տիպավորված ինտեգրումը Cart-ի վիճակը վերակառուցում է գրանցված պատմությունից։ Դրա գրանցմանը պետք է `CartEntity`-ի լռելյայն մեկնարկային արժեք. էության նշիչը այն արդեն տրամադրում է `initialState`-ից․

```haskell
deriveEntity ''CartEntity ''CartEvent
```

Այդ հայտարարությունը պահեք `src/Shop/Cart/Entity.hs`-ում՝ `initialState`, `update` և `getEventEntityId`-ից հետո։ Նշիչը տրամադրում է էության մեխանիզմը. ձեռքով երկրորդ `Default` օրինակ մի ավելացրեք։

## Գործարկեք կապված վարքագիծը

Նախքան ֆայլերը փոխելը կանգնեցրեք գործող սերվերը, ապա նախագծի արմատից գործարկեք․

```sh
neo build
neo run
```

Մեկ այլ տերմինալում օգտագործեք [պահեստ և վճարում](/hy/build/stock-and-checkout/) բաժնի հարցումները։ Ստեղծեք թարմ պահեստ՝ երեք հասանելի միավորով, և թարմ Cart, ապա դրանց վերադարձված նույնացուցիչներով ավելացրեք երկու միավոր։ Պահեստի հարցումը հարցրեք, մինչև հաղորդի մեկ հասանելի և երկու ամրագրված։ Cart-ի հաջող պատասխանը չի նշանակում, որ Stock-ի հարցումն արդեն հասել է վերջին փոփոխությանը։

Կարդացեք նաև Cart-ի ամփոփումը։ Դրա `itemCount`-ը մեկն է, քանի որ հաշվում է գրառումները, թեև ավելացումը երկու միավոր էր խնդրում։ Stock-ը հետևում է միավորների քանակին։ Այս ներկայացումները նույն աշխատանքային հոսքի մասին տարբեր հարցերի են պատասխանում։

## Ավելացրեք կրկնելի ինտեգրման թեստը

Նախագծի արմատից ստեղծեք `tests/stock-reservation.hurl`։ `neo test`-ից առաջ կանգնեցրեք `neo run`-ը. CLI-ն ինքն է սկսում թեստային սերվերը։ Ստորև ամբողջական ֆայլը վերցնում է թարմ նույնացուցիչներ, ստուգում երկու ներկայացումները, մերժում զրոն՝ առանց դրանց փոփոխության, ապա ամրագրում վերջին մնացած միավորը։

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

`mug-shop`-ից գործարկեք `neo test`։ Հարցումների կրկնությունները սպասում են ասինխրոն ինտեգրմանը և պրոյեկցիաներին. դրանք ընդունված ավելացումը կրկին չեն ուղարկում։ Պահեք Cart-ի և Stock-ի փոքր թեստերը նույնպես. այս սցենարը ստուգում է կապակցված վարքագիծը, իսկ փոքրերը ցույց են տալիս, թե որ տեղային կանոնն է ձախողվել։

## Այն դեպքը, որը հաջող ճանապարհը չի լուծում

> **Jess․** «Եթե պահեստը հասանելի չէ, ինքնաբերաբար հետ շրջեք ապրանքի ավելացումը»։
>
> **Գործակալ․** «Stock-ի հրամանը մերժում է ամրագրումը, ուստի Cart-ը չի փոխվել»։
>
> **Jess․** «Cart-ի իրադարձությունն արդեն ընդունվել է։ Ցույց տուր վերադարձի ճանապարհը, որը թարմացնում է Cart-ը»։

Stock-ի կողմում մերժումը չի կարող ջնջել արդեն գրանցված Cart-ի իրադարձությունը։ Վերևի մշակիչը հաղորդակցության մեկ ուղղությունն է տրամադրում։ Ամբողջական աշխատանքային հոսքին պետք է արդյունքի բացահայտ ճանապարհ, օրինակ՝ ամրագրման ձախողումը գրանցել և փոխել վճարման թույլատրելիությունը։ Այդ վերադարձի ճանապարհն իրականացնելը ուսումնական նախագծի օգտակար ընդլայնում է։

Սա **գործընթացի կառավարիչի** խնդիր է՝ էությունների միջև քայլերը համակարգել, առաջընթացը հետևել և թերի աշխատանքը մշակել։ Սպասող աշխատանքն ու դրա վերականգնումը ներկայացրեք բացահայտորեն։ Այս օրինակում վճարումը չի կարելի ավարտված համարել միայն այն պատճառով, որ Cart-ն ընդունել է ապրանքը։

## Վարժություն․ ընտրեք, թե երբ է պահեստն ամրագրվում

Ուսումնական նախագծի քաղաքականությունը «ավելացնելիս» փոխեք «վճարման հարցման ժամանակ»-ի։ Կոդը փոխելուց առաջ գրեք իրադարձությունների հաջորդականությունը։ Զամբյուղին ավելացնելն այլևս չպետք է պահեստ ամրագրի։ Վճարումը պետք է կայուն բիզնեսային գործողության համար մեկ անգամ ամրագրում խնդրի։ Ստուգեք բավարար պահեստը, անբավարար պահեստը, կրկնվող հարցումները և ամրագրման սպասման ընթացքում չեղարկումը։ Սահմանեք, թե ինչ է տեսնում հաճախորդը յուրաքանչյուր դեպքում։

Շարունակեք [մատակարարի կանչերով](/hy/connect/http-and-payments/), երբ հաջորդ քայլը դուրս է գալիս Ձեր ծրագրից։

<details>
<summary>Շրջանակի սկզբնաղբյուրի նշումներ</summary>

- [testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs)
- [core/service/Service/OutboundIntegration/TH.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/OutboundIntegration/TH.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/tests/scenarios/stock-reservation.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/scenarios/stock-reservation.hurl)

</details>
