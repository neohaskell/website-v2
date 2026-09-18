---
title: "Тестирование поведения"
description: Пишите проверки решений, восстановленного состояния и HTTP-поведения собственного проекта.
sidebar:
  order: 7
---
<!-- translation-source-sha256: 69e400893ac5fa78dc7f5610ae62af95ffec32b6f77f5a956175b82183e26e13 -->

«Код компилируется» и «этот запрос соблюдает задуманное правило» — разные утверждения. Уверенность растёт, когда вы проверяете каждое обещание в месте, где оно может нарушиться. Быстрый тест решения объясняет отказ; HTTP-тест проверяет, что запущенное приложение действительно предоставляет обещанное поведение.

Вы отвечаете за задуманные результаты. Агент может помочь реализовать проверки, запустить их и объяснить ошибку. Сохраняйте узнаваемые примеры: две единицы приняты, ноль отклонён, одна единица принята на границе.

Все приведённые ниже файлы принадлежат создаваемому проекту `mug-shop`. Сохраните сгенерированный `tests/Spec.hs`; CLI находит тесты и запускает их через `neo test`.

Ниже показаны соответствующие объявления и поведение, причём для каждого названо место назначения. Сфокусированные фрагменты помогают увидеть проверяемую границу. Полные тестовые модули далее на странице уже содержат импорты и помощники, поэтому их можно напрямую создать в том же проекте. [Полный конец файлов раздела Build](/examples/mug-shop-build.tar.gz) — дополнительный материал.

## Сопоставьте проверку с обещанием

| Вопрос | Полезная граница |
| --- | --- |
| Отклоняется ли нулевое количество? | Решение команды. |
| Сохраняет ли воспроизведение отдельные добавления? | Обновление сущности. |
| Возвращает ли запрос обещанный ответ и представление? | Запущенное HTTP-приложение. |
| Резервирует ли добавление в корзину запас? | Интеграция и обе области; добавляется в разделе [подключение](/ru/connect/workflows/). |
| Принимает ли провайдер настоящий запрос? | Его песочница или контролируемая проверка в рабочей среде. |

Поддельный ответ провайдера даёт детерминированный локальный тест. Он не доказывает, что ваш аккаунт, учётные данные или настоящий запрос приняты.

## Проверьте решение напрямую

В `tests/Decider/Cart/AddItemSpec.hs` один тест проверяет полностью принятый факт. Его тело использует разные фиксированные UUID Cart и запаса:

```haskell
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])
```

Полные файлы событий включают поддержку равенства для этих утверждений полной полезной нагрузки. Это отделено от созданных маркером экземпляров сериализации и отображения события; в концептуальных уроках эта деталь тестирования опущена.

Помощник запускает `Decision` с контекстом, способным генерировать ID. База данных и сервер не нужны. Принятый результат проверяется по типу вставки и полной полезной нагрузке события, поэтому неверные ID запаса или количество становятся видимыми.

Два фиксированных UUID намеренно различны, поэтому перестановка ID Cart и запаса будет обнаружена. Эти тесты проверяют правила решения, а не генерацию UUID или поиск потока. Передача состояния напрямую намеренно проверяет решение изолированно. Исполнитель приложения устанавливает, существует ли сущность на самом деле.

## Проверьте восстановление

В `tests/Decider/Cart/ReplaySpec.hs` передайте принятые факты через ту же функцию обновления, которую использует приложение:

```haskell
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

Эта проверка применяет два отдельных добавления. Она защищает выбранный нами смысл позиции. Можно также проверить количества, хранящиеся в каждой позиции; более позднее изменение для объединения повторных товаров требует новой явной политики и соответствующих свидетельств.

## Протестируйте внутреннюю команду

Чтобы протестировать правило `ReserveStock`, необязательно открывать его через HTTP. В `tests/Decider/Stock/ReserveStockSpec.hs` начните с одной единицы и запросите две:

```haskell
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")
```

Принятие последней единицы и отказ для лишних — разные проверки. Эти последовательные тесты не устанавливают, как два одновременных запроса конкурируют за последнюю единицу. До принятия более сильного обещания добавьте сценарий параллельной работы на уровне приложения.

## Соберите контрольную точку тестирования

Создайте эти каталоги, если их ещё нет:

```sh
mkdir -p tests/Decider/Cart tests/Decider/Stock tests/scenarios
```

Следующие полные модули можно добавить в проект как новые файлы. Сохраните сгенерированный `tests/Spec.hs`: он найдёт эти модули. Если модуль уже существует, замените его соответствующим файлом, чтобы его импорты и контекст помощников оставались согласованы с утверждениями.

<!-- complete-file -->
```haskell title="tests/Decider/Cart/CreateCartSpec.hs"
module Decider.Cart.CreateCartSpec (spec) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.CreateCart (CreateCart (..), decide)
import Shop.Cart.Core (CartEvent (..), initialState)
import Task qualified
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Task.yield Uuid.nil}) decision

spec :: Spec Unit
spec = describe "CreateCart" do
  it "records the generated cart and anonymous owner" \_ -> do
    result <- runDecision (decide CreateCart Nothing Auth.emptyContext)
    result |> shouldBe (AcceptCommand StreamCreation
      [CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = Uuid.toText Uuid.nil})])

  it "rejects an existing cart" \_ -> do
    result <- runDecision (decide CreateCart (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart already exists!")
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/AddItemSpec.hs"
module Decider.Cart.AddItemSpec (spec) where

import Core
import Array qualified
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Maybe qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.AddItem (AddItem (..), decide)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

cartIdFixture :: Uuid
cartIdFixture = Uuid.fromText "11111111-1111-1111-1111-111111111111" |> Maybe.getOrDie

stockIdFixture :: Uuid
stockIdFixture = Uuid.fromText "22222222-2222-2222-2222-222222222222" |> Maybe.getOrDie

spec :: Spec Unit
spec = describe "AddItem" do
  it "records the requested stock and quantity" \_ -> do
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])

  it "rejects a missing cart" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart not found!")

  it "rejects zero" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 0}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "accepts the smallest positive quantity" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 1})])
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/ReplaySpec.hs"
module Decider.Cart.ReplaySpec (spec) where

import Array qualified
import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Core (CartEntity (..), CartEvent (..), initialState, update)
import Test
import Uuid qualified

spec :: Spec Unit
spec = describe "Cart replay" do
  it "starts empty after creation" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let cart = initialState |> update created
    cart.items |> Array.length |> shouldBe 0
    cart.ownerId |> shouldBe "owner"

  it "retains separate entries for successive additions" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

<!-- complete-file -->
```haskell title="tests/Decider/Stock/ReserveStockSpec.hs"
module Decider.Stock.ReserveStockSpec (spec) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Stock.Commands.ReserveStock (ReserveStock (..), decide)
import Shop.Stock.Core (StockEntity (..), StockEvent (..), initialState)
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

request :: Int -> ReserveStock
request quantity = ReserveStock {stockId = Uuid.nil, cartId = Uuid.nil, quantity = quantity}

spec :: Spec Unit
spec = describe "ReserveStock" do
  it "accepts the last available unit" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 1) (Just stock) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [StockReserved (StockReserved.Event {entityId = Uuid.nil, quantity = 1, cartId = Uuid.nil})])

  it "rejects more units than remain" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")

  it "rejects zero quantity" \_ -> do
    result <- runDecision (decide (request 0) (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "rejects missing stock" \_ -> do
    result <- runDecision (decide (request 1) Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Stock not found!")
```

Запустите `neo build`, затем `neo test`. Эти модули устанавливают границы чистых решений и воспроизведения; приведённый файл Hurl устанавливает границы работающего транспорта и проекции. Если позже добавите правила владения или повторных запросов, добавляйте тесты для этих решений, а не меняйте существующий ожидаемый результат под новую реализацию.

HTTP-проверка первого среза — отдельный небольшой файл. Когда захотите отдельно проверить маршрут создания и его пустой итог, создайте или замените `tests/scenarios/create-cart.hurl` следующим содержимым:

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

## Проверьте запущенное приложение

После добавления модулей выше создайте или замените `tests/scenarios/cart-flow.hurl` этим полным сценарием:

<details>
<summary>Полный файл: tests/scenarios/cart-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/cart-flow.hurl"
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

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}

HTTP 200

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":0}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Quantity must be positive"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false
```

</details>

Этот тест создаёт собственную корзину, поэтому не зависит от вчерашних ID. Он проверяет, что отклонённый нулевой запрос оставляет в представлении одну принятую позицию. Повторы относятся к чтению: повтор принятого добавления может добавить его снова.

Остановите любой сервер `neo run`, затем выполните из корня проекта:

```sh
neo test
```

CLI запускает ваши тесты Haskell и поднимает приложение для сценариев Hurl. Прошедший тест решения при неудачном HTTP-сценарии часто указывает на регистрацию, сериализацию, конфигурацию или интеграцию, а не только на правило. Найдите границу отказа до изменения бизнес-логики.

## Сохраните регрессионную проверку, объясняющую ошибку

Предположим, агент реализовал ограничение **корзины** в шесть единиц, проверяя каждый запрос только относительно шести. Добавьте четыре, затем запросите ещё четыре. По этой политике второй запрос должен быть отклонён. Запустите падающую проверку до исправления реализации и сохраните её после.

Не меняйте ожидаемый результат только для того, чтобы тест прошёл. Если политика меняется, явно опишите изменение, а затем обновите свидетельства согласно новой договорённости.

## Упражнение: потерянный ответ

Клиенту не удалось дождаться ответа после запроса двух кружек. Агент предлагает автоматически повторить команду. Какой тест обнаружит риск?

<details>
<summary>Подсказка для рассуждения и проверки</summary>

Организуйте ситуацию, в которой сервер принимает первый запрос, но ответ теряется. Отправьте тот же запрос снова и исследуйте историю и состояние. Текущая команда может принять второе добавление. Решите, какой идентификатор или другая политика должна отличать повтор от нового намеренного запроса. Проверьте первую отправку, повтор и намеренно другой запрос. Отключение кнопки — полезное поведение интерфейса, но оно не устанавливает обработку дублей на стороне сервера.

</details>

Далее: [управление доступом](/ru/build/access-control/) применяет тот же подход на основе свидетельств к разрешениям.
