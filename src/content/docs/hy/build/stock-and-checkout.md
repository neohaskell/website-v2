---
title: "Փոփոխությունների համակարգում․ պահեստ և վճարում"
description: Ավելացրեք երկրորդ տիրույթ և սահմանեք, թե դրա որոշումներն որտեղ են համակարգման կարիք ունենում։
sidebar:
  order: 5
---
<!-- translation-source-sha256: 3365d2858cbd3e34499d408fb35db1cab4fe86484c41948e1edd6f1059e483a0 -->

Մեկ ընդունված գործողությունը կարող է բերել մեկ այլ որոշման։ Ժամանակացույցի ծրագիրը կարող է հարցում ընդունել նախքան սենյակի ամրագրումը, իսկ փաստաթղթային աշխատանքային հոսքը կարող է սևագիրը պահել նախքան վերանայողի ընդունելը։ Օգտակար ծրագիրը այդ տարբերակումը տեսանելի է դարձնում։

Ձեր ուսումնական նախագիծն այժմ ստանում է **Stock**։ Զամբյուղը գրանցում է ընտրությունները, իսկ պահեստը հետևում է հասանելի և ամրագրված միավորներին։ Այստեղ կիրականացնենք ու կթեստավորենք պահեստի որոշումը, ապա այն կկապենք զամբյուղի ավելացումներին [ինտեգրման դասում](/hy/connect/workflows/)։

Ստորև օրինակները ցույց են տալիս համապատասխան հայտարարություններն ու վարքագիծը՝ յուրաքանչյուր նպատակակետը անվանելով։ Փոքր հատվածները մեկ որոշում են սովորեցնում։ Այս էջի վերջում հավաքված Stock ֆայլերը ներառում են այս ստուգակետի համար անհրաժեշտ ամբողջական մոդուլները։ [Build ֆայլերի ամբողջական արխիվը](/examples/mug-shop-build.tar.gz) լրացուցիչ է. ստուգակետը կարող եք կառուցել նույն նախագծում՝ այստեղի ֆայլերը ստեղծելով։

## Ձևակերպեք խոստումները

`InitializeStock`-ը ստեղծում է գրառում՝ ոչ բացասական հասանելի քանակով։ `ReserveStock`-ը դրական քանակ է ամրագրում միայն այն դեպքում, երբ բավարար քանակ է մնացել։ Ամրագրումը միավորները տեղափոխում է `available`-ից `reserved`։

Ապրանքի և պահեստի ID-ները տարբեր աշխատանքներ ունեն։ Ապրանքի ID-ն նույնացնում է բաժակի դիզայնը, իսկ պահեստի ID-ն՝ հասանելիության գրառումը։ Այս վարժությունում յուրաքանչյուր ապրանքի համար ինքներդ սկզբնավորեք մեկ պահեստի գրառում. հրամանը չի պարտադրում ապրանքի եզակիություն։

Ձեր նախագծի արմատից ստեղծեք մոդուլների գրացուցակները․

```sh
mkdir -p src/Shop/Stock/Commands src/Shop/Stock/Events src/Shop/Stock/Queries
```

## Յուրաքանչյուր փաստին տվեք կենտրոնացված ֆայլ

Սկզբնավորումը գրանցում է ապրանքն ու սկզբնական քանակը։ Ամրագրումը գրանցում է Cart-ին հատկացված քանակը։ Միասին դրանք կազմում են `src/Shop/Stock/Event.hs`-ի պահեստի տիրույթի իրադարձության տիպը․

```haskell
data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
```

Իրադարձության նշիչը մշակում է ստանդարտ օրինակները․

```haskell
deriveEvent ''StockEvent
```

Յուրաքանչյուր բեռ առանձին է ապրում `Events/`-ում։ `Event.hs`-ը թվարկում է հնարավոր փաստերը և նույնացնում, թե որ պահեստի հոսքի վրա է ազդում յուրաքանչյուրը։

## Կիրառեք ընդունված պատմությունը

Էությունը պահում է ընթացիկ հասանելիությունը։ Ամրագրման կիրառումը քանակը տեղափոխում է երկու հաշվարկների միջև․

```haskell
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }
```

Այդ թարմացումը պատկանում է `Entity.hs`-ին։ Այն չի հարցնում այսօրվա պահեստին՝ երեկվա ընդունված ամրագրումը ողջամի՞տ էր։ Հրամանը վավերացնում է հարցումը՝ նախքան այն փաստ դառնալը։

Ինչպես Cart-ի դեպքում, `Core.hs`-ը միայն կրկին արտահանում է տիրույթի տիպերն ու գործողությունները։ Հրաման ավելացնելը այն մեծ իրականացման ֆայլի չի վերածում։

## Սկզբնավորեք պահեստը՝ ներառելով զրոն

`src/Shop/Stock/Commands/InitializeStock.hs`-ում `InitializeStock`-ն ունի երկու մուտքային դաշտ․

```haskell
data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }
```

Հրամանը ստեղծում է պահեստի ID և մերժում է բացասական սկզբնական քանակը։ Զրոն թույլատրվում է. ապրանքը կարող է ունենալ պահեստի գրառում, երբ հասանելի ոչինչ չի մնացել։ Որոշման և էության/տրանսպորտի հայտարարությունները տեղում դնելուց հետո նշիչը միացնում է դրանք․

```haskell
deriveCommand ''InitializeStock
```

## Պաշտպանեք ամրագրումը

`ReserveStock`-ը ստուգում է գոյությունը, դրական քանակը և հասանելիությունը։ `src/Shop/Stock/Commands/ReserveStock.hs`-ի վերջնական որոշումը հարցումը համեմատում է ընթացիկ վիճակի հետ․

```haskell
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]
```

Այս հրամանն օգտագործում է `InternalTransport`։ Այն նախատեսված է ծրագրի ներքին աշխատանքի համար. հաճախորդի HTTP endpoint չենք բացահայտում։ Ինտեգրման դասը կտրամադրի դրա գործարկիչը։

[Թեստավորման դասը](/hy/build/testing/) այս որոշումն անմիջականորեն է կանչում։ Դուք կարող եք վերջին միավորի կանոնը հաստատել՝ նախքան որևէ ավտոմատացում այն գործարկելը։

## Ներկայացրեք արդյունքը և գրանցեք տիրույթը

`StockLevel`-ը ներկայացնում է ապրանքը, հասանելիությունը և ամրագրված քանակը։ Դրա ընթացիկ հանրային քաղաքականությունը հարմար է այս տեղային վարժությանը. վերանայեք, թե իրական կատալոգը ինչ պետք է բացահայտի։

Առկա ծրագրի խողովակաշարին ավելացրեք այս քայլերը՝ Cart-ի և մյուս գրանցումները պահպանելով․

```haskell
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## Որոշեք, թե ինչ է խոստանալու վճարումը

Նույնիսկ տիրույթները կապելուց հետո զամբյուղի ավելացումը կարող է ընդունվել, իսկ ավելի ուշ պահեստի ամրագրումը՝ մերժվել։ Վճարմանը պետք է դիտարկելի ամրագրման արդյունք և մասնակի ձախողման պատասխան։ Հաջորդ խոստումները նախագծեք որպես հետագա շերտեր․

| Խոստում | Դեռ անհրաժեշտ որոշում |
| --- | --- |
| Պահեստն ամրագրվել է | Ինչպե՞ս է Cart-ը իմանում՝ ամրագրումը հաջողվե՞ց։ |
| Պատվերն ընդունվել է | Ո՞ր գները, քանակները, արժույթը և առաքման մանրամասներն են ամրագրվում։ |
| Վճարումը հաստատվել է | Մատակարարի ո՞ր ապացույցն է հաստատում վճարումը՝ ներառյալ ուշացած կամ կրկնվող պատասխանները։ |
| Ամրագրումը ժամկետանց է դարձել | Ո՞ր փաստն է այն ազատում, և ժամկետի ավարտն ինչպե՞ս է փոխազդում վճարման հետ։ |

Սրանք ծրագրի քաղաքականություններ են, ոչ թե Stock կամ Cart անունով տիրույթներ անվանելու հետևանքներ։

## Հավաքեք Stock-ի ստուգակետը

Երբ որոշումները հասկանալի են, նախորդ հրամանով ստեղծեք գրացուցակները և ստորև ավելացրեք կամ փոխարինեք ֆայլերը նույն `mug-shop` նախագծում։ Պահեք արդեն ունեցած Cart-ի ֆայլերն ու `tests/Spec.hs`-ը։ Այս ստուգակետը պահում է առաջին զամբյուղի դասի ոչ կայուն տեղային պահոցը. եթե նույնականացում կամ այլ տրանսպորտի քաղաքականություն եք ավելացրել, Stock-ի ծառայության և հարցման քայլերը միացրեք առկա `app` խողովակաշարին՝ դրա փոխարեն ամբողջը չփոխարինելով։

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

Եթե ավարտել եք Cart-ի և կազմաձևման դասերը, `src/App.hs`-ը պետք է պարունակի այստեղ ցուցադրված Stock-ի ծառայության և հարցման գրանցումները։ Միայն լրացուցիչ քաղաքականություններ չունեցող ծրագրում ստեղծեք կամ փոխարինեք խողովակաշարը. հակառակ դեպքում ավելացրեք վերջին երկու քայլը՝ պահելով առկա պահոցը, տրանսպորտը և Cart-ի գրանցումները։

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

## Ստեղծեք և ուսումնասիրեք պահեստը

Այժմ նախագծի արմատից գործարկեք ստուգակետը․

```sh
neo build
neo run
```

Ստեղծեք պահեստի գրառում․

```sh
curl -i http://localhost:8080/commands/initialize-stock \
  -H 'Content-Type: application/json' \
  --data '{"productId":"11111111-1111-1111-1111-111111111111","available":3}'
```

Վերադարձված `entityId`-ը պահեք որպես պահեստի ID։ Կարդացեք դրա ներկայացումը․

```sh
curl --get http://localhost:8080/queries/stock-level \
  --data-urlencode 'q=.stockLevelId == "YOUR-STOCK-UUID"'
```

Երբ պրոյեկցիան հասնի վերջին փոփոխությանը, սպասեք երեք հասանելի և զրո ամրագրված միավոր։ Ստեղծեք Cart և այս պահեստի ID-ով ու երկու քանակով ուղարկեք `AddItem`։ Cart-ը պետք է ունենա մեկ գրառում։ **Պահեստը դեռ ունի երեք հասանելի և զրո ամրագրված միավոր**. մենք իրականացրել ենք երկու որոշումները, բայց դրանք չենք կապել։

Այդ դիտարկումը ապացույց է։ Երկու գրանցված ծառայությունը չի նշանակում, որ մեկը կանչում է մյուսին։ [Ծրագրի քայլերը միացնելիս](/hy/connect/workflows/) կապը կավելացնեք և կստուգեք՝ հասանելի է դարձել մեկը, իսկ ամրագրված՝ երկուսը։

## Պահեք կրկնելի պահեստի ստուգում

Ստորևի HTTP սցենարը պահեք որպես `tests/scenarios/stock-flow.hurl`։ Այն ստեղծում է իր գրառումը, սպասում դրա ներկայացմանը և ստուգում բացասական սկզբնական քանակի մերժումը։ `neo test`-ը գործարկելուց առաջ կանգնեցրեք `neo run`-ը։

<details>
<summary>Ամբողջական ֆայլ․ tests/scenarios/stock-flow.hurl</summary>

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

Նախագծի արմատից գործարկեք `neo test`։ Սցենարի գրանցած պահեստի ID-ն ստուգումն անկախ է պահում նախորդ գործարկումներից, իսկ հարցման կրկնությունը թույլ է տալիս պրոյեկցիային հասնել վերջին փոփոխությանը։ Այս էջը դեռ `AddItem`-ը `ReserveStock`-ի հետ չի կապում. այդ գործարկիչը ներքին ինտեգրում է, որը սովորեցնում է [Connect-ը](/hy/connect/workflows/)։

## Վարժություն․ վերջին բաժակը

Ձեր գործակալն ասում է, որ զամբյուղի հաջող հարցումը ապացուցում է՝ վերջին բաժակը հաճախորդին է պատկանում։ Բացահայտեք բացակայող ապացույցը։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Զամբյուղի հարցումը հաստատում է ընտրությունը։ Ստուգեք ամրագրման որոշումն ու դրա գրանցված արդյունքը։ Երեքից ամրագրեք երկու միավոր, երեքից չորսը մերժեք և ճիշտ երեքը ընդունեք։ Վերջին միավորի համար մրցակցող հարցումները պահանջում են ծրագրի համաժամանակյա ստուգում։ Կրկնվող հարցումներին պետք է մտածված կրկնօրինակների քաղաքականություն. ընթացիկ հրամանը կարող է կրկին ամրագրել, քանի դեռ բավարար պահեստ կա։

</details>

Հաջորդը՝ [HTTP-ն ու frontend-ները](/hy/build/http-and-frontend/) այս արդյունքները վերածում են ազնիվ միջերեսի։
