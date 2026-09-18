---
title: Координируйте работу между сущностями
description: Связывайте события и команды разных сервисов, сохраняя каждое правило явным.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 7916e17a3e9a10332cb125157f4a090af1d94900dad98769570db76df4cba7b4 -->

Одно принятое изменение может потребовать работы в другой части приложения. Разделение ответственностей даёт каждому правилу ясное место, но создаёт период, когда одна сторона уже изменилась, а другая ещё нет. Интеграция делает такую передачу явной.

Продолжайте в собственном каталоге `mug-shop` из раздела [запас и оформление заказа](/ru/build/stock-and-checkout/). Его сервисы Cart и Stock уже принимают отдельные решения. Теперь свяжите их: добавление двух кружек записывает выбор в Cart, а затем просит Stock зарезервировать две единицы. Эта политика резервирует при добавлении; резервирование при оформлении заказа — более поздняя вариация.

Все пути ниже указаны относительно корня проекта `mug-shop`. Примеры развивают тот же проект. Небольшие объявления сначала объясняют решение; полные файлы в каждом разделе позже можно скопировать как контрольную точку.

## Решите, что пересекает границу

У передачи одна задача: превратить принятое событие `ItemAdded` в запрос Stock. Важное значение — команда, отправляемая сервису Stock:

```haskell
ReserveStock
  { stockId = added.stockId
  , quantity = added.quantity
  , cartId = cart.cartId
  }
```

`added` — полезная нагрузка внутри `ItemAdded`; `cart` предоставляет идентификатор корзины. Оберните это значение в `Command.Emit`, чтобы среда выполнения интеграции могла его доставить. Это команда приложения, поэтому она сохраняет решение Stock и правила отказа, а не обходит их.

## Создайте исходящую интеграцию

Из корня проекта создайте каталог интеграции:

```sh
mkdir -p src/Shop/Cart/Integrations
```

Создайте каталог и файл из корня проекта: `mkdir -p src/Shop/Cart/Integrations`, затем создайте `src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs`. Начните с объявления и правила ниже, затем скопируйте полный файл. `CartEntity` — состояние, восстановленное для события; `CartEvent` — семейство событий, уже определённое срезом Cart.

```haskell
data ReserveStockOnItemAdded = ReserveStockOnItemAdded

type instance EntityOf ReserveStockOnItemAdded = CartEntity

handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none

deriveOutboundIntegration ''ReserveStockOnItemAdded
```

Когда товар добавлен, попросите Stock зарезервировать запрошенное количество. Другие события Cart не создают действий. `Command.Emit` отправляет команду другому зарегистрированному сервису; он не выполняет внешний HTTP-вызов.

Маркер связывает `handleEvent` с исходящей механикой. Бизнес-правило по-прежнему предоставляет функция; маркер не решает, когда нужно резервировать запас.

### Полный файл интеграции

Скопируйте всё содержимое в путь из заголовка ниже, включая импорты, нужные приведённым объявлениям.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs"
module Shop.Cart.Integrations.ReserveStockOnItemAdded (
  ReserveStockOnItemAdded (..),
  handleEvent,
) where

import Core
import Integration qualified
import Integration.Command qualified as Command
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Stock.Commands.ReserveStock (ReserveStock (..))


data ReserveStockOnItemAdded = ReserveStockOnItemAdded


type instance EntityOf ReserveStockOnItemAdded = CartEntity


handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none


deriveOutboundIntegration ''ReserveStockOnItemAdded
```

## Зарегистрируйте команду Stock и интеграцию

Новый обработчик может выдавать `ReserveStock`, только если сервис Stock регистрирует эту команду с `InternalTransport`, как уже делает исходный код урока о запасе. Сохраните и публичные команды Cart.

Сохраните регистрации `CreateCart` и `AddItem` сервиса Cart. Регистрация интеграции находится в `App.hs`; это не ещё одна команда Cart.

Если сервис Cart всё ещё совпадает с контрольной точкой Build, ниже приведён получившийся полный файл. Если вы уже прошли главу таймеров, сохраните дополнительный импорт и регистрацию `CreateCartInternal`.

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

Не добавляйте `CreateCartInternal` только ради этого рабочего процесса; он вводится в [уроке о таймерах](/ru/connect/timers/).

## Добавьте интеграцию в `App.hs`

В `src/App.hs` добавьте этот импорт к остальным импортам `Shop.Cart`:

```haskell
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
```

Добавьте регистрацию после существующих сервисов и запросов, сохранив их все:

```haskell
  |> Application.withOutbound @ReserveStockOnItemAdded
```

Если файл всё ещё совпадает с контрольной точкой Build, заменить его полным результатом ниже — самый короткий путь. Если вы уже добавили загрузки, таймеры, аутентификацию или другие интеграции, сохраните эти импорты и регистрации и добавьте две строки в соответствующие места.

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
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
  |> Application.withOutbound @ReserveStockOnItemAdded
```

Типизированная интеграция восстанавливает состояние Cart из записанной истории. Для регистрации ей нужно начальное значение `CartEntity`; маркер сущности уже предоставляет его из `initialState`:

```haskell
deriveEntity ''CartEntity ''CartEvent
```

Сохраните это объявление в `src/Shop/Cart/Entity.hs` после `initialState`, `update` и `getEventEntityId`. Маркер предоставляет механику сущности; второй ручной экземпляр `Default` добавлять не нужно.

## Запустите связанную работу

Из корня проекта перед изменением файлов остановите существующий сервер, затем выполните:

```sh
neo build
neo run
```

Используйте другой терминал для запросов из раздела [запас и оформление заказа](/ru/build/stock-and-checkout/). Создайте свежий запас с тремя доступными единицами и новую Cart, затем добавьте две единицы с возвращёнными идентификаторами. Опросите запрос Stock, пока он не сообщит об одной доступной и двух зарезервированных единицах. Успешный ответ Cart не означает, что запрос Stock уже догнал историю.

Прочитайте и итог Cart. Его `itemCount` равен одному, потому что он считает позиции, хотя добавление запрашивало две единицы. Stock отслеживает количества единиц. Эти представления отвечают на разные вопросы одного процесса.

## Добавьте повторяемый тест интеграции

Создайте `tests/stock-reservation.hurl` из корня проекта. Перед `neo test` остановите `neo run`; CLI сам запускает тестовый сервер. Полный файл ниже захватывает свежие идентификаторы, проверяет оба представления, отклоняет ноль без изменения представлений, а затем резервирует последнюю оставшуюся единицу.

```hurl
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}
HTTP/1.1 200
[Captures]
stock_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]
HTTP/1.1 200
[Captures]
cart_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":2}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":0}
HTTP/1.1 400

GET http://localhost:8080/queries/cart-summary
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1

GET http://localhost:8080/queries/stock-level
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":1}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 2

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 0
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 3
```

Из `mug-shop` запустите `neo test`. Повторы запросов ждут асинхронную интеграцию и проекции; они не отправляют принятое добавление повторно. Сохраните и небольшие тесты Cart и Stock: этот сценарий проверяет связанную работу, а маленькие тесты показывают, какое локальное правило не прошло.

## Что не решает счастливый путь

> **Джесс:** «Если запаса нет, автоматически отмени добавление товара».
>
> **Агент:** «Команда Stock отклоняет резервирование, поэтому корзина не изменяется».
>
> **Джесс:** «Событие Cart уже принято. Покажи обратный путь, который обновляет корзину».

Отказ на стороне Stock не может стереть уже записанное событие Cart. Показанный обработчик предоставляет одно направление связи. Полный рабочий процесс требует явного пути результата, например записи отказа резервирования и изменения условий оформления заказа. Реализация этого обратного пути — полезное расширение учебного проекта.

Это задача **менеджера процесса**: координировать шаги между сущностями, отслеживать прогресс и обрабатывать незавершённую работу. Явно представляйте ожидающую работу и её восстановление. В этом примере нельзя считать оформление заказа завершённым только потому, что Cart приняла товар.

## Упражнение: выберите момент резервирования запаса

Измените политику учебного проекта с «при добавлении» на «при запросе оформления заказа». До изменения кода запишите последовательность событий. Добавление в корзину больше не должно резервировать запас. Оформление заказа должно один раз запросить резервирование для стабильной бизнес-операции. Проверьте достаточный и недостаточный запас, дублирующие запросы и отмену при ожидающем резервировании. Определите, что видит покупатель в каждом случае.

Продолжите с [вызовами провайдера](/ru/connect/http-and-payments/), когда следующий шаг выйдет за пределы собственного приложения.

<details>
<summary>Примечания об исходниках фреймворка</summary>

- [testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs)
- [core/service/Service/OutboundIntegration/TH.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/OutboundIntegration/TH.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/tests/scenarios/stock-reservation.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/scenarios/stock-reservation.hurl)

</details>
