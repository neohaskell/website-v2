---
title: Загружайте и прикрепляйте файлы
description: Сохраняйте загруженные байты, проверяйте ссылки на файлы и прикрепляйте их к принятым действиям приложения.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 0a81f2fdd4de6e40404671fbcce68f5cdbb189b58e661c2e8a4fec26d9c10443 -->

Кто-то загружает файл, а затем закрывает браузер до завершения формы. Приложению нужно временное хранилище для незавершённой загрузки и ясная связь в момент, когда файл становится частью принятого действия.

NeoHaskell предоставляет ссылки на файлы, маршруты загрузки и скачивания, проверки владельца на пользовательском пути и жизненный цикл файла. Вы решаете, какие файлы допустимы и когда их прикреплять. Продолжайте в собственном проекте `mug-shop`: создайте один файл конфигурации загрузок, добавьте одну регистрацию приложения, загрузите небольшой пример, а затем спроектируйте, как рисунок станет частью персонализированной кружки.

Все пути ниже указаны относительно корня проекта `mug-shop`. Сфокусированные фрагменты сначала объясняют выбор. Полные файлы показывают точные импорты и окружающий код приложения, необходимый для запускаемой контрольной точки.

## Выберите политику загрузки

Для локального упражнения разрешите небольшие текстовые заметки, рисунки PNG и PDF. Храните байты в `./uploads`, метаданные жизненного цикла — в памяти, а незавершённые ссылки удаляйте через шесть часов:

```haskell
uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Это учебная настройка. Хранилище метаданных находится в памяти, поэтому перезапуск теряет ссылки, даже если байты остаются в `uploads/`. Развёрнутое приложение должно выбирать долговременное хранение метаданных и байтов одновременно.

## Создайте файл конфигурации загрузок

Создайте `src/Shop/Uploads.hs`. Скопируйте полный файл ниже целиком, не угадывая, какие типы загрузки файлов нужно импортировать.

<!-- complete-file -->
```haskell title="src/Shop/Uploads.hs"
module Shop.Uploads (uploadConfig) where

import Core
import Service.FileUpload.Core (FileUploadConfig (..), FileStateStoreBackend (..))


uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Поля являются решениями приложения:

| Поле | Что нужно решить для вашего развёртывания |
| --- | --- |
| `blobStoreDir` | Где находятся настоящие байты файла |
| `stateStoreBackend` | Где сохраняются метаданные жизненного цикла файла |
| `maxFileSizeBytes` | Наибольший допустимый размер загрузки |
| `pendingTtlSeconds` | Как долго незавершённая загрузка остаётся пригодной для использования |
| `cleanupIntervalSeconds` | Настройка расписания очистки |
| `allowedContentTypes` | Разрешённые заявленные типы медиа или отсутствие ограничения |
| `storeOriginalFilename` | Сохранять ли исходные имена |

При запуске проверяются положительные значения размера и времени, требуется непустой каталог, а интервал очистки должен быть меньше времени жизни ожидания. Текущее подключение приложения не запускает доступный рабочий очистки. Срок действия проверяется при обращении, но байты заброшенных файлов эта настройка автоматически не освобождает. Организуйте и протестируйте очистку для развёрнутого вами хранилища.

## Добавьте поддержку загрузок в `App.hs`

В `src/App.hs` добавьте этот квалифицированный импорт к другим импортам `Shop`:

```haskell
import Shop.Uploads qualified as Uploads
```

Добавьте эту регистрацию после существующих транспорта, сервисов и запросов:

```haskell
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

Фабрика `@()` независима от `ShopConfig` в этом локальном примере. Когда каталог и ограничения станут настройками развёртывания, замените фабрику функцией от типа конфигурации, зарегистрированного через `Application.withConfig`.

После завершения [урока о рабочих процессах](/ru/connect/workflows/) получившийся `src/App.hs` выглядит так. Он сохраняет исходящую регистрацию и добавляет загрузки. Если вы открыли эту страницу напрямую, добавьте две строки рабочего процесса из того урока в те же места или пропустите их до завершения предыдущей страницы.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
import Shop.Uploads qualified as Uploads

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
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

## Загрузите байты до их прикрепления

После редактирования остановите сервер и пересоберите проект, затем запустите приложение из корня проекта:

```sh
neo build
neo test
neo run
```

В другом терминале в том же корне проекта создайте фикстуру и отправьте её работающему серверу:

```sh
mkdir -p examples
printf 'Blue mug artwork draft\n' > examples/artwork-note.txt
curl -F 'file=@examples/artwork-note.txt;type=text/plain' \
  http://localhost:8080/files/upload
```

Ожидайте JSON с `fileRef`, `filename`, `contentType`, `sizeBytes` и `expiresAt`. Этот первый обмен использует локальное приложение без аутентификации. Если вы включили аутентификацию, передайте учётные данные, как описано в разделе [управление доступом](/ru/build/access-control/).

Используйте возвращённую ссылку, чтобы запросить байты. Замените заполнитель возвращённым `fileRef`:

```sh
curl http://localhost:8080/files/YOUR-FILE-REFERENCE
```

**Текущее ограничение аутентифицированного скачивания:** маршрут скачивания использует режим промежуточного ПО `Everyone`, который возвращает анонимные утверждения даже при наличии токена. Поэтому нельзя считать, что загрузку аутентифицированного субъекта можно скачать через этот маршрут. Проверьте и решите этот путь до включения частных вложений; анонимное упражнение не устанавливает сквозную поддержку аутентифицированного владения.

## Прикрепите ссылку через принятое действие

Загрузка байтов не изменила корзину. Чтобы добавить возможность рисунка, создайте команду с полем `attachment :: FileRef`. `FileRef` — тип ссылки, определённый в `Service.FileUpload.Core`. Используйте маркер команды из раздела [команды и события](/ru/build/commands-and-events/). Фреймворк разрешает ссылку до запуска команды и предоставляет метаданные через `RequestContext.files`.

Сохраняйте ссылку на файл в принятом событии вместе с её связью с корзиной или запросом рисунка. Не копируйте необработанные байты в событие. Команда, событие и представление, показывающее рисунок, — новая работа приложения: создайте эти файлы до того, как предлагать действие «прикрепить» на экране.

Проверяющий разрешает ссылку только при существовании файла, подходящем состоянии удаления, неистёкшем ожидании, правильном владельце и наличии байтов. Ожидающие ссылки истекают; подтверждённые не отклоняются лишь из-за истечения времени ожидания. Приложению всё равно нужны правила хранения и удаления.

Контекст доступа к файлу фоновой интеграции отличается от контекста пользовательского запроса. Его реализация получает файл по ссылке из хранилища и не несёт проверку владельца вызывающего пользователя. Запускайте обработку только из авторизованного действия, которое проверило связь. Не принимайте произвольную ссылку из недоверенной подсказки и не передавайте её фоновому обработчику.

Заявленный тип медиа полезен для маршрутизации и ограничений, но не доказывает, что байты являются допустимым рисунком или безопасным документом. До принятия проверьте свойства, на которые полагается приложение.

## Упражнение: брошенный рисунок покупателя

В учебном проекте решите, когда рисунок становится частью заказа, что происходит после истечения ожидания и что показывает экран при отсутствии сохранённых байтов. Проверьте корректную ссылку владельца, ссылку другого пользователя, просроченную ожидающую загрузку, удалённую ссылку, отсутствующие байты, отсутствующие multipart-данные и слишком большой файл. Команда должна оставаться отклонённой, если необходимое вложение нельзя разрешить. Запустите эти проверки через `neo test`, а отдельно проверьте живой HTTP-маршрут загрузки. До включения частных вложений добавьте сценарий аутентифицированного владения.

Когда жизненный цикл вложения станет понятным, продолжите с [обработкой документов](/ru/connect/documents/).

<details>
<summary>Примечания об исходниках фреймворка</summary>

- [core/auth/Auth/Middleware.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/Middleware.hs)
- [core/service/Service/Transport/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [core/service/Service/FileUpload/Resolver.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Resolver.hs)
- [core/service/Service/FileUpload/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Web.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/src/Testbed/Document/Commands/CreateDocument.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Document/Commands/CreateDocument.hs)
- [testbed/tests/files/upload.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload.hurl)
- [testbed/tests/files/download.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/download.hurl)
- [testbed/tests/files/upload-errors.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload-errors.hurl)

</details>
