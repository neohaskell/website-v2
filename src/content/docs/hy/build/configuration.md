---
title: Կազմաձևում
description: Տիպավորված կարգավորումները կապեք Ձեր ծրագրի այն մասերին, որոնք սպառում են դրանք։
sidebar:
  order: 9
---
<!-- translation-source-sha256: 3efdbe4acc9f0b262596a1e4e03d8517882c1c2c7856ae43dd8256fee4c90191 -->

Միջավայրերի միջև ծրագրերին տարբեր կարգավորումներ են պետք՝ բիզնեսային կանոնները նույնը պահելով։ Կազմաձևումը այդ ընտրություններին անուններ է տալիս, վավերացնում դրանց տիպերը և բացահայտ է դարձնում գործող ծրագրի հետ կապը։

Տվյալների բազայի հասցեն կազմաձևում է։ Համաձայնեցված պատվերի գինը բիզնեսային պատմության մաս է։ Վաղը կարգավորում փոխելը չպետք է վերագրի երեկվա համաձայնությունը։

Ստորև օրինակները ցույց են տալիս համապատասխան հայտարարությունն ու վարքագիծը՝ յուրաքանչյուր նպատակակետը անվանելով։ Փոքր հատվածները մեկ-մեկ բացատրում են ընտրությունները, իսկ էջի վերջում հավաքված ֆայլերը ներառում են այդ հայտարարությունների համար անհրաժեշտ ներմուծումները։ [Build ֆայլերի ամբողջական արխիվը](/examples/mug-shop-build.tar.gz) լրացուցիչ է և պարունակում է նույն ստուգակետը՝ թեստերի հետ միասին։

## Ավելացրեք կարգավորում, որը կօգտագործի ծրագիրը

Մինչ այժմ ծրագիրը միշտ սկսվում է հիշողության մեջ դատարկ պատմությամբ։ Տեղային պահպանումը կդարձնենք զարգացման բացահայտ կարգավորում՝ լռելյայն պահելով նույն վարքագիծը։

Սկզբում անվանեք ընտրությունն ու դրա լռելյայնը․

```haskell
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

Դաշտը տեղադրեք `src/Shop/Config.hs`-ի `defineConfig "ShopConfig"`-ի ներսում։ Ստուգակետը պարունակում է ամբողջական սահմանումը։

`defineConfig`-ը ստեղծում է գրառում և դրա վերլուծիչը։ Դաշտն ունի նկարագրություն, Boolean տիպ, լռելյայն արժեք և միջավայրի փոփոխական։ Մակրոն պահանջում է, որ յուրաքանչյուր դաշտ ունենա նկարագրություն և մտածված լռելյայն կամ պարտադիր արժեքի քաղաքականություն։

## Կարգավորումը կապեք պահոցի հետ

Cart-ի և Stock-ի դասերն ավարտելուց հետո կարգավորումը կապեք Ձեր **տեղային մշակման ելակետի** հետ։ Եթե արդեն ավելացրել եք նույնականացում կամ այլ գրանցումներ, պահեք դրանք. ավելացրեք `Shop.Config` ներմուծումը, տեղադրեք `withConfig @ShopConfig`-ը և փոխարինեք միայն `withEventStore` քայլը։ Մի հեռացրեք ծրագրի թույլտվությունների կարգավորումը։

`src/App.hs`-ի համապատասխան խողովակաշարի քայլերը՝

```haskell
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
```

`withConfig`-ը գրանցում է բեռնվող տիպը։ Պահոցի ֆակտորին օգտագործում է բեռնված գրառումը։ Սա կարևոր կապն է. միայն `persistEvents` հայտարարելը պահպանումը չէր փոխի։

## Պարտադիր արժեքները ավելացրեք մտածված

Մատակարարի հավատարմագիրը կարող է լինել գաղտնիքի պարտադիր դաշտ։ Սա **դաշտերի ցանկի հատված** է, որը պետք է ավելացնել համապատասխան մատակարարն իրականացնելիս, ոչ թե ընթացիկ ծրագրի պահանջ․

```haskell
  , Config.field @Text "providerKey"
      |> Config.doc "Credential for the selected external provider"
      |> Config.required
      |> Config.envVar "SHOP_PROVIDER_KEY"
      |> Config.secret
```

Այնուհետև Ձեր ինտեգրումը պետք է սպառի `config.providerKey`-ը։ `required`-ը հաստատում է առկայությունը, բայց չի կարող ապացուցել, որ հեռավոր մատակարարն ընդունելու է հավատարմագիրը։

`Config.secret`-ը դաշտը թաքցնում է ստեղծված գրառման ցուցադրումից և JSON-ից։ Այն չի գաղտնագրում արժեքը և չի խանգարում կոդին արդյունահանումից հետո հում դաշտը մատյանում գրել։ Իրական հավատարմագրերը պահեք Ձեր տեղակայման հավատարմագրերի մեխանիզմում։

## Ստուգեք սպառողին, ոչ միայն վերլուծիչը

Բեռնիչը կարդում է գործընթացի արգումենտներն ու միջավայրի փոփոխականները։ `.env` ֆայլը ինքնաբերաբար չի մտնում գործընթացի միջավայր. այդ ձևաչափն ընտրելու դեպքում օգտագործեք բացահայտ բեռնիչ կամ Ձեր գործընթացի կառավարիչը։

`httpPort` անունով դաշտը նույնպես ինքնաբերաբար չի փոխում լսողին։ Ձեր ծրագիրը ներկայումս օգտագործում է `WebTransport.server`, որը լսում է 8080 պորտում։ Ֆիքսված այլընտրանքային զարգացման պորտի համար խողովակաշարի այդ քայլը փոխարինեք հետևյալով․

```haskell
  |> Application.withTransport (WebTransport.server {port = 8081})
```

Թարմացրեք հաճախորդներին համապատասխան։ Ներկայիս `neo test` HTTP աշխատանքային հոսքը հարցում է անում 8080 պորտին, այնպես որ ուսուցողական թեստերի համար պահեք այդ պորտը. միայն Hurl URL-ները փոխելը գործարկման ստուգումը չի փոխում։ Տե՛ս [CLI տեղեկատուն](/hy/reference/cli/)։ Եթե հետագայում պորտը դարձնեք կազմաձևվող, վերլուծված արժեքին հետևեք մինչև իրական տրանսպորտը և ստուգեք լսվող հասցեն։

## Հավաքեք տեղային պահպանման ստուգակետը

Այժմ դաշտն ու սպառողը տեսել եք առանձին։ Նույն `mug-shop` նախագծում ստեղծեք կամ փոխարինեք `src/Shop/Config.hs`-ը ստորև ամբողջական ֆայլով։

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
  ]
```

Այնուհետև `src/App.hs`-ի ծրագրային կապակցումը փոխարինեք այս ամբողջական տեղային ստուգակետով։ Եթե արդեն ավելացրել եք [մուտքի կառավարման](/hy/build/access-control/) նույնականացված տարբերակը, պահեք այդ քաղաքականությունը և `withConfig` ու `withEventStore` քայլերը տեղադրեք առկա խողովակաշարում՝ ամբողջ ֆայլը փոխարինելու փոխարեն։

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
```

Այս ֆայլերը ստեղծելուց կամ փոխարինելուց հետո գործարկեք `neo build`։ Լռելյայնով գործարկեք `neo test`, ապա հեռացրեք `.neo/events`-ը, եթե ցանկանում եք թարմ տեղային վարժություն։ `PERSIST_EVENTS=True`-ի դեպքում սերվերի իրադարձությունների գրացուցակը պահեք վերագործարկումների միջև և ստուգեք, որ նույն Cart ID-ն դեռ ունի իր ամփոփումը։ Սա զարգացման ստուգակետ է, ոչ թե արտադրական կայուն վերականգնման երաշխիք։

Վերագործարկման վարժության համար կանգնեցրեք մյուս սերվերները և գործարկեք․

```sh
PERSIST_EVENTS=True neo run
```

Օգտագործեք մեծատառ `True` և `False`. այս Boolean դաշտն օգտագործում է տիպավորված Haskell արժեքների վերլուծիչը։ Ստեղծեք զամբյուղ և պահեք դրա ID-ն։ Կանգնեցրեք սերվերը և նորից գործարկեք նույն հրամանը։ Կարդացեք զամբյուղի ամփոփումը՝ վերականգնման ու պրոյեկցիայի համար ժամանակ թողնելով։ Ավելի վաղ հիշողության մեջ ստեղծված զամբյուղները կարգավորումը միացնելով ֆայլերի չեն տեղափոխվում։

[Պահպանման գլուխը](/hy/operate/persistence/) բացատրում է PostgreSQL-ի անցումը և կայուն վերականգնման ստուգումը։ Տեղային իրադարձությունների ֆայլերը զարգացման օգտակար տարբերակ են. ծրագիր շահագործելու համար անհրաժեշտ են նաև պահուստային պատճեններ, վերականգնման ապացույց, պահպանման ընտրություններ և համապատասխան մուտք։

## Վարժություն․ ընտրովի՞, թե՞ սխալ կազմաձևված

Ձեր գործակալը պարտադիր մատակարարի բանալուն տալիս է դատարկ տողի լռելյայն արժեք, որպեսզի գործարկումը հաջողվի։ Ի՞նչ վարքագիծ եք ցանկանում, երբ մատակարարը հասանելի չէ կամ կազմաձևված չէ։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Եթե հնարավորությունը պարտադիր է, պահանջեք դրա հավատարմագիրը և բացակայության դեպքում հաղորդեք հստակ գործարկման ձախողում։ Եթե ընտրովի է, անջատված վիճակը մոդելավորեք բացահայտորեն։ Թեստավորեք վավեր կազմաձևումը, բացակայող պարտադիր արժեքը և անվավեր տիպավորված արժեքը։ Անվտանգ թեստային հավատարմագրերով ստուգեք թաքցնելը, իսկ առանձին ստուգեք, որ մատակարարն ստանում է կազմաձևված արժեքը։

</details>

Հաջորդը՝ [վերանայեք Ձեր ծրագիրը](/hy/build/your-shop/)՝ այն ավելի շատ համակարգերի միացնելուց առաջ։

API-ի տեղեկատու՝ [կազմաձևում](https://github.com/neohaskell/NeoHaskell/blob/main/core/config/Config.hs), [ծրագրի ֆակտորիներ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs), [պարզ պահոց](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Simple.hs)։
