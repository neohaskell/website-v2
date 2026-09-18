---
title: "Ձեր առաջին աշխատող շերտը"
description: Ձեր սեփական նախագծին տվեք մեկ հարցում, մեկ գրանցված փաստ և օգտակար պատասխան։
sidebar:
  order: 1
---
<!-- translation-source-sha256: ee9faef1c553e39b9740cb67730af2c3f85b251152a601d0d4ff137b366cae87 -->

Ամենափոքր օգտակար ծրագրային շերտը մարդու հարցումը կապում է նրա դիտարկելի արդյունքի հետ։ Այստեղ այդ շերտը կկառուցեք **Ձեր սեփական `mug-shop` նախագծում**․ կընդունեք «ստեղծել զամբյուղ» հարցումը, կհիշեք, որ դա տեղի ունեցավ, և ցույց կտաք դատարկ զամբյուղի ամփոփումը։

Զամբյուղը մեր ուսումնական օրինակն է։ Նույն ձևը կարող է սկսել ամրագրում կամ փաստաթղթի վերանայում։ Դուք եք որոշում, թե ինչ է նշանակում գործողությունը, իսկ NeoHaskell-ը կապում է հարցումը, պատմությունը, վիճակն ու ներկայացումը։

Մենք շերտը կհավաքենք մեկ պատասխանատվություն յուրաքանչյուր անգամ։ Յուրաքանչյուր բաժին նախ բացատրում է գաղափարը, հետո ցույց տալիս կենտրոնացված հատված։ Երբ բոլոր որոշումները հստակ լինեն, էջը Ձեզ կտա ծրագրի սկզբնաղբյուրի բոլոր ֆայլերը՝ դրանց իրական նպատակակետում։ Կարող եք ծրագիրը ձեռքով ստեղծել՝ առանց արխիվ ներբեռնելու կամ բացակայող հայտարարություններն ու ներմուծումները գուշակելու։

## Սկսեք Ձեր սեփական նախագծում

Նախ ավարտեք [նախնական կարգավորումը](/hy/getting-started/)։ Այդ էջն արդեն `neo new mug-shop`-ով ստեղծել է `mug-shop`-ը։ Բացեք տերմինալն այդ առկա նախագծի մեջ․

```sh
cd mug-shop
```

Այս էջի յուրաքանչյուր ուղի հարաբերական է այդ `mug-shop` գրացուցակին։ Պահեք դրա `neo.json`-ը, գործարկիչը և ստեղծված կառուցման կարգավորումը։ `neo`-ն տրամադրում է նախագծի կոմպիլյատորի կարգավորումը. ծրագրի ֆայլերին լեզվական pragma-ներ պետք չեն։

Ստեղծված նախագիծը պարունակում է Counter-ի օրինակ։ Cart-ի ֆայլերը ստեղծելուց առաջ հեռացրեք կամ տեղափոխեք տրամադրված ծրագրի ֆայլերը․

```sh
rm -r src/Starter tests/Decider/Counter
rm tests/Property/CounterReplaySpec.hs
rm tests/scenarios/counter-flow.hurl tests/integration/smoke.hurl
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Պահեք `tests/Spec.hs`-ը. [թեստավորման դասը](/hy/build/testing/) կավելացնի Cart-ի թեստային ֆայլերը։ Ստորևի սկզբնաղբյուրի ֆայլերը առաջին շերտի ամբողջական տարբերակն են։ Դրանք փոխարինում են `src/App.hs`-ը և ստեղծում են `src/Shop/Cart/`-ի տակ գտնվող ֆայլերը։ `neo build`-ը գտնում է այդ սկզբնաղբյուրի ֆայլերը. առանձին մոդուլների ցանկ չեք պահպանում։

`Core` անունով շրջանակի մոդուլը և `Shop.Cart.Core` անունով փոքր տիրույթային ճակատը տարբեր աշխատանքներ ունեն։ Շրջանակի տիպեր օգտագործող ֆայլերը ներմուծում են `Core`։ `Shop.Cart.Core`-ը կրկին արտահանում է Cart-ի էության և իրադարձության տիպերը, որպեսզի Cart-ի հրամաններն ու հարցումները կարողանան կիսել տիրույթին ուղղված մեկ ներմուծում։

## 1. Անվանեք այն փաստը, որը ցանկանում եք հիշել

Սկսեք ընդունված փաստից, քանի որ այն «ի՞նչ տեղի ունեցավ» հարցի կայուն պատասխանն է։ Փաստն է՝ **զամբյուղ է ստեղծվել**։ Դրան պետք են զամբյուղի նույնացուցիչն ու սեփականատիրոջ նույնացուցիչը։ Ստեղծեք `src/Shop/Cart/Events/CartCreated.hs` և սկսեք այս կենտրոնացված հայտարարությունից․

```haskell
data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
```

Դաշտերն այն տեղեկությունն են, որը կարդալիս ավելի ուշ փաստին իմաստ է տալիս։ Նշիչը NeoHaskell-ին ասում է տրամադրել իրադարձության սովորական աջակցությունը․

```haskell
deriveEvent ''Event
```

Հայտարարությունն ասում է, թե ինչ է նշանակում իրադարձությունը, իսկ նշիչը տրամադրում է մեխանիկական օրինակներն ու իրադարձության կապակցումը։ Ամբողջական ֆայլը երևում է ստորև՝ Cart-ի մոդելում իրադարձության տեղը անվանելուց հետո։

## 2. Cart-ի իրադարձությանը տվեք տեղ և երթուղի

Ստեղծեք `src/Shop/Cart/Event.hs`։ Տիրույթային իրադարձության տիպը թվարկում է այն փաստերը, որոնք կարող են փոխել զամբյուղը։ Այս առաջին փուլում այն ունի մեկ կոնստրուկտոր․

```haskell
data CartEvent
  = CartCreated CartCreated.Event
```

`CartCreated.Event`-ը վերևի ֆայլի բեռն է։ `CartCreated`-ը Cart-ի իրադարձությունների բառապաշարի կոնստրուկտորն է։ Երթուղավորման օգնականը վերադարձնում է փաստի հոսքի նույնացուցիչը․

```haskell
getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
```

`getEventEntityId`-ը պահեք իրադարձության մոդուլում։ Էության ֆայլը այն ներմուծում է իր `deriveEntity` նշիչից առաջ, որպեսզի վերարտադրումը կարողանա յուրաքանչյուր փաստը կապել փոխվող Cart-ի հետ։ `deriveEvent` նշիչը պետք է լինի այս հայտարարություններից հետո։

## 3. Փաստը վերածեք ընթացիկ վիճակի

Էությունը ընթացիկ բիզնեսային վիճակն է, որը վերականգնվում է ընդունված իրադարձություններից։ Ստեղծեք `src/Shop/Cart/Entity.hs`։ Առաջին շերտի համար Cart-ին պետք են միայն նույնացուցիչն ու սեփականատերը․

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }
```

Վերականգնումը սկսվում է զրոյական նույնացուցիչից և դատարկ սեփականատիրոջից, ապա կիրառում ստեղծման փաստը․

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}
```

Սկզբնական զրոյական արժեքը վերարտադրման մեկնարկային կետն է։ Դա իրական Cart-ի գոյության ապացույց չէ. ընդունված `CartCreated`-ն է հաստատում այդ ինքնությունը։ `initialState`-ն ու `update`-ը տեղադրեք `deriveEntity ''CartEntity ''CartEvent`-ից առաջ։ Դուք եք տրամադրում այս բիզնեսային վարքագիծը, իսկ `deriveEntity`-ը այն կապում է շրջանակի վերարտադրման, JSON-ի, լռելյայն վիճակի և իրադարձությունների երթուղավորման աջակցության հետ։

## 4. Ընդունեք մարդու հարցումը

`CreateCart`-ը հրաման է՝ ինչ-որ մեկի կատարած հարցումը։ Այն մուտքային դաշտեր չունի, քանի որ այս ծրագիրը ստեղծում է Cart-ի նույնացուցիչը։ Ստեղծեք `src/Shop/Cart/Commands/CreateCart.hs`։

Որոշումը նախ մերժում է արդեն վիճակ ունեցող հոսքը, ապա փոխանցում ստեղծմանը․

```haskell
decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context
```

Օգնականը ստեղծում է Cart UUID և գրանցում `CartCreated`։ Մուտք գործած ինքնության բացակայության դեպքում այս տեղային վարժությունը ստեղծում է անանուն սեփականատիրոջ նույնացուցիչ։ Պատմության մեջ այդ պիտակը չի ստեղծում զննարկչային նստաշրջան և չի ապացուցում, որ ապագա կանչողը պատկանում է Cart-ին. [մուտքի կառավարումը](/hy/build/access-control/) հետագայում այդ քաղաքականությունը բացահայտ է դարձնում։

Հրամանը նաև հայտարարում է, թե որ էությունն ու տրանսպորտն է օգտագործում։ Դրա նշիչը գալիս է շրջանակին ուղղված `Core` ներմուծումից․

```haskell
type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

Ամբողջական հրամանի ֆայլը ներառում է UUID-ի ստեղծումն ու որոշման երկու ճյուղերը։

## 5. Պատասխանեք էկրանի հարցին

Էկրանին անհրաժեշտ է օգտակար պատասխան, ոչ թե ամբողջ իրադարձությունների պատմությունը։ `src/Shop/Cart/Queries/CartSummary.hs`-ում սահմանեք `CartSummary`՝ առաջին էկրանի տված հարցով․

```haskell
data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }
```

Այս փուլում յուրաքանչյուր Cart դատարկ է, ուստի հարցման առաջին պրոյեկցիան միտումնավոր զրո է դարձնում `count`-ը․

```haskell
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Սա կարդալու մոդել է։ Այն չի որոշում՝ կարելի՞ է ստեղծել Cart։ Դրա հանրային մուտքի քաղաքականությունը միտումնավոր է այս տեղային վարժության համար. մասնավոր ծրագրի տվյալներին պետք է այլ քաղաքականություն ու թեստեր։ Հարցման նշիչը ներկայացումը կապում է կարդացվող էության հետ․

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

Ամբողջական հարցման ֆայլը նշիչը պահում է իր `QueryOf` օրինակից առաջ, քանի որ օրինակը օգտագործում է նշիչի ստեղծած `Query` աջակցությունը։

## 6. Մասերը հասանելի դարձրեք

Ծառայությունը Cart-ի հրամանների գրանցամատյանն է։ Ստեղծեք `src/Shop/Cart/Service.hs` և գրանցեք `CreateCart`-ը․

```haskell
service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

Ստեղծված `src/App.hs`-ը փոխարինեք, որպեսզի ծրագիրն ընտրի իրադարձությունների պահոցը, վեբ տրանսպորտը, Cart-ի ծառայությունն ու Cart-ի հարցումը․

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

Ստորև ամբողջական `App.hs`-ը տրամադրում է `eventStore`-ի կազմաձևումը։ Այն օգտագործում է `persistent = False`, ուստի վերագործարկումը մաքրում է այս վարժության պատմությունը։ [Կազմաձևումը](/hy/build/configuration/) և [պահպանումը](/hy/operate/persistence/) հետագայում պահեստը դարձնում են բացահայտ ընտրություն։

## Ստեղծեք առաջին շերտի ամբողջական ֆայլերը

Հետևյալ հատվածները հավաքված ֆայլեր են, ոչ թե ուսուցողական պատառիկներ։ Յուրաքանչյուր վերնագիր այն ուղին է, որը պետք է ստեղծել կամ փոխարինել `mug-shop` նախագծի արմատից։ Յուրաքանչյուր հատված պատճենեք ճիշտ այնպես, ինչպես գրված է։

Ամբողջական իրադարձությունների ֆայլերը ներառում են `deriving (Eq)`, քանի որ որոշման օրինակները համեմատում են գրանցված բեռի արժեքները։ Այդ հավասարության աջակցությունը առանձին է իրադարձության նշիչի ստեղծած սերիալիզացման և ցուցադրման օրինակներից. `deriveEvent`-ը շարունակում է մնալ շրջանակի իրադարձության օրինակների կանոնական օգնականը։

### `src/App.hs` — փոխարինել ստեղծված ծրագիրը

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

### `src/Shop/Cart/Events/CartCreated.hs` — ստեղծել

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

### `src/Shop/Cart/Event.hs` — ստեղծել

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

### `src/Shop/Cart/Entity.hs` — ստեղծել

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

### `src/Shop/Cart/Core.hs` — ստեղծել տիրույթային ճակատը

<!-- complete-file -->
```haskell title="src/Shop/Cart/Core.hs"
module Shop.Cart.Core (
  module Shop.Cart.Entity,
  module Shop.Cart.Event,
) where

import Shop.Cart.Entity
import Shop.Cart.Event
```

### `src/Shop/Cart/Commands/CreateCart.hs` — ստեղծել

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

### `src/Shop/Cart/Queries/CartSummary.hs` — ստեղծել

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

### `src/Shop/Cart/Service.hs` — ստեղծել

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

[Առաջին զամբյուղի արխիվը](/examples/mug-shop-first-cart.tar.gz) մնում է հարմար համեմատության ստուգակետ, բայց այս ֆայլերը ստանալու համար այն պետք չէ։ Այդ արխիվի թեստերը որպես հեղինակված ապացույց ներկայացվում են [թեստավորման դասում](/hy/build/testing/)։

## Կառուցեք և հարցում կատարեք

`mug-shop` նախագծի արմատից․

```sh
neo build
neo run
```

Մեկ այլ տերմինալում հարցում ուղարկեք Cart ստեղծելու համար․

```sh
curl -i http://localhost:8080/commands/create-cart \
  -H 'Content-Type: application/json' \
  --data '[]'
```

Սպասեք HTTP 200-ի և `entityId` պարունակող JSON օբյեկտի։ Պահեք այդ UUID-ն։ `[]` մարմինը այս դաշտազուրկ հրամանի կոդավորումն է։

Կարդացեք ներկայացումը․

```sh
curl http://localhost:8080/queries/cart-summary
```

Գտեք այն տողը, որի `cartSummaryId`-ը համընկնում է Ձեր `entityId`-ին։ Այն պետք է ունենա `itemCount: 0` և `isEmpty: true`։ Պատասխանը էջ է՝ `items`, `total`, `hasMore` և `effectiveLimit` դաշտերով։

Կարդալու մոդելը թարմացվում է ասինխրոն։ Եթե Ձեր տողը դեռ չի հայտնվել, կարճ ժամանակ անց կրկնեք կարդալը։ Ստեղծման հրամանը կրկին ուղարկելը ևս մեկ Cart կստեղծի, ոչ թե կթարմացնի սկզբնականը։

## Պահեք կրկին գործարկվող ապացույց

[Թեստավորման դասը](/hy/build/testing/) ավելացնում է միավորային սպեցիֆիկացիա՝ ընդունված `CartCreated` իրադարձության և արդեն գոյություն ունեցող Cart-ի մերժման համար, ինչպես նաև HTTP սցենար, որը սպասում է դատարկ ամփոփմանը։ Մինչ այդ վերևի կառուցումը, սերվերի պատասխանը և հարցման պատասխանը առաջին գործարկելի ստուգակետն են։ Ընտրովի արխիվը պարունակում է այդ հանրային թեստերի սկզբնաղբյուրը՝ համեմատության համար։

Դուք ստեղծել եք Cart, ոչ թե ընդունված պատվեր։ Մոդելում չկա գնի, վճարման կամ կատարման խոստում։ Խնդրեք գործակալին մատնանշել յուրաքանչյուր պնդման հիմքում ընկած փաստը։

## Փորձեք փոփոխություն

Ստեղծեք երկու Cart և նույնացրեք երկու ամփոփումները։ Ապա ուղարկեք սխալ JSON, օրինակ՝ միայն `{` պարունակող մարմին։ Ի՞նչը պետք է մնա անփոփոխ այդ մերժված հարցումից հետո։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Երկու հաջող հարցում պետք է վերադարձնի տարբեր ID-ներ և ստանա առանձին դատարկ ամփոփումներ։ Սխալ JSON-ը պետք է հաճախորդի սխալ վերադարձնի՝ առանց ընդունված ստեղծման պատասխանի։ Դատարկ Cart-ը վավեր ստեղծված էություն է և տարբերվում է բացակայող Cart-ից։ Այս ոչ կայուն ծրագրի վերագործարկումը սկսում է նոր վարժություն։

</details>

Հաջորդը՝ [տեսողական IDE-ում ուսումնասիրեք Ձեր Cart-ը](/hy/getting-started/visual-ide/)՝ նույն նախագծից գործարկելով `neo ide`։ Այնուհետև [ավելացրեք նոր հրաման](/hy/build/commands-and-events/)։
