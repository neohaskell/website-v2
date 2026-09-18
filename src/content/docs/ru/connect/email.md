---
title: Отправляйте электронную почту
description: Записывайте принятие провайдером и делайте ошибки уведомлений видимыми.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 674d034499dc89d8cee7ca9de783120958d78666c98ee3fb6adfdf247ef01e54 -->

Электронное письмо даёт человеку результат, который можно увидеть вне приложения: уведомление, приглашение или подтверждение. Но оно вносит важное различие: принятие сообщения провайдером не доказывает, что получатель его получил или прочитал.

NeoHaskell включает типы запросов Brevo и Azure Communication Services (ACS). Мы используем подтверждение заказа из учебного проекта, чтобы изучить шаблон запроса и обратного вызова. Учётные данные провайдера, настройка проверенного отправителя и настоящая доставка требуют отдельной работы; начните с тестового получателя, которым управляете сами.

## Добавьте электронную почту в mug-shop

Используйте существующий проект и завершите [настройку интеграций](/ru/connect/#prepare-your-project). Поместите помощник построения запроса в `src/Shop/Integrations/Email.hs`. Его вызывающая сторона — исходящий обработчик в части приложения, владеющей запросом уведомления. Зарегистрируйте этот обработчик в `src/App.hs` по шаблону из раздела [рабочие процессы](/ru/connect/workflows/).

Для подтверждения заказа нужны разработанные ниже заказ и рабочий процесс уведомления; они не появляются просто потому, что Cart и Stock компилируются. До включения уведомления в оформление заказа начните с контролируемого запроса.

## Сначала определите результат

Используйте команду приложения, объявленную с `InternalTransport` и способную представлять принятие и отказ провайдера. Она должна нести идентификатор уведомления и все идентификаторы, нужные для связи с исходным действием. В успешной ветке запишите ID сообщения или операции провайдера; в ветке ошибки — безопасное объяснение, которое приложение может показать.

Запускайте электронную почту из зафиксированного события. В примере ошибка уведомления не должна исчезать вместе с принятым заказом. Для безопасной повторной отправки смоделируйте попытку уведомления и решите, как обрабатывать дублирующие отправки.

## Настройте запрос Brevo

Этот **частичный конструктор** описывает текстовое сообщение. `emailKey` — значение учётных данных типа `Redacted Text`; `recordAccepted` и `recordFailed` возвращают один и тот же тип команды. Адреса — вымышленные примеры.

```haskell
Brevo.Request
  { sender = Brevo.sender "orders@example.com"
  , to = [Brevo.recipient customerEmail]
  , subject = "Your mug order"
  , body = Brevo.TextBody "We have received your order."
  , cc = []
  , bcc = []
  , replyTo = Nothing
  , tags = []
  , apiKey = emailKey
  , onSuccess = recordAccepted
  , onError = recordFailed
  }
  |> BrevoInternal.toHttpRequest
  |> Integration.outbound
```

Для обработчика события без параметра конфигурации один поддерживаемый шаблон выполнения — задать `emailKey` равным `Redacted.wrap "${SHOP_BREVO_API_KEY}"`. В запросе сохраняется заполнитель; общий слой HTTP-аутентификации раскрывает его из окружения сервера при выполнении. Передайте эту переменную окружения через секретную конфигурацию развёртывания. Не помещайте настоящий ключ в событие или исходный файл.

Явное преобразование нужно для текущего исходного кода: фасад Brevo предоставляет конструктор запроса, но не прямой экземпляр `ToAction (Brevo.Request command)`. `Integration.Brevo.Internal` открыт пакетом; если держать это преобразование в одном помощнике приложения, деталь реализации будет легко заменить позже.

Используйте `HtmlBody`, `TextBody` или `Template`; тип тела допускает одну альтернативу за раз. Шаблон содержит `templateId` и `Map Text Text` параметров. `Sender` и `Recipient` — разные типы, что помогает не перепутать их местами.

Более короткий конструктор `Brevo.send` читает `?config.brevoApiKey`. Используйте его только там, где эта неявная конфигурация действительно привязана. Простая регистрация конфигурации приложения не добавляет неявный параметр в чистую типизированную сигнатуру обработчика. Явный запрос выше делает прокладку учётных данных видимой.

## Точно читайте ответ

Адаптер Brevo распознаёт HTTP 201 и декодирует `messageId`. Неверные данные ответа передаются в обратный вызов ошибки. Статусы аутентификации, кредита аккаунта, ограничения частоты, клиента и сервера переводятся в текст ошибки.

ACS использует `Acs.Request` с `endpoint`, `sender`, `to`, `subject`, `body`, `accessToken` и двумя обратными вызовами. Его публичный фасад содержит экземпляр выполнения, поэтому его можно напрямую передать в `Integration.outbound`. Принятый ответ ACS предоставляет `operationId`; это асинхронная операция отправки, а не подтверждение доставки. Токен имеет тип `Redacted Text`. Способ его получения и обновления нужно поставлять отдельно.

Храните конечные точки ACS в доверенной конфигурации. Адаптер проверяет HTTPS; одной этой проверки недостаточно для списка разрешённых хостов, специфичного для бизнеса.

Оба адаптера используют общую HTTP-механику. Прочитайте [текущее ограничение повторов](/ru/connect/http-and-payments/#understand-the-current-retry-boundary), прежде чем считать, что попытка отправки выполняется один раз.

## Проведите уведомление через приложение

Используйте `neo build`, чтобы проверить помощник и регистрацию обработчика в `mug-shop`. Запустите `neo test` для фикстур запросов и ответов, затем запустите `neo run` с учётными данными электронной почты разработки в окружении. Запросите уведомление для тестового получателя и изучите результат в запросе до проверки почтового ящика. Эти наблюдения устанавливают разные части пути доставки.

## Проверьте, чему может доверять Джесс

Сначала проверьте отображение запроса и ответа без отправки почты, охватив используемые варианты тела и искажённые принятые ответы. Затем отправьте одно сообщение в контролируемой среде провайдера и исследуйте результат приложения и почтовый ящик получателя.

**Упражнение:** провайдер принял письмо, но запись принятия в приложении завершилась ошибкой. Объясните, что должна делать кнопка «отправить снова».

<details>
<summary>Подсказка для рассуждения</summary>

Считайте локальный результат нерешённым. Сохраните стабильную идентичность уведомления и доступные свидетельства провайдера, определите, как исследовать ситуацию, и решите, приемлем ли риск дублирующего письма. Проверьте дублирующие события-триггеры и задержанные результаты вместе с обычными путями принятия и ошибки.

</details>

Далее изучите, как [вложения файлов](/ru/connect/files/) связывают сохранённые байты с действиями приложения.

<details>
<summary>Примечания об исходниках фреймворка</summary>

- [integrations/Integration/Brevo.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo.hs)
- [integrations/Integration/Brevo/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Request.hs)
- [integrations/Integration/Brevo/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Response.hs)
- [integrations/Integration/Brevo/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Internal.hs)
- [integrations/test/Integration/Brevo/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Brevo/InternalSpec.hs)
- [integrations/Integration/Acs/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Request.hs)
- [integrations/Integration/Acs/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Response.hs)
- [integrations/Integration/Acs/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Internal.hs)
- [core/core/Redacted.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Redacted.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/nhintegrations.cabal](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/nhintegrations.cabal)

</details>
