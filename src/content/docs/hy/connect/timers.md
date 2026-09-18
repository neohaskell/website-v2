---
title: Պլանավորեք պարբերական աշխատանք
description: Ժամաչափի ազդակներով պահանջեք աշխատանք՝ դրանք կայուն ժամանակացույցի հետ չշփոթելով։
sidebar:
  order: 9
---
<!-- translation-source-sha256: b7d1f56484358a4c2ceb5fccedb2f55daa5519c02ebd35d2446b232de48cea87 -->

Որոշ աշխատանք պետք է պարբերաբար կատարվի՝ ժամկետանց գրառումների ստուգում, ծառայության հարցում կամ ամփոփման թարմացում։ Ժամաչափը կարող է այդ աշխատանքը խնդրել, մինչ ծրագրի կանոններն են որոշում, թե ինչն է իրականում ժամկետանց։ Այս պատասխանատվությունները առանձին պահելը վերագործարկման վարքագիծը հեշտացնում է հասկանալ։

NeoHaskell-ը տրամադրում է գործընթացի ներսում պարզ ժամաչափի ինտեգրում։ Այն օգտակար է ծրագիրն աշխատելիս պարբերական հարցումների համար։ Այն կայուն աշխատանքների պլանավորիչ չէ, որը հիշում է բաց թողնված յուրաքանչյուր գործարկում։

Նախ դիտարկեք ժամաչափը՝ օգտագործելով զամբյուղ ստեղծելու առկա կանոնը։ Այնուհետև պահեստի ամրագրումների ժամկետի ավարտը նախագծեք այնպես, որ դրանց վերջնաժամկետները վերագործարկումից հետո պահպանվեն, նույնիսկ եթե ժամաչափը չի պահպանվում։

Ստորևի բոլոր ուղիները հարաբերական են Ձեր `mug-shop` նախագծի արմատին։ Դասը ստեղծում է Cart-ի երեք ֆայլ, փոխարինում մեկ ծառայության ֆայլ և ավելացնում ծրագրի մեկ գրանցում։ Կենտրոնացված հայտարարությունները գալիս են առաջինը, իսկ ամբողջական ստացված ֆայլերը՝ յուրաքանչյուր փոփոխությունից հետո։

## Ժամաչափին տվեք ներքին հրաման

Ժամաչափի հրամաններն օգտագործում են ինտեգրման դիսպետչերը, որը գրանցում է միայն `InternalTransport`-ով հայտարարված հրամանները։ Առկա `CreateCart`-ը պատկանում է `WebTransport`-ին։ Պահեք այդ հանրային գործողությունը և ժամաչափին տվեք առանձին մուտքային կետ, որը փոխանցում է նույն որոշմանը։

Փոխանցումը բիզնեսային ընտրություն է. փոխեք հարցման հասնելու եղանակը՝ զամբյուղի ստեղծումը նույնական պահելով։

```haskell
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context
```

Ստեղծեք `src/Shop/Cart/Commands/CreateCartInternal.hs`։ Հրամանը դաշտեր չունի և նոր զամբյուղ է ստեղծում, ուստի `getEntityId`-ը վերադարձնում է `Nothing`։ Դրա տրանսպորտը ներքին է․

```haskell
data CreateCartInternal = CreateCartInternal

getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing

type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]

deriveCommand ''CreateCartInternal
```

### Ներքին հրամանի ամբողջական ֆայլը

Ֆայլը ստեղծեք fence-ի նշած ուղով և պատճենեք ամբողջը՝ ներառյալ մոդուլի վերնագիրն ու ներմուծումները։

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

`CreateCart`-ին երկու տրանսպորտի տիպերը մի ավելացրեք. շրջանակը մերժում է մեկ հրամանի ներքին ու հանրային տրանսպորտների խառնուրդը։ Այս վարժությունը դատարկ զամբյուղներ է ստեղծում դիտարկման համար։ Դիտարկումից հետո հեռացրեք ժամաչափի գրանցումը։

## Փոխարինեք Cart-ի ծառայության գրանցումը

`src/Shop/Cart/Service.hs`-ը փոխարինեք ստորևի ֆայլով կամ առկա Cart ծառայությանը ավելացրեք վերջնական `Service.command` տողը, եթե դրա առաջին երկու գրանցումները անփոփոխ են․

```haskell
  |> Service.command @CreateCartInternal
```

Հրամանը պետք է գրանցված լինի, նախքան ժամաչափը կարող է այն dispatch անել։ Այս ամբողջական ֆայլը Connect-ի ճշգրիտ overlay-ն է։

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

## Ստեղծեք ժամաչափի ինտեգրումը

Ստեղծեք `src/Shop/Cart/Timers.hs`։ Ժամաչափը յուրաքանչյուր ազդակ վերածում է ներքին հրամանի։ Ազդակի արժեքը միտումնավոր անտեսված է. հրամանն է աշխատանքի հարցումը, ոչ թե կայուն ժամանակացույցի նույնացուցիչը։

```haskell
periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

### Ժամաչափի ամբողջական ֆայլը

Այս ամբողջ ֆայլը պատճենեք վերնագրում նշված ուղով։

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

## Ժամաչափը ավելացրեք `App.hs`-ին

`src/App.hs`-ում մյուս Cart ներմուծումների հետ ավելացրեք․

```haskell
import Shop.Cart.Timers (periodicCartCreator)
```

Առկա ծառայությունների ու հարցումների գրանցումից հետո ավելացրեք․

```haskell
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

`@()` ֆակտորինը ծրագրի կազմաձևում չի պահանջում։ Այս ամբողջական ֆայլը շարունակում է աշխատանքի հոսքի և վերբեռնման դասերը՝ պահելով դրանց գրանցումները և ավելացնելով ժամաչափը։ Եթե որևէ ընտրովի հնարավորություն բաց եք թողել, հեռացրեք դրա ներմուծումն ու գրանցումը։ Ձեր ավելացրած նույնականացման կարգավորումները պահեք։

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

## Գործարկեք և դիտարկեք առաջին ազդակը

Խմբագրելուց առաջ կանգնեցրեք գործող սերվերը, ապա `mug-shop`-ից գործարկեք․

```sh
neo build
neo test
neo run
```

Մեկ այլ տերմինալում հարցրեք `/queries/cart-summary`-ը։ Գործարկումից հետո պետք է հայտնվի դատարկ զամբյուղ, իսկ ժամաչափի աշխատանքի ընթացքում՝ ավելի շատերը։ Յուրաքանչյուրը զրո գրառում է հաղորդում։ Դիտարկումից հետո կանգնեցրեք սերվերը և հեռացրեք `withInbound` տողն ու `Shop.Cart.Timers` ներմուծումը։ Հրամանի և ժամաչափի մոդուլները պահեք, եթե ցանկանում եք ամբողջական ստուգակետը կառուցել. չգրանցված ժամաչափը չի աշխատում։

`Timer.every`-ը `toCommand`-ը կանչում է ազդակների հաշվիչ **1**-ով անմիջապես աշխատողը սկսվելիս, արտածում այդ հրամանը և հետո քնում։ Հետագա ազդակների հաշվիչը մեծանում է։ Միջակայքի օգնականները վայրկյանները, րոպեները և ժամերը փոխակերպում են միլիվայրկյանների։

Ազդակների հաշվիչը աշխատողի հետ վերագործարկվում է։ Այն կայուն նույնացուցիչ, պահպանված հաջորդականություն կամ անցած պատի ժամի ապացույց չէ։ Աշխատանքն ու dispatch-ը նույնպես ժամանակ են պահանջում, ուստի այս շրջանը օրացույցին հավասարեցված պլանավորիչ չէ։ Ծրագիրը հաղորդված ձախողումներից հետո մուտքային աշխատողներին վերագործարկում է աճող backoff-ով, բայց դա բաց թողնված ազդակների կայուն հերթ չի վերականգնում։ Ծրագրի մի քանի օրինակներ նույնպես կարող են ստեղծել մի քանի ժամաչափի աշխատող։

## Ձևը հարմարեցրեք ամրագրումներին

Ուսումնական նախագծում նախագծեք կայուն վիճակ օգտագործող ժամկետի ավարտի ստուգման հրաման։ Որոշեք, թե ինչպես է այն գտնում սպասող ամրագրումները, որքան աշխատանք է կատարում յուրաքանչյուր գործարկման ընթացքում և ինչպես է ամրագրման սեփական հրամանը ստուգում՝ արդյոք այն դեռ կարող է ժամկետանց դառնալ։

Ժամաչափը պետք է սկսի այդ գործընթացը. այն չպետք է կոդավորի «ազդակ 20-ը նշանակում է այս ամրագրման ժամկետի ավարտ»։ Իրական վերջնաժամկետը պահեք ամրագրման կամ դրան կապված աշխատանքային հոսքի հետ։ Թույլատրելիությունը որոշող շերտում օգտագործեք ծրագրի ժամացույցն ու պահպանված փաստերը։

Կրկնվող ժամկետի ստուգումները դարձրեք անվնաս։ Օրինակ՝ արդեն ազատված ամրագրումը չպետք է կրկին վերականգնի պահեստը։ Այդ կանոնը պատկանում է Ձեր տիրույթին ու դրա թեստերին, ոչ թե ժամաչափի քնի միջակայքին։

## Վարժություն․ վերագործարկում ժամկետի կեսին

Ենթադրենք՝ ամրագրումը ժամկետանց է դառնում տասը րոպեից, իսկ ծրագիրը վերագործարկվում է վեց րոպե անց։ Բացատրեք, թե ինչ է տեղի ունենում գործարկումից հետո առաջին ժամաչափի ազդակին։ Ժամաչափը անմիջապես ստուգում է խնդրում, բայց ամրագրումը դեռ օգտագործում է իր սկզբնական վերջնաժամկետը։ Ստուգեք ժամկետից առաջ, Ձեր ընտրած սահմանին ճիշտ և ժամկետից հետո։ Ապա կրկնեք հրամանը, վերագործարկեք աշխատողը և նույն ամրագրման դեմ գործարկեք երկու աշխատող։ Պահեստի արդյունքը պետք է համապատասխանի Ձեր կրկնօրինակների կառավարման քաղաքականությանը։

Գործարկման թեստը պետք է սպասի անմիջական առաջին հրամանի։ Ժամացույցը վերահսկող բիզնեսային թեստը պետք է ապացուցի ժամկետի ավարտը՝ տասը րոպե չքնեցնելով։

Երբ ծրագրին կայուն ժամանակացույց է անհրաժեշտ, բացահայտ ընտրեք կամ կառուցեք այդ հնարավորությունը և միացրեք այն [մուտքային ինտեգրման աբստրակցիայի](/hy/connect/custom-integrations/) միջոցով։ [Տեղակայմամբ](/hy/operate/deployment/) մտածեք աշխատողների քանակի ու վերագործարկումների մասին։

<details>
<summary>Շրջանակի սկզբնաղբյուրի նշումներ</summary>

- [core/service/Integration/Timer.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Timer.hs)
- [testbed/src/Testbed/Cart/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
