---
title: Управление доступом
description: Решите, кто может действовать, какие записи им разрешено видеть и как проверять эти границы.
sidebar:
  order: 8
---
<!-- translation-source-sha256: e3b1320bfc67c0e36c85bdbdfdef805140d4e633600619dd900940207a5facdf -->

Разным людям нужен разный доступ к приложению. Кому-то можно разрешить просматривать запись, но не изменять её; кто-то может управлять своими записями, не видя чужих. Сначала это политики приложения, а уже потом настройки аутентификации.

NeoHaskell предоставляет механизмы идентичности и разрешений, но приложение должно подключить их и объявить свои политики. Мы потренируемся на покупателях, которым нужно видеть собственные корзины, и продавце с более широкими правами. В текущем проекте `mug-shop` намеренно разрешена локальная анонимная работа. Эта глава показывает, как ужесточить политики при подключении настоящего сервиса идентичности.

## Отделите идентичность от разрешения

**Аутентификация** устанавливает, кто вызывает приложение. **Авторизация** решает, что этому вызывающему разрешено делать или видеть.

Веб-транспорт может проверять учётные данные JWT, когда приложение подключает `Application.withAuth`. Команды получают полученную идентичность в `RequestContext.user`. Переданный клиентом `ownerId` не равнозначен проверенной идентичности пользователя.

Добавьте этот **шаг конвейера приложения** в `src/App.hs`, чтобы включить JWT-аутентификацию приложения через URL сервера аутентификации. Имя хоста в примере — заполнитель, а не работающий провайдер:

```haskell
Application.withAuth @() (\_ -> "https://auth.example.com")
```

Сохраните эту регистрацию, когда следующие главы будут расширять `App.hs`. Используйте настоящий сервис идентичности и протестируйте его discovery, issuer, audience и настройки токенов. `withAuthOverrides` поддерживает переопределения конфигурации. Настройка идентичности для конкретного развёртывания должна быть описана в эксплуатационной документации приложения.

## Защитите и команду, и запись

Команды могут определить функцию верхнего уровня `canAccess` до маркера `deriveCommand`. Маркер связывает её с проверкой разрешений перед выполнением. Без явной функции класс команды по умолчанию требует аутентификацию.

Разрешение использовать команду всё ещё может зависеть от конкретной записи, которой она управляет. В учебном проекте аутентифицированный покупатель не должен изменять чужую корзину. В функции решения сравните проверенный субъект с сохранённым владельцем корзины до принятия изменения. Написанный вами `AddItem` в `src/Shop/Cart/Commands/AddItem.hs` сейчас игнорирует контекст запроса.

Есть важная граница развёртывания: **без `Application.withAuth` текущий веб-транспорт создаёт доверенный контекст команды и обходит проверку разрешений команды**. Одного объявления `canAccess` недостаточно, чтобы защитить приложение с неподключённой аутентификацией. Проверки предметной области внутри `decide` остаются ответственностью вашего кода.

## Проверьте владельца до принятия изменения

В `src/Shop/Cart/Commands/AddItem.hs` замените `decide` и добавьте под ним `addForOwner`. Сохраните существующий помощник количества `addToCart` и объявления типов:

```haskell
decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"
```

Это **аутентифицированный вариант**, который нужно подключать вместе с настройкой сервиса идентичности. Он изменяет прежний анонимный контракт: исходные анонимные HTTP-тесты теперь не пройдут, пока вы не добавите действительные тестовые учётные данные и не создадите корзины от имени этой идентичности. Сохраните контрольную точку разработки и добавьте тесты владельца, другого пользователя и отсутствующего пользователя, вместо того чтобы молча ослаблять новое правило.

`CreateCart` уже записывает `context.user.sub` для вошедшего пользователя. Корзины, созданные анонимно в предыдущих упражнениях, автоматически не принадлежат новому вошедшему пользователю. При проверке этого варианта создавайте новые аутентифицированные корзины; перенос гостя в аккаунт требует отдельного явного дизайна.

## Защитите представление отдельно

Запросам нужны две политики. `canAccess` решает, может ли вызывающий использовать тип запроса; `canView` решает, видна ли конкретная строка.

Эта **замена политик CartSummary** использует настоящий API помощников. Она предполагает, что `CartSummary` сохраняет поле `ownerId :: Text`; `AccessControl` предоставляет помощник проверки владельца:

```haskell
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)
```

Разместите это до `deriveQuery`. `ownerOnly` сравнивает владельца строки с проверенным утверждением `sub`. Конечная точка исключает строки, не прошедшие `canView`; итоги пагинации она вычисляет после авторизации и фильтрации. Пользователь, которому разрешён доступ к запросу, но не принадлежат подходящие корзины, получает пустой набор результатов, а не чужую информацию.

В исходном CartSummary используются `publicAccess` и `publicView`. Они могут подходить каталогу товаров, но перед применением к данным покупателей осознанно выберите политику. Среди других помощников есть `requirePermission`, `requireAnyPermission`, `requireAllPermissions` и `tenantOnly`.

## Явно спроектируйте гостевые корзины

`CreateCart` записывает аутентифицированного субъекта, если он доступен; иначе генерирует анонимный идентификатор владельца. Этот идентификатор сам по себе не становится защищённой сессией браузера и не даёт позже вошедшему пользователю владение.

Если вы добавляете в учебный проект гостевое оформление заказа, решите, как гость доказывает доступ к корзине и как владение меняется после входа. Такой же вопрос возникает везде, где анонимная работа позднее должна принадлежать аутентифицированному пользователю. Смоделируйте и протестируйте этот переход. Не решайте его, принимая произвольный `ownerId` из тела запроса.

## Соберите аутентифицированный вариант

После выбора сервиса идентичности замените файлы команды и запроса ниже полными версиями. Они собирают описанные проверки владельца. Это необязательная ветка анонимного учебного проекта: её тесты должны передавать аутентифицированные идентичности. Если вы пока не настраиваете аутентификацию, сохраните прежнюю контрольную точку.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"

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
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)

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

Наконец, замените `src/App.hs` собранным ниже подключением аутентификации, подставив URL своего сервиса идентичности вместо `https://auth.example.com`. Это имя хоста — заполнитель. Если приложение уже расширено, сохраните эти изменения и вставьте `withAuth` после регистрации транспорта.

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
  |> Application.withAuth @() (\_ -> "https://auth.example.com")
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

После настройки настоящего провайдера запустите `neo build`. Обновите тесты решений контекстами аутентифицированных запросов, а HTTP-тесты — действительными учётными данными, прежде чем запускать `neo test`; прежние ожидания анонимного успеха больше не применяются. Проверьте владельца, другого пользователя, отсутствующие учётные данные и неверные токены. Эти полные файлы собирают политику приложения; настройка провайдера и проверка с учётными данными остаются частью применения этой необязательной ветки.

## Упражнение: корзина другого покупателя

Составьте план тестирования учебного проекта с двумя покупателями и одним продавцом. Что каждому разрешено читать и менять? Включите запрос без учётных данных и запрос с неверным токеном.

<details>
<summary>Подсказка для рассуждения и проверки</summary>

Владелец должен читать свою корзину и выполнять разрешённые изменения. Другой покупатель не должен ни видеть её строку, ни успешно изменять её. Доступ продавца зависит от вашей явной политики разрешений, а не только от факта входа. Отсутствующие учётные данные должны приводить к отказу аутентифицированного запроса; неверный токен должен отклоняться транспортом. Проверьте настоящую аутентифицированную веб-настройку вместе с модульными тестами: модульный тест не обнаружит, что в production забыли подключить аутентификацию.

</details>

Далее: [конфигурация](/ru/build/configuration/) делает эти решения о развёртывании явными.

Открытые исходники: [помощники доступа](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/AccessControl.hs), [контекст запроса](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Auth.hs), [значения команд по умолчанию](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Command/Core.hs), [конечная точка запроса](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Endpoint.hs), [диспетчеризация веб-аутентификации](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs).

Подключение внешнего аккаунта пользователя — отдельная задача по сравнению со входом в приложение. О таком процессе см. [аккаунты провайдеров и согласие](/ru/connect/provider-accounts/).
