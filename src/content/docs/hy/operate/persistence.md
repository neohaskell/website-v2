---
title: Պահպանեք ծրագրի տվյալները
description: Ընտրեք պահեստավորում իրադարձությունների, կարդալու մոդելների, ֆայլերի ու հավատարմագրերի համար, ապա ապացուցեք, թե ինչն է վերապրում վերագործարկումը։
sidebar:
  order: 1
---
<!-- translation-source-sha256: 16be86b1ad86ca0cea9a3ceedf55e41210cd17c287c35a5f5280b7900f75b354 -->

Ծրագրի վերագործարկումը չպետք է ջնջի այն աշխատանքը, որը խոստացել էր պահել։ Սակայն ժամանակավոր վահանակը կարող է անվտանգ լինել վերակառուցելու համար։ Պահպանումը սկսվում է այս տարբերակումից. որոշեք, թե որ տեղեկությունն է հեղինակավոր և որը կարելի է վերակառուցել։ `mug-shop`-ի Cart-ն ու դրա ընդունված ավելացումները մեզ տալիս են փոքր օրինակ՝ վերագործարկման միջով տանելու համար։

Իրադարձությունների աղբյուրավորմամբ ծրագրում ընդունված իրադարձությունները պահպանում են բիզնեսային պատմությունը։ Էություններն ու հարցումները այդ պատմությունը մեկնաբանում են տարբեր նպատակներով։ Իրադարձությունները անվտանգ պահելը կարևոր է, բայց դրանք միակ տվյալը չեն, որ ծրագիրը կարող է պահելու կարիք ունենալ։

Ստորևի բոլոր ուղիները հարաբերական են `neo new`-ով ստեղծած `mug-shop` նախագծի արմատին։ Դասը նախ բացատրում է փոխարինումը, ապա տալիս է Postgres ստուգակետի համար անհրաժեշտ ամբողջական `ShopConfig`, պահեստավորման ֆակտորինի և `App.hs` ֆայլերը։ Եթե արդեն ինտեգրումներ եք ավելացրել, պահեք դրանց ներմուծումներն ու գրանցումները՝ ամբողջական պահպանման ֆայլերը միավորելիս։

## Նույնացրեք պահեստի յուրաքանչյուր տեսակ

| Տեղեկություն | NeoHaskell-ի մակերես | Ծրագրի որոշում |
| --- | --- | --- |
| Ընդունված իրադարձություններ | `Service.EventStore` | Նախքան վերագործարկումից վերապրող աշխատանք ընդունելը օգտագործեք կայուն պահեստավորում |
| Հարցումների արդյունքներ | `Service.QueryObjectStore` | Հիշողություն կամ Postgres ընտրեք իրադարձությունների պահպանումից անկախ |
| Վերբեռնված բայթեր | `blobStoreDir`-ով կազմաձևված տեղային blob պահոց | Պահեք ու պահուստավորեք փաստացի ֆայլերը |
| Ֆայլերի սեփականություն և կյանքի ցիկլ | Ֆայլերի վիճակի պահոց | Ընտրեք կայուն վիճակ և կայուն բայթեր |
| Միացված մատակարարների գաղտնիքներ | `Application.withSecretStore` | Տրամադրեք պահեստ՝ Ձեր տեղակայման պահանջած կյանքի տևողությամբ |

Starter-ը `SimpleEventStore`-ը կազմաձևում է `persistent = False`-ով։ Այդ կազմաձևման ֆայլային տեսք ունեցող ուղին կարգավորումը կայուն չի դարձնում։ Այն հարմար է առաջին փորձի համար, իսկ դրա վերագործարկումը կորցնում է իրադարձությունների պատմությունը։

## Կազմաձևումը փոխարինեք տվյալների բազայի կարգավորումներով

Շարունակեք Ձեր սեփական `mug-shop` գրացուցակում։ Հրամանները դեռ աշխատում են Ձեր `neo.json`, `src/App.hs` և `src/Shop/` մոդուլների հետ։ Այստեղ է, որ ճանապարհը տվյալների բազա է ավելացնում. ավելի վաղ դասերին Cart-ին ու Stock-ին այն պետք չէր։

Գաղտնաբառը օգտակար առաջին օրինակ է. այն պարտադիր է, տրամադրվում է միջավայրից և կազմաձևման գրառումը ցուցադրելիս թաքցվում է․

```haskell
Config.field @Text "dbPassword"
  |> Config.doc "PostgreSQL password"
  |> Config.required
  |> Config.envVar "DB_PASSWORD"
  |> Config.secret
```

Մյուս ընտրությունները նույնացնում են սերվերն ու տվյալների բազան և սահմանում կապերի լողավազանն ու TLS քաղաքականությունը։ `src/Shop/Config.hs`-ը փոխարինեք ստորև ամբողջական ֆայլով։ Այն պահում է ավելի վաղ `persistEvents` դաշտը, որպեսզի այս overlay-ը մնա Build-ի ստուգակետի ուղղակի ընդլայնում. անցումից հետո այդ դաշտն այլևս չի կառավարում Postgres իրադարձությունների պահոցը և կարող է հեռացվել, երբ ոչինչ այն չի օգտագործում։

<!-- complete-file -->
```haskell title="src/Shop/Config.hs"
module Shop.Config (ShopConfig (..), HasShopConfig) where

import Config (defineConfig)
import Config qualified
import Core

defineConfig
  "ShopConfig"
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  , Config.field @Text "dbHost"
      |> Config.doc "PostgreSQL host"
      |> Config.defaultsTo ("localhost" :: Text)
      |> Config.envVar "DB_HOST"
  , Config.field @Int "dbPort"
      |> Config.doc "PostgreSQL port"
      |> Config.defaultsTo (5432 :: Int)
      |> Config.envVar "DB_PORT"
  , Config.field @Text "dbUser"
      |> Config.doc "PostgreSQL user"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_USER"
  , Config.field @Text "dbPassword"
      |> Config.doc "PostgreSQL password"
      |> Config.required
      |> Config.envVar "DB_PASSWORD"
      |> Config.secret
  , Config.field @Text "dbName"
      |> Config.doc "PostgreSQL database name"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_NAME"
  , Config.field @Int "dbPoolSize"
      |> Config.doc "Event-store connection pool size"
      |> Config.defaultsTo (6 :: Int)
      |> Config.envVar "DB_POOL_SIZE"
  , Config.field @Text "dbSslMode"
      |> Config.doc "PostgreSQL TLS mode"
      |> Config.defaultsTo ("unset" :: Text)
      |> Config.envVar "DB_SSL_MODE"
  , Config.field @Text "dbSslRootCert"
      |> Config.doc "Root CA certificate path, or empty for none"
      |> Config.defaultsTo ("" :: Text)
      |> Config.envVar "DB_SSL_ROOT_CERT"
  ]
```

Կարգավորումները ուղղակիորեն քարտեզավորվում են `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` և `DB_SSL_ROOT_CERT` արժեքներին։ Տեղային լռելյայնները համապատասխանում են ստեղծված նախագծի Docker Compose տվյալների բազային։ Գաղտնաբառը պարտադիր է, որպեսզի բացակայող հավատարմագիրը կազմաձևման սխալ տա։ Տեղային վարժությունից դուրս գալիս ընտրեք տեղակայված տվյալների բազայի իրական հասցեն, հավատարմագրերը, լողավազանի բյուջեն և TLS պահանջները։

## Ստեղծեք պահեստավորման ֆակտորին

Ստեղծեք `src/Shop/Storage.hs`։ Կարգավորումներից պահեստավորման փոխարկումը պահեք այս ֆայլում, որպեսզի `App.hs`-ը միայն ընտրի ֆակտորինը։ Սկսեք դրա պայմանագրից․

```haskell
makePostgresConfig :: ShopConfig -> PostgresEventStore
```

Դաշտերի մեծ մասը արժեքը ուղղակի փոխանցում է, օրինակ՝ `host = config.dbHost`։ TLS-ի ռեժիմը վավերացման կարիք ունի, քանի որ միջավայրը տեքստ է տրամադրում․

```haskell
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
```

Պատճենեք ստորևի ամբողջական ֆակտորինը։ Այն փոխանցում է `PostgresEventStore`-ի ներկայիս բոլոր ութ դաշտերը՝ ներառյալ լողավազանի և TLS կարգավորումները, և դատարկ root-certificate ուղին համարում է բացակայող։

<!-- complete-file -->
```haskell title="src/Shop/Storage.hs"
module Shop.Storage (makePostgresConfig) where

import Core
import Service.EventStore.Postgres (PostgresEventStore (..))
import Service.Infra.Postgres.ConnectionConfig qualified as ConnectionConfig
import Shop.Config (ShopConfig (..))
import Text qualified

makePostgresConfig :: ShopConfig -> PostgresEventStore
makePostgresConfig config =
  PostgresEventStore
    { user = config.dbUser,
      password = config.dbPassword,
      host = config.dbHost,
      databaseName = config.dbName,
      port = config.dbPort,
      poolSize = config.dbPoolSize,
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
      sslRootCert =
        if Text.isEmpty config.dbSslRootCert
          then Nothing
          else Just config.dbSslRootCert
    }
```

Անհայտ TLS ռեժիմը ձախողվում է գործարկման ժամանակ, իսկ `unset`-ը թողնում է վարորդի լռելյայն բանակցումը։ Կարգավորումն ազդեցություն է ունենում, քանի որ ֆակտորինը փոխանցում է այն, ոչ թե որովհետև միջավայրի փոփոխականն ունի ճանաչելի անուն։

## Փոխարինեք ծրագրի իրադարձությունների պահոցի կապակցումը

`src/App.hs`-ում ավելացրեք այս ներմուծումը․

```haskell
import Shop.Storage qualified as Storage
```

`SimpleEventStore`-ի ներմուծումն ու `Application.withEventStore` արտահայտությունը փոխարինեք Postgres-ի ֆակտորինով՝ պահելով Ձեր տրանսպորտը, ծառայությունները, հարցումները և ինտեգրման գրանցումները․

```haskell
  |> Application.withEventStore Storage.makePostgresConfig
```

Ստորևի ամբողջական արդյունքը շարունակում է Cart-ից Stock և վերբեռնման դասերը՝ իրադարձությունների պահոցը փոխարինելով։ Ժամաչափի ժամանակավոր դիտարկումն ավարտվել է, ուստի դրա գրանցումը բացակայում է։ Եթե որևէ հնարավորություն բաց եք թողել, հեռացրեք դրա ներմուծումն ու գրանցումը, իսկ նույնականացումը կամ մյուս հավելումները պահեք։ `ShopConfig`-ը և `Shop.Storage`-ը հենց նոր ստեղծած երկու ամբողջական ֆայլերն են։

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Service.Application (Application)
import Service.Application qualified as Application
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig)
import Shop.Storage qualified as Storage
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore Storage.makePostgresConfig
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

`neo.json`-ում լրացուցիչ փաթեթ պետք չէ. իրադարձությունների պահոցի իրականացումը տրամադրվում է շրջանակով։ Պահեք նույն Neo թողարկման CLI-ի և շրջանակի ամրակները, որպեսզի ստեղծված նախագիծն ու այս օրինակները օգտագործեն համատեղելի կոմպիլյատոր և շրջանակ։

## Սկսեք տեղային տվյալների բազան և ծրագիրը

Երբ Docker-ի և դրա Compose հրամանը հասանելի են, օգտագործեք ստեղծված նախագծի `docker-compose.yml`-ը․

```sh
docker compose up -d postgres
docker compose exec postgres pg_isready -U neohaskell
neo build
DB_PASSWORD=neohaskell neo run
```

Սպասեք, մինչև `pg_isready`-ը հաղորդի, որ տվյալների բազան կապեր է ընդունում։ Վերևի գաղտնաբառը տեղային Compose օրինակի հավատարմագիրն է։ Իրական հավատարմագրերը տրամադրեք Ձեր տեղակայման գաղտնիքների մեխանիզմով։ Կազմաձևման բեռնիչը կարդում է գործընթացի միջավայրը. միայն `.env` ֆայլ ստեղծելը չի ապացուցում, որ այն հասել է ծրագրին։

Եթե մեկ այլ տեղային ծառայություն օգտագործում է 5432 պորտը, նախքան այն սկսելը Compose-ի host mapping-ը փոխեք ազատ պորտի, օրինակ՝ `55432:5432`, և ծրագիրը կամ թեստերը գործարկելիս տրամադրեք `DB_PORT=55432`։ Անկապ տվյալների բազան մի կանգնեցրեք։

Պահոցների փոխելը չի տեղափոխում ավելի վաղ հիշողության մեջ եղած պատմությունը կամ `persistEvents`-ով միացված տեղային իրադարձությունների ֆայլերը։ Հետևյալ փորձի համար Cart-ը ստեղծեք Postgres-ով սկսելուց հետո։ Կրկնելի HTTP թեստերի համար կանգնեցրեք գործող ծրագիրը և այս միանգամյա տեղային տվյալների բազայի դեմ օգտագործեք `DB_PASSWORD=neohaskell neo test`։ CLI-ն ինքն է սկսում սերվերը, իսկ թեստերը տվյալներ են գրում, այնպես որ այդ հրամանը երբեք մի ուղղեք արտադրական տվյալների բազային։

## Կայուն իրադարձություններն ու հարցումները առանձին են

Հարցումներն օգտագործում են հիշողություն, եթե `Application.withQueryObjectStore`-ով (նաև որպես `useQueryObjectStore` հասանելի) query-store backend չեք տրամադրում։ `PostgresQueryObjectStoreConfig`-ն ունի կապի և լողավազանի իր սեփական կարգավորումները։ Պահոցները հարցումները տարբերում են և՛ անունով, և՛ օրինակի նույնացուցիչով, այնպես որ նույն էության երկու ներկայացում մնում են առանձին։

Կա կարևոր գործառնական սահման. ցածր մակարդակի հարցումների բաժանորդի API-ները տրամադրում են checkpoint-ով և hash-ով վերակառուցման աջակցություն, բայց սովորական `Application` կապակցումը ներկայումս ստեղծում է `Subscriber.new`։ Միայն Postgres հարցումների պահոց ընտրելը **չի ապացուցում, որ գործարկումը շարունակում է պահպանված checkpoint-ից**։ Վերագործարկումն ու վերարտադրումը թեստավորեք Ձեր իրական կապակցմամբ և պրոյեկցիայի տրամաբանությամբ, հատկապես եթե պրոյեկցիան փոխարինելու փոխարեն արժեքներ է կուտակում։

## Ներկայացուցչական փոփոխությամբ ապացուցեք կայունությունը

Տեղային Postgres կարգավորմամբ օգտագործեք [HTTP և frontend-ների](/hy/build/http-and-frontend/) Cart երթուղիները․

1. Ստեղծեք Cart, ավելացրեք դրական քանակ և պահեք դրա նույնացուցիչն ու սպասվող բովանդակությունը։
2. Սպասեք, մինչև `CartSummary`-ը ցույց տա սպասվող արդյունքը, ապա ուղարկեք զրո քանակ և ստուգեք մերժումը։
3. Ctrl-C-ով կանգնեցրեք ծրագիրը և նույն նախագծից նորից գործարկեք `DB_PASSWORD=neohaskell neo run`՝ նույն տվյալների բազան օգտագործելով։
4. Սպասեք `/ready`-ին, ապա ստացեք նույն Cart-ի ամփոփումը։
5. Համեմատեք նույնացուցիչը, ապրանքների քանակը և դատարկ/ոչ դատարկ վիճակը։ Ստուգեք, որ վերարտադրումը ավելացումը երկու անգամ չի հաշվել և մերժված հարցումը ոչինչ չի ավելացրել։

Կրկնեք վերբեռնված կցորդով, եթե Ձեր աշխատանքային հոսքն այն օգտագործում է։ Տվյալների բազայի տողի վերապրելը չի ապացուցում համապատասխան բայթերի վերապրելը։ Նաև որոշեք, թե ինչպես են հեռացվում լքված վերբեռնումները. ցածր մակարդակի մաքրման աշխատող գոյություն ունի `Service.FileUpload.Web`-ում, բայց ընթացիկ `Application.withFileUpload` գործարկումը այն չի սկսում։ Միայն `cleanupIntervalSeconds` սահմանելը, հետևաբար, ավտոմատ մաքրում չի հաստատում։ Ստուգեք Ձեր ընտրած կյանքի ցիկլի կապակցումը և հետևեք պահեստի աճին։

Փորձեք գործընթացը տեղափոխել նոր հոսթ՝ պահելով միայն այն ռեսուրսները, որոնք նախատեսել էիք պահպանել։ Cart-ը պետք է վերականգնելի մնա պահպանված իրադարձությունների պահոցից։ Բացակայող ցանկացած ֆայլ կամ մատակարարի կապ բացահայտում է պահեստավորման մեկ այլ կախվածություն. այն ավելացրեք տեղակայման ու պահուստավորման ծրագրին և կրկնեք փորձը։ Մի եզրակացրեք կայունությունը միայն սովորական հաջող վերագործարկումից։

Շարունակեք [տեղակայմամբ](/hy/operate/deployment/) և [վերականգնմամբ](/hy/operate/recovery/)։

<details>
<summary>Շրջանակի և ստուգակետի սկզբնաղբյուրներ</summary>

- [Postgres-ի event-store դաշտեր](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Postgres/Internal.hs)
- [TLS ռեժիմի վերլուծում](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Infra/Postgres/SslMode.hs)
- [Ստեղծված տեղային տվյալների բազա](https://github.com/neohaskell/NeoHaskell/blob/main/neo/starter/docker-compose.yml)
- [Պահպանման ամբողջական կազմաձևում](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Config.hs)
- [Պահպանման ամբողջական ֆակտորին](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Storage.hs)
- [Պահպանման ամբողջական ծրագիր](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/App.hs)

</details>
