---
title: Վերբեռնեք և կցեք ֆայլեր
description: Պահեք վերբեռնված բայթերը, վավերացրեք ֆայլերի հղումները և դրանք կցեք ընդունված ծրագրային գործողություններին։
sidebar:
  order: 5
---
<!-- translation-source-sha256: 0a81f2fdd4de6e40404671fbcce68f5cdbb189b58e661c2e8a4fec26d9c10443 -->

Ինչ-որ մեկը վերբեռնում է ֆայլ, ապա ձևն ավարտելուց առաջ փակում է զննարկիչը։ Ծրագրին պետք է ժամանակավոր պահոց այդ չավարտված վերբեռնման համար և հստակ կապ, երբ ֆայլը դառնում է ընդունված գործողության մաս։

NeoHaskell-ը տրամադրում է ֆայլերի հղումներ, վերբեռնման և ներբեռնման երթուղիներ, օգտատիրոջ համար նախատեսված ճանապարհում սեփականության ստուգումներ և ֆայլի կյանքի ցիկլ։ Դուք եք որոշում, թե որ ֆայլերն են ընդունելի և երբ են կցվում։ Շարունակեք Ձեր սեփական `mug-shop` նախագծում. ստեղծեք մեկ վերբեռնման կազմաձևման ֆայլ, ավելացրեք մեկ ծրագրի գրանցում, վերբեռնեք փոքր օրինակ և նախագծեք, թե ինչպես է նկարը կցվում անհատականացված բաժակին։

Ստորևի բոլոր ուղիները հարաբերական են `mug-shop` նախագծի արմատին։ Կենտրոնացված հատվածները նախ բացատրում են ընտրությունները։ Ամբողջական ֆայլերը ցույց են տալիս ճշգրիտ ներմուծումները և գործարկվող ստուգակետի համար անհրաժեշտ շրջապատող ծրագրային կոդը։

## Ընտրեք վերբեռնման քաղաքականությունը

Այս տեղային վարժության համար թույլատրեք փոքր տեքստային նշումներ, PNG նկարներ և PDF-ներ։ Բայթերը պահեք `./uploads`-ում, կյանքի ցիկլի մետատվյալները՝ հիշողության մեջ, իսկ չավարտված հղումները ժամկետանց դարձրեք վեց ժամից հետո․

```haskell
uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Սա ուսումնական կարգավորում է։ Մետատվյալների պահոցը հիշողության մեջ է, ուստի վերագործարկումը կորցնում է հղումները, նույնիսկ եթե բայթերը մնում են `uploads/`-ում։ Տեղակայված ծրագիրը պետք է միասին ընտրի կայուն մետատվյալներ և կայուն blob պահոց։

## Ստեղծեք վերբեռնման կազմաձևման ֆայլը

Ստեղծեք `src/Shop/Uploads.hs`։ Ստորևի ամբողջական ֆայլը պատճենեք որպես մեկ ֆայլ՝ ֆայլի վերբեռնման որ տիպերն է պետք ներմուծել գուշակելու փոխարեն։

<!-- complete-file -->
```haskell title="src/Shop/Uploads.hs"
module Shop.Uploads (uploadConfig) where

import Core
import Service.FileUpload.Core (FileUploadConfig (..), FileStateStoreBackend (..))


uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Դաշտերը ծրագրի որոշումներ են․

| Դաշտ | Որոշեք, թե ինչ է նշանակում Ձեր տեղակայման համար |
| --- | --- |
| `blobStoreDir` | Որտեղ են պահվում փաստացի ֆայլի բայթերը |
| `stateStoreBackend` | Որտեղ է պահպանվում ֆայլի կյանքի ցիկլի մետատվյալը |
| `maxFileSizeBytes` | Ընդունվող վերբեռնման առավելագույն չափը |
| `pendingTtlSeconds` | Որքան ժամանակ է չավարտված վերբեռնումն օգտագործելի մնում |
| `cleanupIntervalSeconds` | Մաքրման պլանավորման կարգավորումը |
| `allowedContentTypes` | Հայտարարված թույլատրելի մեդիայի տիպերը կամ սահմանափակման բացակայությունը |
| `storeOriginalFilename` | Պահպանվո՞ւմ են արդյոք սկզբնական անունները |

Գործարկման ժամանակ ստուգվում են դրական չափի ու ժամանակի արժեքները, պահանջվում է ոչ դատարկ գրացուցակ և պահանջվում է, որ մաքրման միջակայքը փոքր լինի սպասման ժամկետից։ Ընթացիկ ծրագրային կապակցումը հասանելի մաքրման աշխատողը չի սկսում։ Ժամկետի ավարտը ստուգվում է մուտքի պահին, բայց լքված blob բայթերը այս կարգավորմամբ ինքնաբերաբար չեն վերականգնվում։ Ձեր տեղակայած backend-ի համար կազմակերպեք ու թեստավորեք մաքրումը։

## Վերբեռնման աջակցություն ավելացրեք `App.hs`-ին

`src/App.hs`-ում մյուս `Shop` ներմուծումների հետ ավելացրեք այս որակավորված ներմուծումը․

```haskell
import Shop.Uploads qualified as Uploads
```

Առկա տրանսպորտից, ծառայություններից ու հարցումներից հետո ավելացրեք այս գրանցումը․

```haskell
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

`@()` ֆակտորինը այս տեղային օրինակի համար անկախ է `ShopConfig`-ից։ Երբ գրացուցակն ու սահմանները դառնան տեղակայման կարգավորումներ, ֆակտորինը փոխարինեք `Application.withConfig`-ով գրանցված կազմաձևման տիպից եկող ֆունկցիայով։

[Աշխատանքային հոսքի դասը](/hy/connect/workflows/) ավարտելուց հետո `src/App.hs`-ի ամբողջական արդյունքը հետևյալն է։ Այն պահպանում է ելքային գրանցումը և ավելացնում վերբեռնումները։ Եթե այս էջին ուղղակիորեն եք հասել, աշխատանքի հոսքի երկու տողերը ավելացրեք նույն տեղերում կամ բաց թողեք մինչև նախորդ էջն ավարտելը։

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
import Shop.Uploads qualified as Uploads

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
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

## Վերբեռնեք բայթերը՝ նախքան դրանք կցելը

Խմբագրելուց հետո կանգնեցրեք ու նորից կառուցեք, ապա նախագծի արմատից սկսեք ծրագիրը․

```sh
neo build
neo test
neo run
```

Նույն նախագծի արմատում բացված մեկ այլ տերմինալում ստեղծեք նմուշ և ուղարկեք այն գործող սերվերին․

```sh
mkdir -p examples
printf 'Blue mug artwork draft\n' > examples/artwork-note.txt
curl -F 'file=@examples/artwork-note.txt;type=text/plain' \
  http://localhost:8080/files/upload
```

Սպասեք JSON-ի, որը պարունակում է `fileRef`, `filename`, `contentType`, `sizeBytes` և `expiresAt`։ Այս առաջին շրջադարձն օգտագործում է տեղային ծրագիրն առանց նույնականացման։ Եթե միացրել եք նույնականացում, հավատարմագրերը տրամադրեք [մուտքի կառավարում](/hy/build/access-control/) բաժնում նկարագրված ձևով։

Վերադարձված հղումով խնդրեք բայթերը։ Տեղապահը փոխարինեք վերադարձված `fileRef`-ով․

```sh
curl http://localhost:8080/files/YOUR-FILE-REFERENCE
```

**Ներկայիս նույնականացված ներբեռնման սահմանափակում․** ներբեռնման երթուղին օգտագործում է `Everyone` middleware ռեժիմը, որը անանուն claim-ներ է վերադարձնում նույնիսկ token-ի առկայության դեպքում։ Այդ պատճառով նույնականացված subject-ին պատկանող վերբեռնումը չի կարելի ենթադրել, որ այս երթուղով ներբեռնելի է։ Մասնավոր կցորդներ միացնելուց առաջ ստուգեք ու լուծեք այդ ճանապարհը. անանուն վարժությունը վերջից վերջ նույնականացված սեփականության աջակցություն չի հաստատում։

## Հղումը կցեք ընդունված գործողության միջոցով

Բայթերի վերբեռնումը Cart-ը չի փոխել։ Նկարային հնարավորություն ավելացնելու համար ստեղծեք `attachment :: FileRef` դաշտով հրաման։ `FileRef`-ը `Service.FileUpload.Core`-ում սահմանված հղման տիպն է։ Օգտագործեք [հրամանների ու իրադարձությունների](/hy/build/commands-and-events/) հրամանի նշիչը։ Շրջանակը հղումը լուծում է նախքան հրամանի գործարկումը և մետատվյալը տրամադրում `RequestContext.files`-ում։

Ֆայլի հղումը պահեք ընդունված իրադարձության մեջ՝ Cart-ի կամ նկարի հարցման կապի հետ միասին։ Հում բայթերը մի պատճենեք իրադարձության մեջ։ Նկարը ցուցադրող հրամանը, իրադարձությունը և ներկայացումը ծրագրի նոր աշխատանք են. էկրանին «կցել» գործողություն առաջարկելուց առաջ ստեղծեք այդ ֆայլերը։

Լուծիչը ստուգում է ֆայլի գոյությունը, ջնջումը, սպասման ժամկետի ավարտը, սեփականությունը և blob-ի առկայությունը։ Սպասող հղումները ժամկետանց են դառնում, իսկ հաստատվածները չեն մերժվում միայն սպասման TTL-ի ավարտի պատճառով։ Ծրագրին դեռ պետք են պահպանման ու հեռացման կանոններ։

Ֆոնային ինտեգրման ֆայլային մուտքի համատեքստը տարբերվում է օգտատիրոջ հարցման համատեքստից։ Դրա իրականացումը պահոցից հղումով է ստանում տվյալը և հարցում կատարող օգտատիրոջ սեփականության ստուգում չի կրում։ Մշակումը գործարկեք միայն լիազորված գործողությունից, որը հաստատել է կապը։ Անվստահելի հրահանգից կամայական հղում մի ընդունեք և մի փոխանցեք ֆոնային մշակիչին։

Հայտարարված մեդիայի տիպն օգտակար է երթուղավորման ու սահմանների համար, բայց չի ապացուցում, որ բայթերը վավեր նկար կամ անվտանգ փաստաթուղթ են։ Նախքան ընդունելը վավերացրեք այն հատկությունները, որոնց վրա հենվում է ծրագիրը։

## Վարժություն․ հաճախորդի լքված նկարը

Ուսումնական նախագծում որոշեք, թե երբ է նկարը կցվում պատվերին, ինչ է տեղի ունենում սպասման ժամկետի ավարտից հետո և ինչ է ցույց տալիս էկրանը, երբ պահված բայթերը բացակայում են։ Թեստավորեք վավեր սեփականատիրոջ հղումը, մեկ այլ օգտատիրոջ հղումը, ժամկետանց սպասող վերբեռնումը, ջնջված հղումը, բացակայող blob բայթերը, բացակայող multipart տվյալները և չափից մեծ ֆայլը։ Հրամանը թողեք մերժված, երբ դրա պահանջվող կցորդը չի կարող լուծվել։ Այդ ստուգումները գործարկեք `neo test`-ով և առանձին փորձարկեք կենդանի HTTP վերբեռնման երթուղին։ Մասնավոր կցորդներ միացնելուց առաջ ավելացրեք նույնականացված սեփականության սցենար։

Շարունակեք [փաստաթղթերի մշակմամբ](/hy/connect/documents/), երբ կցորդի կյանքի ցիկլը հստակ լինի։

<details>
<summary>Շրջանակի սկզբնաղբյուրի նշումներ</summary>

- [core/auth/Auth/Middleware.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/Middleware.hs)
- [core/service/Service/Transport/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [core/service/Service/FileUpload/Resolver.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Resolver.hs)
- [core/service/Service/FileUpload/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Web.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/src/Testbed/Document/Commands/CreateDocument.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Document/Commands/CreateDocument.hs)
- [testbed/tests/files/upload.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload.hurl)
- [testbed/tests/files/download.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/download.hurl)
- [testbed/tests/files/upload-errors.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload-errors.hurl)

</details>
