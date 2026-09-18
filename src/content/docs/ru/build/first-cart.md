---
title: "Ваш первый работающий срез"
description: Дайте собственному проекту один запрос, один записанный факт и полезный ответ.
sidebar:
  order: 1
---
<!-- translation-source-sha256: ee9faef1c553e39b9740cb67730af2c3f85b251152a601d0d4ff137b366cae87 -->

Самый маленький полезный срез приложения связывает запрос человека с тем, что он может увидеть. Здесь вы построите этот срез в **собственном проекте `mug-shop`**: примете «создать корзину», запомните произошедшее и покажете итог пустой корзины.

Корзина — наш учебный пример. Та же форма может начать приложение для бронирования или проверки документа. Вы решаете, что означает действие; NeoHaskell связывает запрос, историю, состояние и представление.

Мы соберём срез по одной ответственности за раз. Каждый раздел сначала объясняет идею, затем показывает сфокусированную часть. После того как все решения станут ясны, страница даст каждый исходный файл приложения в его настоящем месте. Проект можно создать вручную, не скачивая архив и не угадывая, каких определений и импортов не хватает.

## Начните в собственном проекте

Сначала завершите [начало работы](/ru/getting-started/). На этой странице `mug-shop` уже создан командой `neo new mug-shop`. Откройте терминал в существующем проекте:

```sh
cd mug-shop
```

Все пути на этой странице указаны относительно каталога `mug-shop`. Сохраните его `neo.json`, запускающий файл и сгенерированную настройку сборки. `neo` предоставляет конфигурацию компилятора проекта; прагмы языка в файлах приложения не нужны.

Сгенерированный проект содержит пример Counter. Перед созданием файлов Cart удалите или переместите предоставленные файлы приложения:

```sh
rm -r src/Starter tests/Decider/Counter
rm tests/Property/CounterReplaySpec.hs
rm tests/scenarios/counter-flow.hurl tests/integration/smoke.hurl
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Сохраните `tests/Spec.hs`; [урок о тестировании](/ru/build/testing/) добавит файлы тестов Cart. Приведённые ниже исходные файлы образуют полный первый срез. Они заменяют `src/App.hs` и создают файлы в `src/Shop/Cart/`. `neo build` находит эти исходные файлы; отдельный список модулей поддерживать не нужно.

Модуль фреймворка `Core` и небольшой фасад предметной области `Shop.Cart.Core` выполняют разные задачи. Файлы, использующие типы фреймворка, импортируют `Core`. `Shop.Cart.Core` повторно экспортирует сущность Cart и типы событий, чтобы команды и запросы Cart могли использовать один импорт, ориентированный на предметную область.

## 1. Назовите факт, который хотите запомнить

Начните с принятого факта, потому что это надёжный ответ на вопрос «что произошло?». Факт таков: **корзина создана**. Ему нужны идентификатор корзины и идентификатор владельца. Создайте `src/Shop/Cart/Events/CartCreated.hs` и начните с этого сфокусированного объявления:

```haskell
data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
```

Поля — информация, придающая факту смысл при последующем чтении. Маркер говорит NeoHaskell предоставить обычную поддержку события:

```haskell
deriveEvent ''Event
```

Объявление сообщает, что означает событие; маркер предоставляет механические экземпляры и проводку событий. Полный файл появится ниже, после того как мы определим место события в модели Cart.

## 2. Дайте событию Cart место и маршрут

Создайте `src/Shop/Cart/Event.hs`. Тип событий предметной области перечисляет факты, способные изменить корзину. На первом этапе у него один конструктор:

```haskell
data CartEvent
  = CartCreated CartCreated.Event
```

`CartCreated.Event` — полезная нагрузка из файла выше. `CartCreated` — конструктор в словаре событий Cart. Помощник маршрутизации возвращает идентификатор потока факта:

```haskell
getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
```

Оставьте `getEventEntityId` в модуле событий. Файл сущности импортирует его до маркера `deriveEntity`, чтобы воспроизведение могло связать каждый факт с изменяемой им Cart. Маркер `deriveEvent` должен находиться после этих объявлений.

## 3. Превратите факт в текущее состояние

Сущность — текущее бизнес-состояние, восстановленное из принятых событий. Создайте `src/Shop/Cart/Entity.hs`. На первом срезе Cart нужны только идентификатор и владелец:

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }
```

Восстановление начинается с нулевого идентификатора и пустого владельца, а затем применяет факт создания:

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}
```

Начальное нулевое значение — отправная точка воспроизведения. Оно не доказывает, что настоящая Cart существует; эту идентичность устанавливает принятое `CartCreated`. Поместите `initialState` и `update` до `deriveEntity ''CartEntity ''CartEvent`. Вы предоставляете это бизнес-поведение; `deriveEntity` связывает его с поддержкой воспроизведения, JSON, состояния по умолчанию и маршрутизации событий фреймворка.

## 4. Примите запрос человека

`CreateCart` — команда, то есть запрос человека. У неё нет входных полей, потому что приложение генерирует идентификатор Cart. Создайте `src/Shop/Cart/Commands/CreateCart.hs`.

Сначала решение отклоняет поток, в котором уже есть состояние, а затем передаёт создание помощнику:

```haskell
decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context
```

Помощник создаёт UUID Cart и записывает `CartCreated`. Если вошедшей идентичности нет, это локальное упражнение генерирует идентификатор анонимного владельца. Такая пометка в истории не устанавливает сессию браузера и не доказывает, что будущий вызывающий владеет Cart; позднее [управление доступом](/ru/build/access-control/) делает эту политику явной.

Команда также объявляет используемые сущность и транспорт. Её маркер приходит из ориентированного на фреймворк импорта `Core`:

```haskell
type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

Полный файл команды содержит генерацию UUID и обе ветви решения.

## 5. Ответьте на вопрос экрана

Экрану нужен полезный ответ, а не вся история событий. Определите `CartSummary` в `src/Shop/Cart/Queries/CartSummary.hs` с вопросом, который задаёт первый экран:

```haskell
data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }
```

На этом этапе каждая Cart пуста, поэтому первая проекция запроса намеренно задаёт `count` равным нулю:

```haskell
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Это модель чтения. Она не решает, можно ли создать Cart. Её политика публичного доступа осознанно выбрана для локальной практики; частным данным приложения нужны другая политика и тесты. Маркер запроса связывает представление с читаемой сущностью:

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

Полный файл запроса сохраняет маркер до экземпляра `QueryOf`, потому что экземпляр использует поддержку `Query`, создаваемую маркером.

## 6. Сделайте части доступными

Сервис — реестр команд Cart. Создайте `src/Shop/Cart/Service.hs` и зарегистрируйте `CreateCart`:

```haskell
service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

Замените сгенерированный `src/App.hs`, чтобы приложение выбрало хранилище событий, веб-транспорт, сервис Cart и запрос Cart:

```haskell
app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

Полный `App.hs` ниже содержит конфигурацию `eventStore`. В нём используется `persistent = False`, поэтому после перезапуска история упражнения очищается. Позднее [конфигурация](/ru/build/configuration/) и [сохранение данных](/ru/operate/persistence/) сделают хранение явным выбором.

## Создайте полные файлы первого среза

Следующие блоки — собранные файлы, а не учебные фрагменты. Каждый заголовок — путь, который нужно создать или заменить из корня проекта `mug-shop`. Копируйте каждый блок как написано.

Полные файлы событий содержат `deriving (Eq)`, потому что примеры решений сравнивают значения записанных полезных нагрузок. Поддержка равенства отделена от маркера события; `deriveEvent` остаётся каноническим помощником экземпляров событий, создаваемых фреймворком.

### `src/App.hs` — заменить сгенерированное приложение

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

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

### `src/Shop/Cart/Events/CartCreated.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/CartCreated.hs"
module Shop.Cart.Events.CartCreated (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated

data CartEvent
  = CartCreated CartCreated.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Entity.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Core.hs` — создать фасад предметной области

<!-- complete-file -->
```haskell title="src/Shop/Cart/Core.hs"
module Shop.Cart.Core (
  module Shop.Cart.Entity,
  module Shop.Cart.Event,
) where

import Shop.Cart.Entity
import Shop.Cart.Event
```

### `src/Shop/Cart/Commands/CreateCart.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCart.hs"
module Shop.Cart.Commands.CreateCart (CreateCart (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Uuid qualified

data CreateCart = CreateCart

getEntityId :: CreateCart -> Maybe Uuid
getEntityId _ = Nothing

decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context

createCart :: RequestContext -> Decision CartEvent
createCart context = do
  cartId <- Decider.generateUuid
  case context.user of
    Just user ->
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = user.sub})]
    Nothing -> do
      anonymousId <- Decider.generateUuid
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = Uuid.toText anonymousId})]

type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

### `src/Shop/Cart/Queries/CartSummary.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

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
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

[Архив первого среза](/examples/mug-shop-first-cart.tar.gz) остаётся удобной контрольной точкой для сравнения, но для получения этих файлов он не нужен. Тесты из архива вводятся как написанные свидетельства в [уроке о тестировании](/ru/build/testing/).

## Соберите проект и отправьте запрос

Из корня проекта `mug-shop`:

```sh
neo build
neo run
```

В другом терминале запросите Cart:

```sh
curl -i http://localhost:8080/commands/create-cart \
  -H 'Content-Type: application/json' \
  --data '[]'
```

Ожидайте HTTP 200 и JSON-объект с `entityId`. Сохраните этот UUID. Тело `[]` — кодирование команды без полей.

Прочитайте представление:

```sh
curl http://localhost:8080/queries/cart-summary
```

Найдите строку, у которой `cartSummaryId` совпадает с вашим `entityId`. В ней должны быть `itemCount: 0` и `isEmpty: true`. Ответ представляет собой страницу с `items`, `total`, `hasMore` и `effectiveLimit`.

Модель чтения обновляется асинхронно. Если строка ещё не появилась, недолго повторяйте чтение. Повторная отправка команды создания создаст другую Cart, а не обновит исходную.

## Сохраняйте свидетельства, которые можно повторить

[Урок о тестировании](/ru/build/testing/) добавляет модульный сценарий для принятого события `CartCreated` и отказа существующей Cart, а также HTTP-сценарий, ожидающий пустой итог. До этого момента сборка, ответ сервера и ответ запроса выше — первая запускаемая контрольная точка. В необязательном архиве эти открытые исходники тестов приведены для сравнения.

Вы создали Cart, а не принятый заказ. В модели нет обещаний цены, платежа или выполнения заказа. Попросите агента указать факт, лежащий за каждым предлагаемым утверждением.

## Попробуйте вариацию

Создайте две Cart и найдите оба итога. Затем отправьте некорректный JSON, например тело, содержащее только `{`. Что должно остаться неизменным после такого отклонённого запроса?

<details>
<summary>Подсказка для рассуждения и проверки</summary>

Два успешных запроса должны вернуть разные ID и получить отдельные пустые итоги. Некорректный JSON должен дать ошибку клиента без принятого ответа создания. Пустая Cart — корректно созданная сущность, отличная от отсутствующей Cart. Перезапуск непостоянного приложения начинает упражнение заново.

</details>

Далее: [исследуйте Cart в визуальной IDE](/ru/getting-started/visual-ide/), запустив `neo ide` из того же проекта. Затем [добавьте новую команду](/ru/build/commands-and-events/).
