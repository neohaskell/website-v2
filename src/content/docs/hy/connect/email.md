---
title: Ուղարկեք էլեկտրոնային նամակ
description: Գրանցեք մատակարարի ընդունումը և ծանուցման ձախողումը տեսանելիորեն մշակեք։
sidebar:
  order: 4
---
<!-- translation-source-sha256: 674d034499dc89d8cee7ca9de783120958d78666c98ee3fb6adfdf247ef01e54 -->

Էլեկտրոնային նամակը մարդկանց տալիս է Ձեր ծրագրից դուրս ուսումնասիրելի արդյունք՝ ծանուցում, հրավեր կամ հաստատում։ Այն նաև կարևոր տարբերակում է մտցնում. մատակարարի կողմից հաղորդագրության ընդունումը չի ապացուցում, որ ստացողը այն ստացել կամ կարդացել է։

NeoHaskell-ը ներառում է Brevo-ի և Azure Communication Services-ի (ACS) հարցման տիպեր։ Ուսումնական նախագծի պատվերի հաստատմամբ կսովորենք հարցման և callback-ի ձևը։ Մատակարարի հավատարմագրերը, հաստատված ուղարկողի կարգավորումը և կենդանի առաքումը առանձին աշխատանք են. սկսեք Ձեր վերահսկած թեստային ստացողից։

## Էլեկտրոնային նամակ ավելացրեք mug-shop-ին

Օգտագործեք Ձեր առկա նախագիծը և ավարտեք [ինտեգրման կարգավորումը](/hy/connect/#prepare-your-project)։ Հարցումներ կառուցող օգնականը տեղադրեք `src/Shop/Integrations/Email.hs`-ում։ Դրա կանչողը ծրագրի այն մասի ելքային մշակիչն է, որը տիրապետում է ծանուցման հարցմանը։ Մշակիչը գրանցեք `src/App.hs`-ում՝ հետևելով [աշխատանքային հոսքերի](/hy/connect/workflows/) ձևին։

Պատվերի հաստատմանը պետք են Ձեր նախագծած պատվերն ու ծանուցման աշխատանքային հոսքը. դրանք չեն առաջանում միայն այն պատճառով, որ Cart-ն ու Stock-ը կոմպիլյացվում են։ Նախ սկսեք վերահսկվող ծանուցման հարցումից՝ նախքան այն վճարման մաս դարձնելը։

## Սահմանեք արդյունքը նախ

Օգտագործեք `InternalTransport`-ով հայտարարված ծրագիր-հրաման, որը կարող է ներկայացնել մատակարարի ընդունումն ու ձախողումը։ Այն պետք է կրի ծանուցման նույնացուցիչը և սկզբնական գործողությանը կապելու համար անհրաժեշտ ցանկացած նույնացուցիչ։ Հաջող ճյուղը գրանցում է մատակարարի հաղորդագրության/գործողության ID-ն, իսկ ձախողման ճյուղը՝ անվտանգ բացատրություն, որը ծրագիրը կարող է ցույց տալ։

Էլեկտրոնային նամակը գործարկեք հաստատված իրադարձությունից։ Օրինակում ծանուցման ձախողումը չպետք է անհետացնի ընդունված պատվերը։ Անվտանգ վերաուղարկման համար մոդելավորեք ծանուցման փորձը և որոշեք, թե ինչպես են մշակվում կրկնվող ուղարկումները։

## Կազմաձևեք Brevo-ի հարցումը

Այս **մասնակի ֆակտորինը** նկարագրում է պարզ տեքստով հաղորդագրություն։ `emailKey`-ը `Redacted Text` հավատարմագրի արժեք է, իսկ `recordAccepted` ու `recordFailed`-ը վերադարձնում են նույն հրամանի տիպը։ Հասցեները հորինված օրինակներ են։

```haskell
Brevo.Request
  { sender = Brevo.sender "orders@example.com"
  , to = [Brevo.recipient customerEmail]
  , subject = "Your mug order"
  , body = Brevo.TextBody "We have received your order."
  , cc = []
  , bcc = []
  , replyTo = Nothing
  , tags = []
  , apiKey = emailKey
  , onSuccess = recordAccepted
  , onError = recordFailed
  }
  |> BrevoInternal.toHttpRequest
  |> Integration.outbound
```

Առանց կազմաձևման պարամետրի իրադարձության մշակիչի համար աջակցվող գործարկման ձևերից մեկը `emailKey`-ը `Redacted.wrap "${SHOP_BREVO_API_KEY}"` արժեքին դնելն է։ Սա հարցման մեջ պահում է տեղապահ, իսկ համօգտագործվող HTTP նույնականացման շերտը գործարկելիս այն բացում է սերվերի միջավայրից։ Այդ միջավայրի փոփոխականը սահմանեք Ձեր տեղակայման գաղտնիքների կազմաձևմամբ։ Իրական բանալին մի տեղադրեք իրադարձության կամ սկզբնաղբյուրի ֆայլում։

Ընթացիկ սկզբնաղբյուրի համար բացահայտ փոխարկումն անհրաժեշտ է. Brevo-ի ճակատը բացում է հարցման ֆակտորինը, բայց ուղղակի `ToAction (Brevo.Request command)` օրինակ չի տրամադրում։ `Integration.Brevo.Internal`-ը փաթեթը արտահանում է. այդ փոխարկումը մեկ ծրագրային օգնականում պահելը հեշտացնում է հետագա փոխարինումը։

Օգտագործեք `HtmlBody`, `TextBody` կամ `Template`. մարմնի տիպը թույլ է տալիս միանգամից մեկ այլընտրանք։ Template-ը կրում է `templateId` և պարամետրերի `Map Text Text`։ `Sender`-ն ու `Recipient`-ը տարբեր տիպեր են, ինչը օգնում է պատահմամբ դրանք չփոխանակել։

Ավելի կարճ `Brevo.send` կոնստրուկտորը կարդում է `?config.brevoApiKey`-ը։ Այն օգտագործեք միայն այնտեղ, որտեղ այդ implicit կազմաձևման արժեքը փաստացի կապված է։ Ծրագրի կազմաձևումը գրանցելը ինքն իրեն implicit պարամետր չի ավելացնում տիպավորված իրադարձության մշակիչի մաքուր ստորագրությանը։ Վերևի բացահայտ հարցումը հավատարմագրերի կապակցումը տեսանելի է դարձնում։

## Պատասխանը կարդացեք ճշգրիտ

Brevo-ի ադապտերը ճանաչում է HTTP 201-ը և վերծանում `messageId`-ը։ Անվավեր պատասխանի տվյալները անցնում են սխալի callback-ով։ Այն նույնականացման, հաշվի վարկի, արագության սահմանի, հաճախորդի և սերվերի կարգավիճակները քարտեզավորում է սխալի տեքստի։

ACS-ն օգտագործում է `Acs.Request`՝ `endpoint`, `sender`, `to`, `subject`, `body`, `accessToken` և երկու callback-ներով։ Դրա հանրային ճակատը ներառում է կատարման օրինակը, այնպես որ այն կարող է ուղղակիորեն փոխանցվել `Integration.outbound`-ին։ ACS-ի ընդունված պատասխանը բացում է `operationId`. սա ասինխրոն ուղարկման գործողություն է, ոչ թե առաքման հաստատում։ Token-ը `Redacted Text` է։ Դրա ստացման և թարմացման ռազմավարությունը տրամադրեք առանձին։

ACS endpoint-ները պահեք վստահելի կազմաձևման մեջ։ Դրա ադապտերը պարտադրում է HTTPS. միայն այդ ստուգումը բիզնեսին հատուկ host-ի թույլատրացանկ չէ։

Երկու ադապտերներն էլ օգտագործում են համօգտագործվող HTTP մեխանիզմը։ Նախքան մեկ ուղարկման փորձ ենթադրելը կարդացեք [կրկնության ընթացիկ սահմանափակումը](/hy/connect/http-and-payments/#understand-the-current-retry-boundary)։

## Ծանուցումն անցկացրեք Ձեր ծրագրով

`mug-shop`-ում օգնականի և մշակիչի գրանցումը ստուգելու համար օգտագործեք `neo build`։ Հարցման ու պատասխանի ֆիքսված օրինակների համար գործարկեք `neo test`, ապա `neo run`-ը սկսեք իր միջավայրում դրված զարգացման էլեկտրոնային փոստի հավատարմագրով։ Ձեր թեստային ստացողին ծանուցում խնդրեք և փոստարկղը ստուգելուց առաջ ուսումնասիրեք արդյունքի հարցումը։ Այս դիտարկումները առաքման ճանապարհի տարբեր մասեր են հաստատում։

## Ստուգեք, թե ինչին կարող է Jess-ը վստահել

Նախ ստուգեք հարցման և պատասխանի քարտեզավորումը՝ առանց նամակ ուղարկելու. ներառեք օգտագործած մարմնի այլընտրանքներն ու սխալ ձևավորված ընդունված պատասխանները։ Այնուհետև վերահսկվող մատակարարի միջավայրում ուղարկեք մեկ հաղորդագրություն և ուսումնասիրեք թե՛ ծրագրի արդյունքը, թե՛ ստացողի փոստարկղը։

**Վարժություն․** մատակարարը ընդունում է նամակը, բայց Ձեր ծրագրում ընդունումը գրանցելը ձախողվում է։ Բացատրեք, թե «վերաուղարկել» կոճակն ինչ պետք է անի։

<details>
<summary>Առաջարկվող հիմնավորում</summary>

Տեղային արդյունքը համարեք չորոշված։ Պահեք ծանուցման կայուն ինքնությունն ու հասանելի մատակարարի ապացույցը, սահմանեք այն ուսումնասիրելու եղանակը և որոշեք՝ կրկնակի նամակի ռիսկն ընդունելի՞ է։ Թեստավորեք կրկնվող գործարկող իրադարձություններն ու ուշացած արդյունքները՝ սովորական ընդունված/ձախողված ճանապարհների հետ միասին։

</details>

Հաջորդը սովորեք, թե ինչպես են [ֆայլային կցորդները](/hy/connect/files/) կապում պահված բայթերը ծրագրային գործողությունների հետ։

<details>
<summary>Շրջանակի սկզբնաղբյուրի նշումներ</summary>

- [integrations/Integration/Brevo.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo.hs)
- [integrations/Integration/Brevo/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Request.hs)
- [integrations/Integration/Brevo/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Response.hs)
- [integrations/Integration/Brevo/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Internal.hs)
- [integrations/test/Integration/Brevo/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Brevo/InternalSpec.hs)
- [integrations/Integration/Acs/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Request.hs)
- [integrations/Integration/Acs/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Response.hs)
- [integrations/Integration/Acs/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Internal.hs)
- [core/core/Redacted.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Redacted.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/nhintegrations.cabal](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/nhintegrations.cabal)

</details>
