---
title: "Հրամաններ և իրադարձություններ"
description: Ավելացրեք բիզնեսային գործողություն՝ հարցումները, ընդունված փաստերն ու վիճակը տարանջատված պահելով։
sidebar:
  order: 2
---
<!-- translation-source-sha256: 104b60cec22bebd56f918af33bd935d5443f2466be9360c4352e624d560d94df -->

Ծրագիրը պետք է տարբերակի որևէ մեկի խնդրածը իր ընդունածից։ Այդ տարբերակումը Ձեզ տեղ է տալիս կանոններ արտահայտելու, մերժումները բացատրելու և գործակալի իրականացումը հարցադրելու համար։

**Հրամանը** անվանում է մտադրություն։ **Իրադարձությունը** անվանում է ընդունված փաստ։ Ձեր `mug-shop` նախագծում `AddItem`-ը խնդրում է ընտրություն և քանակ, իսկ `ItemAdded`-ը գրանցում է Cart-ի ընդունած ավելացումը։ [Իրադարձության մոդելը](/hy/start/event-modeling/) այս անուններին տալիս է ընդհանուր իմաստ։

Այս էջը շարունակում է [առաջին աշխատող Cart-ը](/hy/build/first-cart/)։ Առաջին էջը ստեղծեց այդ շերտը գործարկելու համար անհրաժեշտ բոլոր սկզբնաղբյուրի ֆայլերը։ Այստեղ նույն նախագծում մեկ գործողություն ենք ավելացնում՝ ստեղծելով կամ փոխարինելով կոնկրետ ֆայլեր։ Կենտրոնացված հատվածները նախ բացատրում են որոշումները, իսկ հավաքված ֆայլերը վերջում պարունակում են իրական մոդուլի վերնագրերն ու ներմուծումները։

## Ֆայլերից առաջ ընտրեք կանոնը

`mug-shop` նախագծի արմատից դադարեցրեք `neo run`-ը, մինչ խմբագրում եք։ `src/Shop/Cart/Commands`, `src/Shop/Cart/Events` և `src/Shop/Cart/Queries` գրացուցակներն արդեն գոյություն ունեն առաջին շերտից։ Եթե այս էջին ուղղակիորեն եք հասել, ստեղծեք դրանք հետևյալով․

```sh
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Մենք կպահանջենք գոյություն ունեցող Cart և դրական քանակ։ Յուրաքանչյուր ընդունված ավելացում դառնում է մեկ գրառում, նույնիսկ երբ նույն պահեստն է կրկին ընտրվում։ Հասանելիությունն ու սեփականությունը առանձին քաղաքականություններ են, որոնք ընդգրկված են [պահեստ](/hy/build/stock-and-checkout/) և [մուտքի կառավարում](/hy/build/access-control/) էջերում։ Այս գործողությունը գրանցում է ընտրություն, բայց չի պնդում, որ պահեստն ամրագրվել է։

## 1. Նոր փաստին տվեք իր սեփական տեղը

Ստեղծեք `src/Shop/Cart/Events/ItemAdded.hs`։ Դրա բեռը պահպանում է ընդունված ավելացումը բացատրելու համար անհրաժեշտ նույնացուցիչներն ու քանակը․

```haskell
data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
```

`entityId`-ը փաստը պահում է Cart-ի հոսքում։ `stockId`-ը նույնացնում է ընտրված պահեստի գրառումը, իսկ `quantity`-ը գրանցում է հրամանի կանոնն անցած մուտքը։ Բեռի ստանդարտ իրադարձության աջակցությունը ստացեք կանոնական օգնականով․

```haskell
deriveEvent ''Event
```

Սա նոր ֆայլ է, ուստի ամբողջ բովանդակությունը ներկայացված է ստորև հավաքված ստուգակետում։

## 2. Ընդլայնեք Cart-ի իրադարձությունների բառապաշարը

Առաջին շերտի `src/Shop/Cart/Event.hs`-ն արդեն սահմանում է `CartEvent`-ը `CartCreated`-ով։ Իրադարձության այդ հայտարարությունը փոխարինեք ընդլայնված ցանկով․

```haskell
data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
```

Նույն ֆայլում խմբագրեք գոյություն ունեցող `getEventEntityId` ֆունկցիան՝ ավելացնելով նոր դեպքը․

```haskell
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId
```

Այս հայտարարություններից հետո պահեք `deriveEvent ''CartEvent`-ը։ `ItemAdded.Event`-ը բեռն է, իսկ `ItemAdded`-ը՝ տիրույթի ընդունված փաստերի ցանկի կոնստրուկտորը։ Նշիչը տրամադրում է սովորական իրադարձության աջակցությունը, մինչ անուններն ու դաշտերը մնում են Ձեր բիզնեսային մոդելը։

## 3. Պահպանեք ընտրությունը Cart-ի վիճակում

Ստեղծեք `src/Shop/Cart/Item.hs`՝ յուրաքանչյուր Cart-ի գրառման մեջ պահվող արժեքի համար․

```haskell
data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
```

Ամբողջական արժեքի տիպը տրամադրում է նաև անհրաժեշտ JSON օրինակները։ Այժմ `src/Shop/Cart/Entity.hs`-ը փոխարինեք `items` զանգված ավելացնող տարբերակով։ Դրա նոր թարմացման ճյուղը ավելացնում է մեկ գրառում․

```haskell
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

Թարմացման ֆունկցիան կիրառում է ընդունված փաստը. այն հարցում չի վավերացնում և մատակարարի հետ կապ չի հաստատում։ Ստորև հրամանը ընդունում է միայն դրական քանակներ։ `ItemAdded`-ի ցանկացած այլ արտադրող պետք է պահպանի այդ ինվարիանտը, քանի որ վերարտադրումը իրադարձությունը վերաբերվում է որպես ընդունված փաստ։

Գոյություն ունեցող `CartCreated` ճյուղը նույնպես պետք է `items`-ը սկզբնավորի `Array.empty`-ով։ Ֆայլը փոխարինելիս պահեք այդ սկզբնավորումը։

## 4. Իրականացրեք որոշումը

Ստեղծեք `src/Shop/Cart/Commands/AddItem.hs`։ Հարցումը հրամանների կատարողին ասում է, թե որ Cart-ի հոսքը բեռնել․

```haskell
getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId
```

Որոշումը մերժում է բացակայող Cart-ը, ապա ստուգում քանակը։ Նկատեք, որ իրադարձությունը պահպանում է ընդունված մուտքը․

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

Հրամանի `cartId`-ը դառնում է իրադարձության `entityId`-ը, իսկ `stockId`-ը ընտրված պահեստի նույնացուցիչն է, ոչ թե ապրանքի անունը։ Դրա տրանսպորտի հայտարարությունը հարցումը հասանելի է դարձնում վեբ տրանսպորտով։ Հրամանի նշիչը վերևում գտնվող որոշման, էության և տրանսպորտի հայտարարություններից ստեղծում է սովորական կապակցումը․

```haskell
type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

## 5. Գրանցեք գործողությունը և թարմացրեք պատասխանը

`src/Shop/Cart/Service.hs`-ը փոխարինեք երկու հրաման պարունակող գրանցմամբ։ Նոր տողը դրվում է գոյություն ունեցող `CreateCart` գրանցման կողքին․

```haskell
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

`src/Shop/Cart/Queries/CartSummary.hs`-ը փոխարինեք՝ դրա պրոյեկցիան ընթացիկ գրառումները հաշվելու համար․

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

Պահեք առաջին շերտից ստացած `src/Shop/Cart/Core.hs` և `src/App.hs` ֆայլերը։ Ծրագիրն արդեն գրանցում է Cart-ի ծառայությունն ու հարցումը. ծառայության և պրոյեկցիայի փոփոխությունը նոր հրամանը հասանելի ու տեսանելի է դարձնում։ [Հարցումների դասը](/hy/build/queries/) ավելի մանրամասն բացատրում է այս կարդալու մոդելն ու դրա ասինխրոն թարմացումը։

## Ստեղծեք Cart-ի ավելացումների ամբողջական ֆայլերը

Հետևյալ հատվածները այս ստուգակետի հավաքված ֆայլերն են։ Յուրաքանչյուր վերնագիր ճշգրիտ ուղին է `mug-shop` նախագծի արմատից։ Ստեղծեք նոր ֆայլերը և փոխարինեք վերևում նշվածները։

### `src/Shop/Cart/Events/ItemAdded.hs` — ստեղծել

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

### `src/Shop/Cart/Event.hs` — փոխարինել

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

### `src/Shop/Cart/Item.hs` — ստեղծել

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

### `src/Shop/Cart/Entity.hs` — փոխարինել

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

### `src/Shop/Cart/Commands/AddItem.hs` — ստեղծել

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

### `src/Shop/Cart/Queries/CartSummary.hs` — փոխարինել

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

### `src/Shop/Cart/Service.hs` — փոխարինել

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

Առաջին շերտի `src/App.hs`, `src/Shop/Cart/Core.hs`, `CreateCart.hs` և `Events/CartCreated.hs` ֆայլերը մնում են տեղում։ [Զամբյուղի ավելացումների արխիվը](/examples/mug-shop-cart.tar.gz) հարմար համեմատության ստուգակետ է. այս էջը պարունակում է իրականացված ավելացման համար անհրաժեշտ ֆայլերը։

## Ստուգեք նոր վարքագիծը

`mug-shop` նախագծի արմատից․

```sh
neo build
neo run
```

Ստեղծեք նոր Cart՝ [Ձեր առաջին աշխատող շերտի](/hy/build/first-cart/) հարցմամբ, ապա ներքևում `YOUR-CART-UUID`-ը փոխարինեք ստացված արժեքով։ Ֆիքսված stock UUID-ն պատկերավոր ընտրություն է, մինչև Stock-ի դասը ստեղծի իր իրական գրառումը։

```sh
curl -i http://localhost:8080/commands/add-item \
  -H 'Content-Type: application/json' \
  --data '{"cartId":"YOUR-CART-UUID","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}'
```

Սպասեք ընդունման, ապա մեկ գրառումով և `isEmpty: false` արժեքով ամփոփման։ Մեկ գրառումը պարունակում է երկու միավոր։ Ուղարկեք զրո քանակ. սպասեք HTTP 400 և `reason: "Quantity must be positive"`, մինչ ընդունված քանակը մնում է մեկը։

Տրանսպորտի հայտարարությունը, ծառայության գրանցումը և ծրագրի գրանցումը միասին հասանելի են դարձնում `/commands/add-item`-ը։ Ֆայլում գտնվող տիպը դեռ հասանելի հնարավորություն չէ։ Կարդալու մոդելին կարող է մի փոքր ժամանակ պետք լինել հասնելու համար. նորից հարցրեք, ոչ թե ավելացումը կրկին ուղարկեք։

## Վարժություն․ մեկ Cart-ի սահման

Ընտրեք վեց բաժակի սահման **յուրաքանչյուր Cart-ի համար**։ Ձեր գործակալը մերժում է վեցից ավելի հարցումները և ասում, որ աշխատանքն ավարտված է։ Ի՞նչ դեպք է բաց թողել։

<details>
<summary>Առաջարկվող հիմնավորում և ապացույց</summary>

Երկուական չորսական ավելացումները անցնում են այդ ստուգումը, բայց ընդհանուրն ութ է։ Հստակեցրեք՝ սահմանը վերաբերում է մեկ ապրանքի՞ն, թե՞ բոլոր ապրանքներին, ապա համեմատեք առկա քանակները հարցման հետ միասին։ Ստուգեք սովորական ավելացումը, ճիշտ վեցը, վեցից ավելին և վեցին հասնելուց հետո հաջորդ ավելացումը։ Մերժված գործողությունը չպետք է ստեղծի հաջողված `ItemAdded`։ Սա Ձեր նախագծած ընդլայնումն է, ոչ թե այս ֆայլերում արդեն եղած կանոն։

</details>

Հաջորդը՝ [էություններն ու վիճակը](/hy/build/entities-and-state/) բացատրում են, թե ինչպես են ընդունված փաստերը տեղեկացնում հաջորդ որոշմանը։
