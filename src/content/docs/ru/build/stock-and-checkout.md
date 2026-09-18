---
title: "Связанные изменения: запас и оформление заказа"
description: Добавьте вторую предметную область и определите, где её решения требуют координации.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 3365d2858cbd3e34499d408fb35db1cab4fe86484c41948e1edd6f1059e483a0 -->

Одно принятое действие может привести к другому решению. Приложение расписаний может принять запрос до резервирования комнаты; процесс работы с документом может сохранить черновик до одобрения проверяющим. Полезное приложение делает это различие видимым.

В учебном проекте появляется **Stock**. Cart записывает выбор, а запас отслеживает доступные и зарезервированные единицы. Здесь мы реализуем и протестируем решение о запасе, а затем свяжем его с добавлениями в Cart в [уроке об интеграциях](/ru/connect/workflows/).

Ниже показаны соответствующие объявления и поведение, причём для каждого названо место назначения. Небольшие фрагменты обучают одному решению за раз. Собранные файлы Stock далее на этой странице содержат полные модули, необходимые для этой контрольной точки. [Полный конец файлов раздела Build](/examples/mug-shop-build.tar.gz) — дополнительный материал; контрольную точку можно собрать, создав эти файлы в том же проекте.

## Сформулируйте обещания

`InitializeStock` создаёт запись с неотрицательным доступным количеством. `ReserveStock` резервирует положительное количество, только если его достаточно. При резервировании единицы переходят из `available` в `reserved`.

У идентификаторов товара и запаса разные задачи. Товар идентифицирует дизайн кружки; ID запаса идентифицирует запись доступности. В этом упражнении самостоятельно инициализируйте по одной записи запаса на товар; команда не проверяет уникальность товара.

Из корня проекта создайте каталоги модулей:

```sh
mkdir -p src/Shop/Stock/Commands src/Shop/Stock/Events src/Shop/Stock/Queries
```

## Дайте каждому факту отдельный файл

Инициализация записывает товар и начальное количество. Резервирование записывает количество, закреплённое за Cart. Вместе они образуют тип событий предметной области Stock в `src/Shop/Stock/Event.hs`:

```haskell
data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
```

Маркер события обрабатывает стандартные экземпляры:

```haskell
deriveEvent ''StockEvent
```

Каждая полезная нагрузка хранится отдельно в `Events/`. `Event.hs` перечисляет возможные факты и определяет, на какой поток запаса влияет каждый из них.

## Применяйте принятую историю

Сущность хранит текущую доступность. Применение резервирования перемещает его количество между двумя счётчиками:

```haskell
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }
```

Это обновление находится в `Entity.hs`. Оно не спрашивает сегодняшний склад, было ли вчерашнее принятое резервирование разумным. Команда проверяет запрос до того, как он становится фактом.

Как и `Core` Cart, `Core.hs` только повторно экспортирует типы предметной области и их операции. Добавление команды не превращает его в большой файл реализации.

## Инициализируйте запас, включая ноль

В `src/Shop/Stock/Commands/InitializeStock.hs` `InitializeStock` имеет два входных поля:

```haskell
data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }
```

Команда генерирует ID запаса и отклоняет отрицательное начальное количество. Ноль разрешён: у товара может быть запись запаса, даже если доступных единиц не осталось. После размещения решения и объявлений сущности и транспорта её маркер связывает их:

```haskell
deriveCommand ''InitializeStock
```

## Защитите резервирование

`ReserveStock` проверяет существование, положительное количество и доступность. Его итоговое решение в `src/Shop/Stock/Commands/ReserveStock.hs` сравнивает запрос с текущим состоянием:

```haskell
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]
```

Эта команда использует `InternalTransport`. Она предназначена для работы приложения; мы не открываем её как HTTP-конечную точку для покупателей. Урок об интеграциях предоставит ей триггер.

[Урок о тестировании](/ru/build/testing/) вызывает это решение напрямую. Правило последней единицы можно установить до того, как его начнёт вызывать автоматизация.

## Покажите результат и зарегистрируйте область

`StockLevel` предоставляет представление товара, доступного количества и зарезервированного количества. Его текущая публичная политика подходит локальной практике; подумайте заново, что должен раскрывать настоящий каталог.

Добавьте эти шаги к существующему конвейеру приложения, сохраняя регистрации Cart и все остальные:

```haskell
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## Решите, что обещает оформление заказа

Даже после соединения областей добавление в Cart может быть принято, а последующее резервирование отклонено. Оформлению заказа нужны видимый результат резервирования и реакция на частичный сбой. Спроектируйте следующие обещания как дальнейшие срезы:

| Обещание | Какое решение ещё нужно принять |
| --- | --- |
| Запас зарезервирован | Как Cart узнает, удалось ли резервирование? |
| Заказ принят | Какие цены, количества, валюта и сведения о доставке становятся фиксированными? |
| Платёж подтверждён | Какие свидетельства провайдера устанавливают факт платежа, включая поздние или дублирующие ответы? |
| Срок резервирования истёк | Какой факт освобождает запас и как истечение срока взаимодействует с платежом? |

Это политики приложения, а не следствия названий областей Stock или Cart.

## Соберите контрольную точку Stock

После того как решения стали понятны, создайте каталоги предыдущей командой и добавьте или замените файлы ниже в том же проекте `mug-shop`. Сохраните уже созданные файлы Cart и `tests/Spec.hs`. Эта контрольная точка сохраняет непостоянное локальное хранилище из урока о первой Cart; если вы добавили аутентификацию или другую политику транспорта, объедините шаги сервиса и запроса Stock с существующим конвейером `app`.

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockInitialized.hs"
module Shop.Stock.Events.StockInitialized (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , productId :: Uuid
  , available :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockReserved.hs"
module Shop.Stock.Events.StockReserved (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Event.hs"
module Shop.Stock.Event (StockEvent (..), getEventEntityId) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved

data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
  deriving (Eq)

getEventEntityId :: StockEvent -> Uuid
getEventEntityId change = case change of
  StockInitialized fact -> fact.entityId
  StockReserved fact -> fact.entityId

deriveEvent ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Entity.hs"
module Shop.Stock.Entity (StockEntity (..), initialState, update) where

import Core
import Shop.Stock.Event (StockEvent (..), getEventEntityId)
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Uuid qualified

data StockEntity = StockEntity
  { stockId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

initialState :: StockEntity
initialState = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 0, reserved = 0}

update :: StockEvent -> StockEntity -> StockEntity
update change stock = case change of
  StockInitialized initialized ->
    StockEntity
      { stockId = initialized.entityId
      , productId = initialized.productId
      , available = initialized.available
      , reserved = 0
      }
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }

deriveEntity ''StockEntity ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Core.hs"
module Shop.Stock.Core (
  module Shop.Stock.Entity,
  module Shop.Stock.Event,
) where

import Shop.Stock.Entity
import Shop.Stock.Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/InitializeStock.hs"
module Shop.Stock.Commands.InitializeStock (
  InitializeStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Stock.Core

data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }

getEntityId :: InitializeStock -> Maybe Uuid
getEntityId _ = Nothing

decide :: InitializeStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Just _ -> Decider.reject "Stock already initialized for this product!"
  Nothing -> initialize request

initialize :: InitializeStock -> Decision StockEvent
initialize request =
  if request.available < 0
    then Decider.reject "Available stock cannot be negative"
    else do
      stockId <- Decider.generateUuid
      Decider.acceptNew
        [StockInitialized (StockInitialized.Event {entityId = stockId, productId = request.productId, available = request.available})]

type instance EntityOf InitializeStock = StockEntity

type instance TransportsOf InitializeStock = '[WebTransport]

deriveCommand ''InitializeStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/ReserveStock.hs"
module Shop.Stock.Commands.ReserveStock (
  ReserveStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Stock.Core

-- | Command to reserve stock for a cart.
-- Keep reservation internal; the integration lesson supplies its trigger.
data ReserveStock = ReserveStock
  { stockId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }

getEntityId :: ReserveStock -> Maybe Uuid
getEntityId cmd = Just cmd.stockId

decide :: ReserveStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Stock not found!"
  Just stock -> reservePositiveQuantity request stock

reservePositiveQuantity :: ReserveStock -> StockEntity -> Decision StockEvent
reservePositiveQuantity request stock =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else reserveAvailableStock request stock

reserveAvailableStock :: ReserveStock -> StockEntity -> Decision StockEvent
reserveAvailableStock request stock =
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]

type instance EntityOf ReserveStock = StockEntity

type instance TransportsOf ReserveStock = '[InternalTransport]

deriveCommand ''ReserveStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Queries/StockLevel.hs"
module Shop.Stock.Queries.StockLevel (
  StockLevel (..),
  canAccess,
  canView,
) where

import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Stock.Core (StockEntity (..))

data StockLevel = StockLevel
  { stockLevelId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

-- | Authorization: Anyone can access stock levels (public catalog data)
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess claims = AccessControl.publicAccess claims

-- | Authorization: Anyone can view any stock level
canView :: Maybe UserClaims -> StockLevel -> Maybe AccessError
canView claims stockLevel = AccessControl.publicView claims stockLevel

-- | Use TH to derive Query instances.
-- Wires canAccess -> canAccessImpl, canView -> canViewImpl
deriveQuery ''StockLevel [''StockEntity]

instance QueryOf StockEntity StockLevel where
  queryId stock = stock.stockId

  combine stock _maybeExisting =
    Update
      StockLevel
        { stockLevelId = stock.stockId
        , productId = stock.productId
        , available = stock.available
        , reserved = stock.reserved
        }
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Service.hs"
module Shop.Stock.Service (
  service,
) where

import Core
import Service qualified
import Shop.Stock.Commands.InitializeStock (InitializeStock)
import Shop.Stock.Commands.ReserveStock (ReserveStock)
import Shop.Stock.Core ()

service :: Service _ _
service =
  Service.new
    |> Service.command @InitializeStock
    |> Service.command @ReserveStock
```

Если вы завершили уроки Cart и конфигурации, в `src/App.hs` должны быть показанные здесь регистрации сервиса и запроса Stock. Создавайте или заменяйте только конвейер, если у приложения пока нет дополнительных политик; в противном случае добавьте последние два шага, сохранив существующие хранилище, транспорт и регистрации Cart.

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

## Создайте и исследуйте запас

Теперь запустите контрольную точку из корня проекта:

```sh
neo build
neo run
```

Создайте запись запаса:

```sh
curl -i http://localhost:8080/commands/initialize-stock \
  -H 'Content-Type: application/json' \
  --data '{"productId":"11111111-1111-1111-1111-111111111111","available":3}'
```

Сохраните возвращённый `entityId` как ID запаса. Прочитайте его представление:

```sh
curl --get http://localhost:8080/queries/stock-level \
  --data-urlencode 'q=.stockLevelId == "YOUR-STOCK-UUID"'
```

После обновления проекции ожидайте три доступные и ноль зарезервированных единиц. Создайте Cart и отправьте `AddItem` с этим ID запаса и количеством два. В Cart должна быть одна позиция. **В Stock по-прежнему три доступные и ноль зарезервированных**: мы реализовали оба решения, но не связали их.

Это наблюдение — свидетельство. Два зарегистрированных сервиса не означают, что один вызывает другой. В разделе [подключение шагов приложения](/ru/connect/workflows/) вы добавите связь и проверите изменение до одной доступной и двух зарезервированных единиц.

## Сохраните повторяемую проверку Stock

Сохраните HTTP-сценарий ниже в `tests/scenarios/stock-flow.hurl`. Он создаёт собственную запись, ждёт её представление и проверяет отказ для отрицательного начального количества. Перед запуском `neo test` остановите `neo run`.

<details>
<summary>Полный файл: tests/scenarios/stock-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/stock-flow.hurl"
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}

HTTP 200
[Captures]
stock_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 3
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 0

POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"22222222-2222-2222-2222-222222222222","available":-1}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Available stock cannot be negative"
```

</details>

Из корня проекта запустите `neo test`. Захваченный ID запаса делает проверку независимой от прежних запусков, а повтор запроса позволяет проекции догнать историю. Эта страница пока не связывает `AddItem` с `ReserveStock`; такой триггер внутренней интеграции разбирается в разделе [подключение](/ru/connect/workflows/).

## Упражнение: последняя кружка

Агент говорит, что успешный запрос корзины доказывает, что последняя кружка принадлежит покупателю. Найдите недостающее свидетельство.

<details>
<summary>Подсказка для рассуждения и проверки</summary>

Запрос корзины устанавливает выбор. Проверьте решение о резервировании и записанный результат. Зарезервируйте две из трёх, отклоните четыре из трёх и примите ровно три. Для конкурирующих запросов на последнюю единицу нужна параллельная проверка на уровне приложения. Для повторных запросов нужна осознанная политика дублей; текущая команда может зарезервировать снова, если запаса достаточно.

</details>

Далее: [HTTP и фронтенды](/ru/build/http-and-frontend/) превращают эти результаты в честный интерфейс.
