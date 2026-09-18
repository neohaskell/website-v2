---
title: Сохраняйте данные приложения
description: Выбирайте хранилища для событий, моделей чтения, файлов и учётных данных, а затем доказывайте, что переживает перезапуск.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 16be86b1ad86ca0cea9a3ceedf55e41210cd17c287c35a5f5280b7900f75b354 -->

Перезапуск приложения не должен стирать работу, которую оно обещало сохранить. Но временную панель иногда безопасно построить заново. Сохранение начинается с этого различия: определите, какая информация является авторитетной, а какая может быть восстановлена. Cart и её принятые добавления в `mug-shop` дают небольшой пример для проверки через перезапуск.

В приложении с событийным хранением принятые события сохраняют бизнес-историю. Сущности и запросы интерпретируют эту историю для разных целей. Безопасно хранить события необходимо, но это не единственные данные, которые приложению может потребоваться удерживать.

Все пути ниже указаны относительно корня проекта `mug-shop`, созданного командой `neo new`. Урок сначала объясняет замену, а затем предоставляет полные файлы `ShopConfig`, фабрики хранения и `App.hs`, необходимые для контрольной точки Postgres. Если вы уже добавили интеграции, сохраните их импорты и регистрации при объединении с полными файлами хранения.

## Определите каждый вид хранения

| Информация | Поверхность NeoHaskell | Решение приложения |
| --- | --- | --- |
| Принятые события | `Service.EventStore` | Используйте надёжное хранилище до принятия работы, которая должна пережить перезапуск |
| Результаты запросов | `Service.QueryObjectStore` | Выбирайте память или Postgres независимо от хранилища событий |
| Загруженные байты | Локальное хранилище байтов, настроенное через `blobStoreDir` | Сохраняйте и резервируйте настоящие файлы |
| Владение файлами и их жизненный цикл | Хранилище состояния файлов | Выбирайте долговременное состояние вместе с долговременными байтами |
| Секреты подключённых провайдеров | `Application.withSecretStore` | Предоставьте хранилище со сроком жизни, нужным развёртыванию |

Стартовая конфигурация задаёт `SimpleEventStore` с `persistent = False`. Путь, похожий на файловый, не делает такую настройку надёжной. Для первого эксперимента она подходит; перезапуск этого эксперимента теряет историю событий.

## Замените конфигурацию настройками базы данных

Продолжайте в собственном каталоге `mug-shop`. Команды по-прежнему работают с `neo.json`, `src/App.hs` и модулями `src/Shop/`. Здесь в путь впервые добавляется база данных; для предыдущих уроков Cart и Stock она не требовалась.

Пароль — полезный первый пример: он обязателен, передаётся из окружения и скрывается при отображении записи конфигурации:

```haskell
Config.field @Text "dbPassword"
  |> Config.doc "PostgreSQL password"
  |> Config.required
  |> Config.envVar "DB_PASSWORD"
  |> Config.secret
```

Остальные решения указывают сервер и базу, задают пул соединений и политику TLS. Замените `src/Shop/Config.hs` полным файлом ниже. Он сохраняет прежнее поле `persistEvents`, поэтому остаётся прямым расширением контрольной точки Build; после переключения это поле больше не управляет хранилищем событий Postgres и его можно удалить, когда оно больше нигде не используется.

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
  , Config.field @Text "dbHost"
      |> Config.doc "PostgreSQL host"
      |> Config.defaultsTo ("localhost" :: Text)
      |> Config.envVar "DB_HOST"
  , Config.field @Int "dbPort"
      |> Config.doc "PostgreSQL port"
      |> Config.defaultsTo (5432 :: Int)
      |> Config.envVar "DB_PORT"
  , Config.field @Text "dbUser"
      |> Config.doc "PostgreSQL user"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_USER"
  , Config.field @Text "dbPassword"
      |> Config.doc "PostgreSQL password"
      |> Config.required
      |> Config.envVar "DB_PASSWORD"
      |> Config.secret
  , Config.field @Text "dbName"
      |> Config.doc "PostgreSQL database name"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_NAME"
  , Config.field @Int "dbPoolSize"
      |> Config.doc "Event-store connection pool size"
      |> Config.defaultsTo (6 :: Int)
      |> Config.envVar "DB_POOL_SIZE"
  , Config.field @Text "dbSslMode"
      |> Config.doc "PostgreSQL TLS mode"
      |> Config.defaultsTo ("unset" :: Text)
      |> Config.envVar "DB_SSL_MODE"
  , Config.field @Text "dbSslRootCert"
      |> Config.doc "Root CA certificate path, or empty for none"
      |> Config.defaultsTo ("" :: Text)
      |> Config.envVar "DB_SSL_ROOT_CERT"
  ]
```

Настройки напрямую соответствуют `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` и `DB_SSL_ROOT_CERT`. Локальные значения по умолчанию совпадают с базой Docker Compose сгенерированного проекта. Пароль обязателен, поэтому отсутствие учётных данных создаёт ошибку конфигурации. Покидая локальное упражнение, укажите настоящий адрес базы, учётные данные, бюджет пула и требования TLS.

## Создайте фабрику хранения

Создайте `src/Shop/Storage.hs`. Держите перевод настроек в хранилище в этом файле, чтобы `App.hs` только выбирал фабрику. Начните с контракта:

```haskell
makePostgresConfig :: ShopConfig -> PostgresEventStore
```

Большинство полей просто передаёт значение, например `host = config.dbHost`. Режим TLS нужно проверить, потому что окружение предоставляет текст:

```haskell
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
```

Скопируйте полную фабрику ниже. Она передаёт все восемь текущих полей `PostgresEventStore`, включая настройки пула и TLS, и считает пустой путь к корневому сертификату отсутствующим.

<!-- complete-file -->
```haskell title="src/Shop/Storage.hs"
module Shop.Storage (makePostgresConfig) where

import Core
import Service.EventStore.Postgres (PostgresEventStore (..))
import Service.Infra.Postgres.ConnectionConfig qualified as ConnectionConfig
import Shop.Config (ShopConfig (..))
import Text qualified

makePostgresConfig :: ShopConfig -> PostgresEventStore
makePostgresConfig config =
  PostgresEventStore
    { user = config.dbUser,
      password = config.dbPassword,
      host = config.dbHost,
      databaseName = config.dbName,
      port = config.dbPort,
      poolSize = config.dbPoolSize,
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
      sslRootCert =
        if Text.isEmpty config.dbSslRootCert
          then Nothing
          else Just config.dbSslRootCert
    }
```

Неизвестный режим TLS приводит к ошибке при запуске; `unset` оставляет согласование по умолчанию драйвера. Настройка действует потому, что фабрика её передаёт, а не потому, что переменная окружения имеет узнаваемое имя.

## Замените подключение хранилища событий в приложении

В `src/App.hs` добавьте этот импорт:

```haskell
import Shop.Storage qualified as Storage
```

Замените импорт `SimpleEventStore` и выражение `Application.withEventStore` фабрикой Postgres, сохранив свой транспорт, сервисы, запросы и регистрации интеграций:

```haskell
  |> Application.withEventStore Storage.makePostgresConfig
```

Полный результат ниже продолжает уроки координации Cart и Stock и загрузок, заменяя хранилище событий. Временное наблюдение таймера закончено, поэтому его регистрация отсутствует. Если вы пропустили возможность, удалите её импорт и регистрацию; сохраните аутентификацию и остальные добавления. `ShopConfig` и `Shop.Storage` — два полных файла, созданных выше.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Service.Application (Application)
import Service.Application qualified as Application
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig)
import Shop.Storage qualified as Storage
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore Storage.makePostgresConfig
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

В `neo.json` не нужен дополнительный пакет: реализация хранилища событий предоставляется фреймворком. Сохраняйте фиксации CLI и фреймворка из одного релиза Neo, чтобы сгенерированный проект и эти примеры использовали совместимые компилятор и фреймворк.

## Запустите локальную базу и приложение

При доступных Docker и его команде Compose используйте `docker-compose.yml` сгенерированного проекта:

```sh
docker compose up -d postgres
docker compose exec postgres pg_isready -U neohaskell
neo build
DB_PASSWORD=neohaskell neo run
```

Дождитесь, пока `pg_isready` сообщит, что база принимает соединения. Пароль выше — учётные данные локального примера Compose. Настоящие учётные данные передавайте через механизм секретов развёртывания. Загрузчик конфигурации читает окружение процесса; одного создания файла `.env` недостаточно, чтобы доказать, что значение дошло до приложения.

Если другой локальный сервис использует порт 5432, до запуска измените отображение порта Compose на свободный, например `55432:5432`, и передайте `DB_PORT=55432` при запуске приложения или тестов. Не останавливайте постороннюю базу.

Переключение хранилищ не переносит прежнюю историю в памяти или локальные файлы событий, включённые через `persistEvents`. Создайте корзину для следующего эксперимента после запуска с Postgres. Для повторяемых HTTP-тестов остановите работающее приложение и используйте `DB_PASSWORD=neohaskell neo test` против этой одноразовой локальной базы. CLI запускает собственный сервер; тесты записывают данные, поэтому никогда не направляйте эту команду в production-базу.

## Надёжные события и надёжные запросы — разные вещи

Запросы используют память, если не передать им бэкенд хранилища объектов запроса через `Application.withQueryObjectStore` (также доступный как `useQueryObjectStore`). `PostgresQueryObjectStoreConfig` имеет собственные настройки соединения и пула. Хранилища различают запросы и по имени, и по идентификатору экземпляра, поэтому два представления одной сущности остаются отдельными.

Есть важная эксплуатационная граница: низкоуровневые API подписчика запросов предоставляют поддержку перестройки с контрольной точкой и хешем, но обычная проводка `Application` сейчас создаёт `Subscriber.new`. Один лишь выбор хранилища запросов Postgres **не доказывает, что запуск продолжает работу с сохранённой контрольной точки**. Проверьте перезапуск и воспроизведение с настоящей проводкой и логикой проекции, особенно если проекция накапливает значения, а не заменяет их.

## Докажите надёжность характерным изменением

Используйте маршруты Cart из раздела [HTTP и фронтенд](/ru/build/http-and-frontend/) с локальной конфигурацией Postgres:

1. Создайте корзину, добавьте положительное количество, сохраните её идентификатор и ожидаемое содержимое.
2. Дождитесь, пока `CartSummary` покажет ожидаемый результат, затем отправьте нулевое количество и проверьте отказ.
3. Остановите процесс с Ctrl-C и снова запустите `DB_PASSWORD=neohaskell neo run` из того же проекта, используя ту же базу.
4. Дождитесь `/ready`, затем запросите итог той же корзины.
5. Сравните идентификатор, число позиций и состояние пустоты/непустоты. Убедитесь, что воспроизведение не посчитало добавление дважды и что отклонённый запрос ничего не добавил.

Повторите с загруженным вложением, если рабочий процесс его использует. Сохранившаяся строка базы не доказывает сохранность соответствующих байтов. Также определите, как удаляются заброшенные загрузки: в `Service.FileUpload.Web` есть низкоуровневый рабочий очистки, но текущий запуск `Application.withFileUpload` его не запускает. Одно значение `cleanupIntervalSeconds` поэтому не доказывает автоматическую очистку. Проверьте выбранную проводку жизненного цикла и наблюдайте рост хранилища.

Попробуйте перенести процесс на новый хост, сохранив только те ресурсы, которые намеренно должны быть долговременными. Корзина должна восстановиться из сохранённого хранилища событий. Отсутствующий файл или подключение провайдера выявит другую зависимость хранения; добавьте её в план развёртывания и резервного копирования, затем повторите эксперимент. Не делайте вывод о надёжности только из успешного обычного перезапуска.

Продолжите с [развёртыванием](/ru/operate/deployment/) и [восстановлением](/ru/operate/recovery/).

<details>
<summary>Исходники фреймворка и контрольной точки</summary>

- [Поля хранилища событий Postgres](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Postgres/Internal.hs)
- [Разбор режима TLS](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Infra/Postgres/SslMode.hs)
- [Сгенерированная локальная база](https://github.com/neohaskell/NeoHaskell/blob/main/neo/starter/docker-compose.yml)
- [Полная конфигурация хранения](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Config.hs)
- [Полная фабрика хранения](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Storage.hs)
- [Полное приложение хранения](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/App.hs)

</details>
