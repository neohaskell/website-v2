---
title: HTTP և frontend-ներ
description: Միջերեսը միացրեք հրամաններին ու հարցումներին և հաղորդեք յուրաքանչյուր հարցման կարգավիճակը։
sidebar:
  order: 6
---
<!-- translation-source-sha256: 79f3faf0995deda2ea89dd830481ff910c8c7013965e158eaef5f051d10cffc7 -->

Օգտատիրոջ միջերեսը ընտրությունները վերածում է հարցումների և ցույց է տալիս դրանց արդյունքները։ Այն պետք է տարբերակի ընդունումը, դեռ ընթացքի մեջ գտնվող աշխատանքը և ձախողումը, որպեսզի մարդիկ իմանան՝ ինչ տեղի ունեցավ և ինչ կարող են անել հետո։

NeoHaskell-ի վեբ տրանսպորտը հրամաններն ու հարցումները հասանելի է դարձնում HTTP-ով։ Միջերեսը կարող եք կառուցել Ձեր թիմին հարմար frontend շրջանակով։ Ընթացիկ տրանսպորտը մատուցում է ծրագրի API-ն ու դրա փաստաթղթերը, բայց ընդհանուր ստատիկ frontend հոսթինգի API չի տրամադրում։

Մեր աշխատող օրինակը էլեկտրոնային առևտրի ուսումնական նախագծի խանութն է։ Զամբյուղի ավելացումը, սպասող ամրագրումը և հաստատված պատվերը մեզ տալիս են կոնկրետ օրինակներ այն տարբեր վիճակների համար, որոնք միջերեսը պետք է հաղորդի։

Օրինակները շարունակվում են նույն `mug-shop` նախագծում։ Այս դասում իրականացվում է API-ի մասը. զննարկչային frontend-ը կամընտրական հաճախորդ է, որը կարող եք ավելացնել Neo նախագծի կողքին։

## Սկսեք իրական պայմանագրից

[Ձեր ծրագիրը](/hy/build/first-cart/) `neo run`-ով գործարկելիս բացեք `http://localhost:8080/docs`՝ ստեղծված API-ի փաստաթղթերը ուսումնասիրելու համար։ Նույն սխեման հասանելի է `/openapi.json` և `/openapi.yaml` հասցեներում։

| Նպատակ | Օրինակային երթուղի | Հաջողության իմաստ |
| --- | --- | --- |
| Ուղարկել բիզնեսային հարցում | `POST /commands/add-item` | Cart-ի հրամանն ընդունվել է։ |
| Կարդալ ներկայացում | `GET /queries/cart-summary` | Հասանելի և լիազորված ներկայացման տողերով էջ է վերադարձվել։ |
| Ուսումնասիրել միջերեսը | `GET /openapi.json` | Ծրագրի ստեղծած API սխեման վերադարձվել է։ |

Գրանցումն է վարում միջերեսը. հրամանը հայտարարում է իր տրանսպորտը, ծառայությունը գրանցում է հրամանը, իսկ ծրագիրը գրանցում է ծառայությունն ու հարցումները։ HTTP երթուղիներն օգտագործում են kebab-case անուններ։ Մի եզրակացրեք երթուղին էկրանի պիտակից, օրինակ՝ «վճարում», եթե համապատասխան հրաման գոյություն չունի։

## Հավաքեք HTTP ծրագրի կապակցումը

Եթե Ձեր նախագիծը դեռ օգտագործում է տեղային ոչ կայուն պահոց, ստեղծեք կամ փոխարինեք `src/App.hs`-ը այս ամբողջական կապակցմամբ։ Այն վեբ տրանսպորտով հասանելի է դարձնում Cart-ի ու Stock-ի հրամանները և դրանց հարցումների ներկայացումները։ Եթե Ձեր `App.hs`-ն արդեն ունի կազմաձևում, նույնականացում կամ մեկ այլ տրանսպորտի քաղաքականություն, պահեք այդ քայլերը և ավելացրեք միայն բացակայող ծառայության ու հարցման գրանցումները։

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

Նախագծի արմատից գործարկեք `neo build`, ապա `neo run`։ Բացեք `/docs` և `/openapi.json`՝ զննարկիչ միացնելուց առաջ հաստատելու համար, որ գրանցված հրամաններն ու հարցումները կան ստեղծված պայմանագրում։

## Միացրեք մեկ գործողություն

Այս **մասնակի զննարկչային JavaScript ֆունկցիան** ուղարկում է Ձեր ծրագրի `AddItem` հարցումը։ Կանչեք այն [պահեստ և վճարում](/hy/build/stock-and-checkout/) բաժնի իրական ID-ներով։ Այն ենթադրում է, որ ուսումնական frontend-ն օգտագործում է նույն origin-ի proxy `/commands`-ի համար։ Միջօրինակային մշակման դեպքում անհրաժեշտ է սերվերի CORS-ի բացահայտ կազմաձևում։

```javascript
async function addMugs(cartId, stockId, quantity) {
  const response = await fetch('/commands/add-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, stockId, quantity }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.reason ?? result.error ?? 'Could not add mugs');
  }
  return result.entityId;
}
```

Սա հարմարեցված մասնակի զննարկչային ֆունկցիա է, ոչ թե ամբողջական frontend ֆայլ։ Տեղադրեք այն Ձեր frontend-ի օգտագործած մոդուլում (օրինակ՝ ստեղծեք `frontend/cart.js`, եթե նախագիծը դեռ զննարկչային կոդ չունի) և կանչեք AddItem ձևի իրադարձությունների մշակիչից։ Neo նախագիծը չի ստեղծում այդ frontend գրացուցակը և դրա համար proxy չի կազմաձևում։ Նույնականացված ծրագիրը պետք է նաև իր հավատարմագիրը տրամադրի՝ նույնականացման կարգավորմանը համապատասխան։ Այս տեղային ուսումնական ֆունկցիան ամբողջական հաճախորդի նստաշրջանի իրականացում չէ։

Միջերեսը պետք է անջատի պատահական կրկնվող ուղարկումները, քանի դեռ հարցումն ընթացքի մեջ է, ցույց տա օգտակար մերժում և ընդունումից հետո թարմացնի համապատասխան հարցումը։ Կորած ցանցային պատասխանը հատուկ խնամք է պահանջում. սերվերը գուցե արդեն ընդունել է հարցումը։ Նախքան գրառումները ինքնաբերաբար նորից ուղարկելը որոշեք, թե ինչպես է ծրագիրը հայտնաբերելու կրկնօրինակները։

## Արդյունքները մշակեք առանձին

Վեբ տրանսպորտը ընդունված հրամանի պատասխանը վերածում է HTTP 200-ի։ Բիզնեսային մերժումները ներկայումս վերածվում են 400-ի՝ `reason`-ով, իսկ հրամանի ձախողումները նույնպես՝ 400-ի, բայց `error`-ով։ Ուսումնասիրեք պատասխանի մարմինը կարգավիճակի հետ միասին՝ յուրաքանչյուր 400-ը սխալ JSON չհամարելու փոխարեն։

Նույնականացման և թույլտվության ձախողումները օգտագործում են 401 կամ 403։ Չգրանցված երթուղին տալիս է 404։ Կարդալու մոդելները կարող են ժամանակավորապես հետ մնալ ընդունված գրառումից, ուստի «ընդունված, թարմացվում է» օգտակար միջերեսային վիճակ է։ Կարդալու սահմանափակված կրկնությունը տարբերվում է գրառումը վերարտադրելուց։

## Զննարկչի մուտքը տեղադրեք ծրագրի կապակցման մեջ

API-ն ունի `CorsConfig`՝ թույլատրելի origin-ներով, մեթոդներով, վերնագրերով և նախնական հարցման քեշի ընտրովի տարիքով։ Այս **ծրագրային կապակցման մասնակի արտահայտությունը** ցույց է տալիս տեղային frontend-ի քաղաքականություն. դրա համար անհրաժեշտ են առկա `Application` և `WebTransport` ներմուծումները․

```haskell
Application.withCors @() (\_ -> WebTransport.CorsConfig
  { allowedOrigins = ["http://localhost:4321"]
  , allowedMethods = ["GET", "POST", "OPTIONS"]
  , allowedHeaders = ["Content-Type", "Authorization"]
  , maxAge = Just 600
  })
```

Կիրառեք այն Ձեր ծրագրի խողովակաշարում և օգտագործեք Ձեր իրական frontend origin-ը։ CORS-ը կարգավորում է զննարկչի մուտքը, բայց բիզնեսային թույլտվություն չի տալիս։ Մասնավոր տեղեկությունը պաշտպանեք [մուտքի կառավարմամբ](/hy/build/access-control/)։

Ստեղծեք կամ փոխարինեք `tests/scenarios/create-cart.hurl`-ը այս ամբողջական API ստուգմամբ։ Այն զննարկիչ ավելացնելուց առաջ API-ի պայմանագրին տալիս է կրկնելի սերվերային սահման։ `neo test`-ը գործարկելուց առաջ կանգնեցրեք `neo run`-ը։

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

Նախագծի արմատից գործարկեք `neo test`։ Hurl ստուգումը ապացուցում է API-ի պատասխանը և հարցման վերջնական թարմացումը, բայց չի ապացուցում, որ զննարկչի դասավորությունը, proxy-ն կամ նույնականացման մատակարարը կազմաձևված են։

## Վարժություն․ ուշացած ամփոփում

Սերվերն ընդունել է ավելացումը, բայց հաջորդ ամփոփումը դեռ դատարկ է երևում։ Նախագծեք էկրանի հաջորդ երեք գործողությունները՝ առանց մեկ այլ ավելացում ուղարկելու։

<details>
<summary>Առաջարկվող հիմնավորում և ստուգումներ</summary>

Ցույց տվեք ընդունումը՝ սպասող թարմացմամբ, սահմանափակված միջակայքում նորից կարդացեք և, եթե ներկայացումը շարունակում է հնացած մնալ, առաջարկեք հստակ թարմացման կամ վերականգնման վիճակ։ Ստուգեք սովորական թարմացումը, մերժված զրո քանակը և ուշացած պրոյեկցիան։ Առանձին նմանակեք ուղարկումից հետո ցանցային սխալը. «չկարողացանք հաստատել արդյունքը» ավելի ճշգրիտ է, քան «ավելացումը ձախողվեց» պնդելը։ Ստուգեք, որ կրկնակի սեղմումը լուռ երկու անգամ չի ավելացնում։

</details>

Հաջորդը՝ [թեստավորեք վարքագիծը](/hy/build/testing/)։

Հանրային սկզբնաղբյուրներ՝ [վեբ տրանսպորտ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs), [հրամանի պատասխաններ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Response.hs), [ծրագրի կապակցում](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)։
