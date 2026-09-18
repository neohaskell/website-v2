---
title: Планируйте периодическую работу
description: Используйте тики таймера для запроса работы, не принимая их за надёжное расписание.
sidebar:
  order: 9
---
<!-- translation-source-sha256: b7d1f56484358a4c2ceb5fccedb2f55daa5519c02ebd35d2446b232de48cea87 -->

Некоторую работу нужно выполнять периодически: проверять истёкшие записи, опрашивать сервис или обновлять итог. Таймер может запрашивать эту работу, а правила приложения решают, что действительно пора делать. Разделение ответственностей упрощает понимание поведения после перезапуска.

NeoHaskell предоставляет простой внутрипроцессный таймер интеграции. Он полезен для периодических запросов, пока приложение работает. Это не постоянный планировщик заданий, который помнит каждый пропущенный запуск.

Сначала понаблюдайте за таймером, используя существующее правило создания Cart. Затем спроектируйте истечение срока резервирования Stock: сроки должны переживать перезапуск, хотя сам таймер этого не делает.

Все пути ниже указаны относительно корня проекта `mug-shop`. Урок создаёт три файла Cart, заменяет один файл сервиса и добавляет одну регистрацию приложения. Сначала идут сфокусированные объявления; полные получившиеся файлы следуют за каждым изменением.

## Дайте таймеру внутреннюю команду

Команды таймера используют диспетчер интеграций, который регистрирует только команды, объявленные с `InternalTransport`. Существующая `CreateCart` относится к `WebTransport`. Сохраните это публичное действие и дайте таймеру отдельную точку входа, делегирующую тому же решению.

Делегирование — бизнес-выбор: изменяется способ поступления запроса, но создание корзины остаётся согласованным.

```haskell
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context
```

Создайте `src/Shop/Cart/Commands/CreateCartInternal.hs`. У команды нет полей, и она создаёт новую корзину, поэтому `getEntityId` возвращает `Nothing`. Её транспорт внутренний:

```haskell
data CreateCartInternal = CreateCartInternal

getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing

type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]

deriveCommand ''CreateCartInternal
```

### Полный файл внутренней команды

Создайте файл по пути из заголовка и скопируйте весь файл, включая заголовок модуля и импорты.

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

Не добавляйте оба типа транспорта в `CreateCart`: фреймворк отклоняет смешивание внутреннего и публичного транспорта в одной команде. Это упражнение создаёт пустые корзины для наблюдения. После наблюдения удалите регистрацию таймера.

## Замените регистрацию сервиса Cart

Замените `src/Shop/Cart/Service.hs` файлом ниже или добавьте последнюю строку `Service.command` в существующий сервис Cart, если первые две регистрации не менялись:

```haskell
  |> Service.command @CreateCartInternal
```

Команда должна быть зарегистрирована до того, как таймер сможет её диспетчеризировать. Этот полный файл — точное наложение раздела Connect.

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

## Создайте интеграцию таймера

Создайте `src/Shop/Cart/Timers.hs`. Таймер превращает каждый тик во внутреннюю команду. Значение тика намеренно игнорируется: команда является запросом работы, а не идентификатором надёжного расписания.

```haskell
periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

### Полный файл таймера

Скопируйте весь файл в путь из заголовка.

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

## Добавьте таймер в `App.hs`

В `src/App.hs` добавьте этот импорт к другим импортам Cart:

```haskell
import Shop.Cart.Timers (periodicCartCreator)
```

Добавьте регистрацию после существующих регистраций сервисов и запросов:

```haskell
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

Фабрике `@()` не нужна конфигурация приложения. Этот полный файл продолжает уроки о рабочих процессах и загрузках, сохраняя их регистрации и добавляя таймер. Если вы пропустили необязательную возможность, удалите её импорт и регистрацию; сохраните все добавленные настройки аутентификации.

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

## Запустите и понаблюдайте первый тик

Перед редактированием остановите работающий сервер, затем запустите из `mug-shop`:

```sh
neo build
neo test
neo run
```

В другом терминале запросите `/queries/cart-summary`. После запуска должна появиться пустая Cart, а по мере работы таймера — новые. В каждой будет ноль позиций. После наблюдения остановите сервер и удалите строку `withInbound` и импорт `Shop.Cart.Timers`. Команды и модуль таймера можно сохранить, если хотите, чтобы полная контрольная точка собиралась; незарегистрированный таймер не запускается.

`Timer.every` вызывает `toCommand` со счётчиком тика **1 сразу после запуска рабочего**, выдаёт эту команду, а затем засыпает. Последующие тики увеличивают счётчик. Вспомогательные функции интервалов переводят секунды, минуты и часы в миллисекунды.

Счётчик тиков перезапускается вместе с рабочим. Это не надёжный идентификатор, не сохранённая последовательность и не свидетельство прошедшего календарного времени. Работа и диспетчеризация тоже занимают время, поэтому цикл не является планировщиком, выровненным по календарю. Приложение перезапускает входящих рабочих после сообщённых ошибок с возрастающей задержкой; это не восстанавливает надёжную очередь пропущенных тиков. Несколько экземпляров приложения также могут создать несколько рабочих таймера.

## Адаптируйте шаблон для резервирований

В учебном проекте спроектируйте команду, которая запрашивает проверку истечения срока по долговременному состоянию. Решите, как она находит ожидающие резервирования, сколько работы выполняет за один запуск и как собственная команда резервирования проверяет, что оно всё ещё может истечь.

Таймер должен инициировать этот процесс, а не кодировать правило «тик 20 означает, что это резервирование истекло». Сохраняйте настоящий срок с резервированием или связанным рабочим процессом. Используйте часы приложения и сохранённые факты в слое, отвечающем за решение о допустимости.

Сделайте повторные проверки истечения безопасными. Например, уже освобождённое резервирование не должно снова возвращать запас. Это правило относится к предметной области и её тестам, а не к интервалу сна таймера.

## Упражнение: перезапуск в середине срока

Пусть срок резервирования — десять минут, а приложение перезапускается через шесть. Объясните, что произойдёт при первом тике после запуска. Таймер сразу запросит проверку, но резервирование всё ещё использует исходный срок. Проверьте состояние до истечения, ровно на выбранной границе и после истечения. Затем повторите команду, перезапустите рабочего и запустите двух рабочих для одного резервирования. Результат Stock должен соответствовать вашей политике дублей.

Тест запуска должен ожидать немедленную первую команду. Тест бизнес-часов под управлением часов должен доказывать истечение без сна на десять минут.

Когда приложению нужно надёжное расписание, явно выберите или создайте такую возможность и подключите её через [абстракцию входящей интеграции](/ru/connect/custom-integrations/). Используйте [развёртывание](/ru/operate/deployment/), чтобы рассуждать о количестве рабочих и перезапусках.

<details>
<summary>Примечания об исходниках фреймворка</summary>

- [core/service/Integration/Timer.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Timer.hs)
- [testbed/src/Testbed/Cart/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
