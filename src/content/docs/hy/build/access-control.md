---
title: Մուտքի կառավարում
description: Որոշեք, թե ով կարող է գործել, որ գրառումներն է կարող տեսնել և ինչպես ստուգել այդ սահմանները։
sidebar:
  order: 8
---
<!-- translation-source-sha256: e3b1320bfc67c0e36c85bdbdfdef805140d4e633600619dd900940207a5facdf -->

Տարբեր մարդիկ ծրագրից տարբեր մուտք են պահանջում։ Ինչ-որ մեկին կարող է թույլատրվել գրառում դիտել, բայց ոչ փոխել այն, կամ կառավարել միայն իր գրառումները՝ չտեսնելով ուրիշներինը։ Սրանք ծրագրի քաղաքականություններ են, նախքան նույնականացման կարգավորումներ դառնալը։

NeoHaskell-ը տրամադրում է ինքնության և թույլտվության մեխանիզմներ, բայց Ձեր ծրագիրը պետք է դրանք միացնի և հայտարարի իր քաղաքականությունները։ Մենք կվարժվենք այն հաճախորդներով, որոնք պետք է տեսնեն իրենց զամբյուղները, և ավելի լայն թույլտվություններով վաճառողով։ Ձեր ընթացիկ `mug-shop` նախագիծը միտումնավոր թույլ է տալիս անանուն տեղային վարժանք։ Այս գլուխը ցույց է տալիս, թե ինչպես խստացնել այդ քաղաքականությունները, երբ իրական ինքնության ծառայություն եք ավելացնում։

## Տարբերեք ինքնությունը թույլտվությունից

**Նույնականացումը** հաստատում է, թե ով է կանչողը։ **Լիազորումը** որոշում է, թե այդ կանչողն ինչ կարող է անել կամ տեսնել։

Վեբ տրանսպորտը կարող է վավերացնել JWT հավատարմագրերը, երբ ծրագիրը միացնում է `Application.withAuth`-ը։ Հրամանները ստացված ինքնությունը ստանում են `RequestContext.user`-ում։ Հաճախորդի տրամադրած `ownerId`-ը նույնը չէ, ինչ վավերացված օգտատիրոջ ինքնությունը։

Ավելացրեք այս **ծրագրի խողովակաշարի քայլը** `src/App.hs`-ում՝ auth սերվերի URL-ով ծրագրի JWT նույնականացումը միացնելու համար։ Օրինակի հոսթի անունը տեղապահ է, ոչ թե աշխատող մատակարար․

```haskell
Application.withAuth @() (\_ -> "https://auth.example.com")
```

Պահեք այս գրանցումը, երբ հետագա գլուխները ընդլայնեն `App.hs`-ը։ Օգտագործեք Ձեր իրական ինքնության ծառայությունը և թեստավորեք դրա discovery-ն, issuer-ը, audience-ը և token-ի կազմաձևումը։ `withAuthOverrides`-ը աջակցում է կազմաձևման վերագրումներին։ Տեղակայմանը հատուկ ինքնության կարգավորումը պետք է լինի Ձեր ծրագրի շահագործման փաստաթղթերում։

## Պաշտպանեք և՛ հրամանը, և՛ գրառումը

Հրամանները կարող են վերևի մակարդակի `canAccess` ֆունկցիա սահմանել՝ իրենց `deriveCommand` նշիչից առաջ։ Նշիչը այն կապում է նախակատարման թույլտվության ստուգման հետ։ Բացահայտ ֆունկցիայի բացակայության դեպքում հրամանների դասը լռելյայն պահանջում է նույնականացում։

Հրաման օգտագործելու թույլտվությունը դեռ կարող է կախված լինել դրա ազդած կոնկրետ գրառումից։ Ուսումնական նախագծում նույնականացված հաճախորդը չպետք է խմբագրի մեկ այլ հաճախորդի զամբյուղը։ Որոշման ֆունկցիայում վավերացված subject-ը համեմատեք զամբյուղի գրանցված սեփականատիրոջ հետ՝ փոփոխությունն ընդունելուց առաջ։ `src/Shop/Cart/Commands/AddItem.hs`-ում գրած `AddItem`-ը ներկայումս անտեսում է իր հարցման համատեքստը։

Տեղակայման կարևոր սահման կա․ **առանց `Application.withAuth`-ի ընթացիկ վեբ տրանսպորտը ստեղծում է վստահելի հրամանի համատեքստ և շրջանցում հրամանի թույլտվության դարպասը**։ Միայն `canAccess` հայտարարելը չի ապահովում այն ծրագիրը, որի նույնականացումը միացված չէ։ `decide`-ի ներսի տիրույթային ստուգումները մնում են Ձեր կոդի պատասխանատվությունը։

## Ստուգեք սեփականատիրոջը՝ փոփոխությունն ընդունելուց առաջ

`src/Shop/Cart/Commands/AddItem.hs`-ում փոխարինեք `decide`-ը և դրա տակ ավելացրեք `addForOwner`-ը։ Պահեք առկա `addToCart` քանակի օգնականը և տիպերի հայտարարությունները․

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

Սա **նույնականացված տարբերակ** է, որը պետք է ավելացնեք ինքնության ծառայության կարգավորմանը զուգահեռ։ Այն փոխում է ավելի վաղ անանուն պայմանագիրը. սկզբնական անանուն HTTP թեստերն այժմ կձախողվեն, մինչև չտրամադրեք վավեր թեստային հավատարմագրեր և այդ ինքնությամբ չստեղծեք զամբյուղներ։ Պահեք փոփոխությունից առաջ մշակման ստուգակետը և ավելացրեք սեփականատիրոջ, մեկ այլ օգտատիրոջ և բացակայող օգտատիրոջ թեստեր՝ նոր կանոնը լուռ չթուլացնելու փոխարեն։

`CreateCart`-ը արդեն գրանցված օգտատիրոջ համար պահում է `context.user.sub`-ը։ Ավելի վաղ վարժություններում անանուն ստեղծված զամբյուղները ինքնաբերաբար չեն պատկանում նոր մուտք գործած օգտատիրոջը։ Այս տարբերակը ստուգելիս օգտագործեք նոր նույնականացված զամբյուղներ. հյուրից հաշիվ փոխանցելը պահանջում է իր բացահայտ նախագծումը։

## Ներկայացումը պաշտպանեք առանձին

Հարցումները պահանջում են երկու քաղաքականություն։ `canAccess`-ը որոշում է՝ կանչողը կարող է օգտագործել հարցման տիպը, իսկ `canView`-ը՝ կոնկրետ տողը տեսանելի՞ է։

CartSummary-ի քաղաքականությունների այս **փոխարինումը** օգտագործում է իրական օգնականի API-ն։ Այն ենթադրում է, որ `CartSummary`-ը պահպանում է `ownerId :: Text` դաշտը. `AccessControl`-ը տրամադրում է սեփականության օգնականը․

```haskell
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)
```

Դրանք տեղադրեք `deriveQuery`-ից առաջ։ `ownerOnly`-ը տողի սեփականատիրոջը համեմատում է վավերացված `sub` claim-ի հետ։ Endpoint-ը հեռացնում է `canView`-ը չանցած տողերը. այն էջավորման ընդհանուրները հաշվում է լիազորումից և զտումից հետո։ Հարցմանը մուտք ունենալու, բայց համապատասխան զամբյուղ չունենալու դեպքում օգտատերը ստանում է դատարկ արդյունքների հավաքածու, ոչ թե մեկ այլ հաճախորդի տեղեկությունը։

Ձեր սկզբնական CartSummary-ն օգտագործում է `publicAccess` և `publicView`։ Դրանք կարող են հարմար լինել ապրանքների կատալոգի համար, բայց հաճախորդների տվյալների վրա կիրառելուց առաջ գիտակցված ընտրություն կատարեք։ Մյուս օգնականների թվում են `requirePermission`, `requireAnyPermission`, `requireAllPermissions` և `tenantOnly`։

## Հյուրի զամբյուղները նախագծեք բացահայտորեն

`CreateCart`-ը գրանցում է նույնականացված subject-ը, երբ այն հասանելի է, իսկ հակառակ դեպքում ստեղծում է անանուն սեփականատիրոջ նույնացուցիչ։ Այդ ստեղծված նույնացուցիչն ինքնաբերաբար չի դառնում անվտանգ զննարկչային նստաշրջան և հետագայում մուտք գործած օգտատիրոջը սեփականության իրավունք չի տալիս։

Եթե ուսումնական նախագծին ավելացնում եք հյուրի վճարում, որոշեք, թե ինչպես է հյուրն ապացուցում իր մուտքը զամբյուղին և ինչպես է սեփականությունը փոխվում մուտքից հետո։ Նույն նախագծային հարցը առաջանում է, երբ անանուն աշխատանքը հետագայում պետք է պատկանի նույնականացված օգտատիրոջ։ Մոդելավորեք և թեստավորեք այդ անցումը։ Մի լուծեք այն՝ հարցման մարմնից կամայական `ownerId` ընդունելով։

## Հավաքեք նույնականացված տարբերակը

Ինքնության ծառայություն ընտրելուց հետո ստորև նշված հրամանի և հարցման ֆայլերը փոխարինեք ամբողջական տարբերակներով։ Դրանք հավաքում են հենց բացատրված սեփականատիրոջ ստուգումները։ Սա անանուն ուսումնական նախագծից կամընտրական ճյուղ է. դրա թեստերը պետք է տրամադրեն նույնականացված ինքնություններ։ Եթե դեռ նույնականացում չեք կարգավորում, պահեք ավելի վաղ ստուգակետը։

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

Վերջապես `src/App.hs`-ը փոխարինեք ստորև հավաքված նույնականացման կապակցմամբ՝ `https://auth.example.com`-ը փոխարինելով Ձեր ինքնության ծառայության URL-ով։ Այդ հոսթի անունը տեղապահ է։ Եթե արդեն ընդլայնել եք ծրագիրը, պահեք այդ հավելումները և `withAuth`-ը տեղադրեք տրանսպորտի գրանցումից հետո։

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

Իրական մատակարարի կազմաձևումից հետո գործարկեք `neo build`։ Որոշման թեստերը թարմացրեք՝ մուտք գործած հարցման համատեքստերով, իսկ HTTP թեստերը՝ վավեր հավատարմագրերով, ապա գործարկեք `neo test`. Ավելի վաղ անանուն հաջողության ակնկալիքներն այլևս չեն գործում։ Ստուգեք սեփականատիրոջը, մեկ այլ օգտատիրոջը, բացակայող հավատարմագրերը և անվավեր token-ները։ Այս ամբողջական ֆայլերը հավաքում են ծրագրի քաղաքականությունը. մատակարարի կարգավորումն ու հավատարմագրերով ստուգումը շարունակում են մնալ այս կամընտրական ճյուղն ընդունելու մաս։

## Վարժություն․ մեկ այլ հաճախորդի զամբյուղը

Ստեղծեք ուսումնական նախագծի թեստային ծրագիր՝ երկու հաճախորդով և մեկ վաճառողով։ Ի՞նչ պետք է կարողանա կարդալ և փոխել յուրաքանչյուրը։ Ներառեք հարցում առանց հավատարմագրերի և մեկը՝ անվավեր token-ով։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Սեփականատերը պետք է կարդա իր զամբյուղը և կատարի թույլատրելի փոփոխություններ։ Մյուս հաճախորդը չպետք է տեսնի դրա տողը կամ հաջողությամբ փոխի այն։ Վաճառողի մուտքը կախված է Ձեր բացահայտ թույլտվության քաղաքականությունից, ոչ թե միայն մուտք գործած լինելուց։ Բացակայող հավատարմագրերով նույնականացված հարցումը պետք է ձախողվի, իսկ անվավեր token-ը տրանսպորտը պետք է մերժի։ Միավորային թեստերից բացի վարժվեք իրական նույնականացված վեբ կարգավորմամբ. միավորային թեստը չի կարող հայտնաբերել, որ արտադրական միջավայրում նույնականացումը միացնել եք մոռացել։

</details>

Հաջորդը՝ [կազմաձևումը](/hy/build/configuration/) այս տեղակայման ընտրությունները դարձնում է բացահայտ։

Հանրային սկզբնաղբյուրներ՝ [մուտքի օգնականներ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/AccessControl.hs), [հարցման համատեքստ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Auth.hs), [հրամանների լռելյայններ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Command/Core.hs), [հարցման endpoint](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Endpoint.hs), [վեբ նույնականացման դիսպետչեր](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)։

Օգտատիրոջ արտաքին հաշիվը միացնելը առանձին խնդիր է Ձեր ծրագրում մուտք գործելուց։ Այդ աշխատանքային հոսքի համար տե՛ս [մատակարարի հաշիվներ և համաձայնություն](/hy/connect/provider-accounts/)։
