---
title: "Конфигурация"
description: Свяжите типизированные настройки с частями приложения, которые их используют.
sidebar:
  order: 9
---
<!-- translation-source-sha256: 3efdbe4acc9f0b262596a1e4e03d8517882c1c2c7856ae43dd8256fee4c90191 -->

В разных средах приложениям нужны разные настройки, но бизнес-правила должны оставаться согласованными. Конфигурация даёт этим выборам имена, проверяет их типы и явно связывает их с работающим приложением.

Адрес базы данных — конфигурация. Согласованная цена заказа относится к бизнес-истории. Изменение настройки завтра не должно переписывать вчерашнюю договорённость.

Ниже показаны соответствующие объявления и поведение, причём для каждого названо место назначения. Небольшие фрагменты объясняют по одному выбору; собранные файлы в конце страницы содержат импорты, нужные этим объявлениям. [Полный конец файлов раздела Build](/examples/mug-shop-build.tar.gz) — дополнительный материал с той же контрольной точкой и тестами.

## Добавьте настройку, которую использует приложение

До сих пор приложение всегда запускалось с пустой историей в памяти. Сделаем локальное сохранение явной настройкой разработки, по умолчанию сохранив то же поведение.

Сначала назовите выбор и его значение по умолчанию:

```haskell
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

Поместите поле внутрь `defineConfig "ShopConfig"` в `src/Shop/Config.hs`. Контрольная точка содержит полное определение.

`defineConfig` генерирует запись и её анализатор. У поля есть документация, логический тип, значение по умолчанию и переменная окружения. Макрос требует, чтобы у каждого поля была документация и осознанно выбранная политика значения по умолчанию или обязательного значения.

## Подключите настройку к хранилищу

После завершения уроков Cart и Stock подключите настройку к своей **базовой линии локальной разработки**. Если вы уже добавили аутентификацию или другие регистрации, сохраните их: добавьте импорт `Shop.Config`, вставьте `withConfig @ShopConfig` и замените только шаг `withEventStore`. Не удаляйте настройки разрешений приложения.

Нужные шаги конвейера в `src/App.hs`:

```haskell
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
```

`withConfig` регистрирует тип, который нужно загрузить. Фабрика хранилища потребляет загруженную запись. Это важная связь: одного объявления `persistEvents` недостаточно, чтобы изменить хранение.

## Осознанно добавляйте обязательные значения

Учётные данные провайдера могут быть обязательным секретным полем. Это **фрагмент списка полей**, который нужно добавить при реализации соответствующего провайдера, а не требование текущего приложения:

```haskell
  , Config.field @Text "providerKey"
      |> Config.doc "Credential for the selected external provider"
      |> Config.required
      |> Config.envVar "SHOP_PROVIDER_KEY"
      |> Config.secret
```

После этого ваша интеграция должна потреблять `config.providerKey`. `required` устанавливает наличие значения; он не доказывает, что удалённый провайдер примет учётные данные.

`Config.secret` скрывает поле в отображении сгенерированной записи и JSON. Оно не шифрует значение и не мешает коду записать необработанное поле в журнал после извлечения. Храните настоящие учётные данные в механизме секретов вашего развёртывания.

## Проверяйте потребителя, а не только анализатор

Загрузчик читает аргументы процесса и переменные окружения. Файл `.env` не попадает в окружение процесса автоматически; если выбираете этот формат, используйте явный загрузчик или менеджер процессов.

Поле с именем `httpPort` также не меняет слушатель автоматически. Сейчас приложение использует `WebTransport.server`, который слушает порт 8080. Для фиксированного альтернативного порта разработки замените этот шаг конвейера:

```haskell
  |> Application.withTransport (WebTransport.server {port = 8081})
```

Обновите клиентов соответственно. Текущий HTTP-процесс `neo test` проверяет порт 8080, поэтому в учебных тестах оставьте этот порт; изменение одних URL Hurl не меняет проверку запуска. См. [справочник CLI](/ru/reference/cli/). Если позже сделаете порт настраиваемым, проследите разобранное значение до настоящего транспорта и проверьте адрес прослушивания.

## Соберите контрольную точку локального хранения

Теперь вы видели поле и его потребителя по отдельности. В том же проекте `mug-shop` создайте или замените `src/Shop/Config.hs` полным файлом ниже.

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

Затем замените подключение приложения в `src/App.hs` этой полной локальной контрольной точкой. Если вы уже добавили аутентифицированный вариант из раздела [управление доступом](/ru/build/access-control/), сохраните эту политику и вставьте шаги `withConfig` и `withEventStore` в существующий конвейер вместо замены всего файла.

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

После создания или замены этих файлов запустите `neo build`. Со значением по умолчанию запустите `neo test`, а затем удалите `.neo/events`, если хотите начать локальное упражнение заново. С `PERSIST_EVENTS=True` сохраняйте каталог событий сервера между перезапусками и проверьте, что у той же Cart ID по-прежнему есть итог. Это контрольная точка разработки, а не гарантия надёжного восстановления в production.

Для упражнения с перезапуском остановите другие серверы и запустите:

```sh
PERSIST_EVENTS=True neo run
```

Используйте `True` и `False` с заглавной буквы: это логическое поле применяет типизированный анализатор значений Haskell. Создайте корзину и сохраните её ID. Остановите сервер и снова выполните ту же команду. Прочитайте итог корзины, дав время на восстановление и проекцию. Корзины из прежних запусков в памяти не переносятся в файлы при включении настройки.

В [главе о хранении](/ru/operate/persistence/) объясняется переход к PostgreSQL и проверка надёжного восстановления. Локальные файлы событий полезны при разработке; эксплуатация приложения также требует резервных копий, свидетельств восстановления, решений о сроках хранения и подходящего доступа.

## Упражнение: необязательно или неправильно настроено?

Агент задаёт для обязательного ключа провайдера пустое значение по умолчанию, чтобы запуск проходил успешно. Какое поведение вы хотите, когда провайдер недоступен или не настроен?

<details>
<summary>Подсказка для рассуждения и проверки</summary>

Если возможность обязательна, требуйте её учётные данные и выдавайте ясную ошибку запуска при отсутствии. Если она необязательна, явно смоделируйте отключённое состояние. Проверьте корректную конфигурацию, отсутствие обязательного значения и неверное значение типизированного поля. Проверьте сокрытие с безвредными тестовыми учётными данными, а отдельно — что провайдер получает настроенное значение.

</details>

Далее: [проверьте приложение](/ru/build/your-shop/) перед подключением других систем.

Справочные исходники: [конфигурация](https://github.com/neohaskell/NeoHaskell/blob/main/core/config/Config.hs), [фабрики приложения](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs), [простое хранилище](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Simple.hs).
