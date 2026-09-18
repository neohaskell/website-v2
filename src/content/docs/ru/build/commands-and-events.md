---
title: "Команды и события"
description: Добавьте бизнес-действие, разделяя запросы, принятые факты и состояние.
sidebar:
  order: 2
---
<!-- translation-source-sha256: 104b60cec22bebd56f918af33bd935d5443f2466be9360c4352e624d560d94df -->

Приложение должно различать запрошенное действие и принятое им действие. Это различие даёт место для выражения правил, объяснения отказов и проверки реализации агента.

**Команда** называет намерение. **Событие** называет принятый факт. В проекте `mug-shop` команда `AddItem` запрашивает выбор товара и количество, а `ItemAdded` записывает добавление, принятое Cart. [Модель событий](/ru/start/event-modeling/) придаёт этим именам общий смысл.

Эта страница продолжает первую рабочую Cart из раздела [первый рабочий срез](/ru/build/first-cart/). Первая страница создала все исходные файлы, необходимые для запуска среза. Здесь мы добавляем одно действие, создавая или заменяя определённые файлы в том же проекте. Сначала сфокусированные фрагменты объясняют решения; позже собранные файлы содержат настоящие заголовки модулей и импорты.

## Выберите правило до создания файлов

Из корня проекта `mug-shop` остановите `neo run` на время редактирования. Каталоги `src/Shop/Cart/Commands`, `src/Shop/Cart/Events` и `src/Shop/Cart/Queries` уже существуют после первого среза. Если вы открыли эту страницу напрямую, создайте их командой:

```sh
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Мы потребуем существующую Cart и положительное количество. Каждое принятое добавление становится одной позицией, даже если тот же запас выбран снова. Доступность и владение — отдельные политики, описанные в разделах [запас](/ru/build/stock-and-checkout/) и [управление доступом](/ru/build/access-control/). Это действие записывает выбор, но не утверждает, что запас зарезервирован.

## 1. Дайте новому факту собственное место

Создайте `src/Shop/Cart/Events/ItemAdded.hs`. Его полезная нагрузка сохраняет идентификаторы и количество, необходимые для объяснения принятого добавления:

```haskell
data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
```

`entityId` оставляет факт в потоке Cart. `stockId` идентифицирует запись запаса, а `quantity` сохраняет входное значение, прошедшее правило команды. Выведите стандартную поддержку полезной нагрузки события с каноническим помощником:

```haskell
deriveEvent ''Event
```

Это новый файл, поэтому его полное содержимое приведено в собранной контрольной точке ниже.

## 2. Расширьте словарь событий Cart

В `src/Shop/Cart/Event.hs` первого среза уже определён `CartEvent` с `CartCreated`. Замените объявление события расширенным списком:

```haskell
data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
```

В том же файле измените существующую функцию `getEventEntityId`, добавив новый случай:

```haskell
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId
```

Сохраните `deriveEvent ''CartEvent` после этих объявлений. `ItemAdded.Event` — полезная нагрузка; `ItemAdded` — её конструктор в списке принятых фактов предметной области. Маркер предоставляет обычную поддержку события, а имена и поля остаются вашей бизнес-моделью.

## 3. Сохраните выбор в состоянии Cart

Создайте `src/Shop/Cart/Item.hs` для значения, хранящегося в каждой позиции Cart:

```haskell
data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
```

Полный тип значения также предоставляет нужные ему экземпляры JSON. Теперь замените `src/Shop/Cart/Entity.hs` версией, которая добавляет массив `items`. Новая ветка обновления добавляет одну позицию:

```haskell
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

Функция обновления применяет принятый факт; она не проверяет запрос и не обращается к поставщику. Команда ниже допускает только положительные количества. Любой другой источник `ItemAdded` должен сохранять этот инвариант, потому что воспроизведение рассматривает событие как принятый факт.

Существующая ветка `CartCreated` также должна инициализировать `items` значением `Array.empty`. Сохраните эту инициализацию при замене файла.

## 4. Реализуйте решение

Создайте `src/Shop/Cart/Commands/AddItem.hs`. Запрос сообщает исполнителю команды, какой поток Cart нужно загрузить:

```haskell
getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId
```

Решение сначала отклоняет отсутствующую Cart, затем проверяет количество. Обратите внимание: событие сохраняет принятое входное значение:

```haskell
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]
```

`cartId` команды становится `entityId` события; `stockId` — идентификатор выбранного запаса, а не название товара. Объявление транспорта открывает запрос через веб-транспорт. Маркер команды генерирует обычную проводку из находящихся выше объявлений решения, сущности и транспорта:

```haskell
type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

## 5. Зарегистрируйте действие и обновите ответ

Замените `src/Shop/Cart/Service.hs` реестром, содержащим обе команды. Новая строка находится рядом с существующей регистрацией `CreateCart`:

```haskell
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

Замените `src/Shop/Cart/Queries/CartSummary.hs`, чтобы её проекция считала текущие позиции:

```haskell
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Сохраните `src/Shop/Cart/Core.hs` и `src/App.hs` от первого среза. Приложение уже регистрирует сервис и запрос Cart; изменение сервиса и проекции делает новую команду доступной и видимой. В [уроке о запросах](/ru/build/queries/) эта модель чтения и её асинхронное обновление объясняются подробнее.

## Создайте полные файлы добавления в Cart

Следующие блоки — собранные файлы для этой контрольной точки. Каждый заголовок — точный путь относительно корня проекта `mug-shop`. Создайте новые файлы и замените указанные выше.

### `src/Shop/Cart/Events/ItemAdded.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/ItemAdded.hs"
module Shop.Cart.Events.ItemAdded (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — заменить

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Item.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Item.hs"
module Shop.Cart.Item (CartItem (..)) where

import Core
import Json qualified

data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
  deriving (Generic)

instance Json.FromJSON CartItem
instance Json.ToJSON CartItem
```

### `src/Shop/Cart/Entity.hs` — заменить

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified
import Array qualified
import Shop.Cart.Item (CartItem (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}

update :: CartEvent -> CartEntity -> CartEntity
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Commands/AddItem.hs` — создать

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

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

### `src/Shop/Cart/Queries/CartSummary.hs` — заменить

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
canAccess = AccessControl.publicAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.publicView

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

### `src/Shop/Cart/Service.hs` — заменить

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

`src/App.hs`, `src/Shop/Cart/Core.hs`, `CreateCart.hs` и `Events/CartCreated.hs` от первого среза остаются на месте. [Архив добавления в корзину](/examples/mug-shop-cart.tar.gz) удобен для сравнения; эта страница содержит файлы, необходимые для реализованного добавления.

## Проверьте новое поведение

Из корня проекта `mug-shop`:

```sh
neo build
neo run
```

Создайте новую Cart с запросом из раздела [первый рабочий срез](/ru/build/first-cart/), затем замените `YOUR-CART-UUID` ниже. Фиксированный UUID запаса — иллюстративный выбор, пока урок о запасах не создаст настоящую запись.

```sh
curl -i http://localhost:8080/commands/add-item \
  -H 'Content-Type: application/json' \
  --data '{"cartId":"YOUR-CART-UUID","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}'
```

Ожидайте принятия, затем итог с одной позицией и `isEmpty: false`. Одна позиция содержит две единицы. Отправьте количество ноль: ожидайте HTTP 400 с `reason: "Quantity must be positive"`, при этом принятое количество позиций останется равным одному.

Объявление транспорта, регистрация сервиса и регистрация приложения вместе открывают `/commands/add-item`. Тип, лежащий в файле, ещё не является доступной возможностью. Модели чтения может понадобиться немного времени, чтобы догнать историю; повторите запрос, а не отправляйте добавление второй раз.

## Упражнение: ограничение для одной Cart

Выберите предел **шесть кружек на Cart**. Агент отклоняет запросы выше шести и говорит, что работа завершена. Что он пропустил?

<details>
<summary>Подсказка для рассуждения и свидетельства</summary>

Два добавления по четыре проходят такую проверку, но в сумме дают восемь. Уточните, относится ли предел к одному товару или ко всем товарам, а затем сравнивайте уже существующие количества с запросом. Проверьте обычное добавление, ровно шесть, больше шести и ещё одно добавление после достижения шести. Отклонённая операция не должна создавать успешный `ItemAdded`. Это расширение, которое проектируете вы, а не правило, уже присутствующее в этих файлах.

</details>

Далее: [сущности и состояние](/ru/build/entities-and-state/) объясняют, как принятые факты влияют на следующее решение.
