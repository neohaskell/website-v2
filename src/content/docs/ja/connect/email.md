---
title: メールを送信する
description: プロバイダーの受け入れを記録し、通知の失敗を見えるように扱います。
sidebar:
  order: 4
---
<!-- translation-source-sha256: 674d034499dc89d8cee7ca9de783120958d78666c98ee3fb6adfdf247ef01e54 -->

メールは、通知、招待、確認など、アプリケーションの外で人が調べられる結果を与えます。同時に重要な区別も導入します。プロバイダーがメッセージを受け入れたことは、受信者が受け取ったことや読んだことを証明しません。

NeoHaskell には Brevo と Azure Communication Services（ACS）のリクエスト型があります。練習用プロジェクトの注文確認を使い、リクエストとコールバックのパターンを学びます。プロバイダーの認証情報、認証済み送信者の設定、実際の配信は別のセットアップ作業です。まず自分が管理できるテスト受信者を使います。

## mug-shop にメールを追加する

既存のプロジェクトで作業し、[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)を完了します。リクエスト構築ヘルパーを `src/Shop/Integrations/Email.hs` に置きます。その呼び出し元は、通知リクエストを所有するアプリケーション部分のアウトバウンドハンドラーです。[ワークフロー](/ja/connect/workflows/)のパターンを使い、`src/App.hs` にハンドラーを登録します。

注文確認には、下で設計する注文と通知のワークフローが必要です。Cart と Stock がコンパイルできるだけで存在するわけではありません。チェックアウトの一部にする前に、制御した通知リクエストから始めます。

## まず結果を定義する

`InternalTransport` で宣言し、プロバイダーの受け入れと失敗を表せるアプリケーションコマンドを使います。通知識別子と、元のアクションにつなぐために必要な識別子を持たせます。成功分岐ではプロバイダーのメッセージ ID または操作 ID を記録し、失敗分岐ではアプリケーションが表示できる安全な説明を記録します。

メールはコミットされたイベントから起動します。例では、通知が失敗しても受け入れられた注文を消してはいけません。安全に再送するには、通知の試行をモデル化し、重複送信をどう扱うか決めます。

## Brevo リクエストを設定する

この**部分的なビルダー**はプレーンテキストのメッセージを記述します。`emailKey` は `Redacted Text` の認証情報値で、`recordAccepted` と `recordFailed` は同じコマンド型を返します。アドレスは架空の例です。

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

設定パラメーターのないイベントハンドラーでは、`emailKey` を `Redacted.wrap "${SHOP_BREVO_API_KEY}"` にする実行パターンがあります。これでリクエストにプレースホルダーを保存します。実行時に共有 HTTP 認証レイヤーが、サーバー環境から値を展開します。環境変数はデプロイのシークレット設定で設定します。実際のキーをイベントやソースファイルに入れないでください。

現在のソースでは明示的な変換が必要です。Brevo ファサードはリクエストビルダーを公開しますが、`ToAction (Brevo.Request command)` の直接のインスタンスは提供しません。`Integration.Brevo.Internal` はパッケージから公開されています。この変換を 1 つのアプリケーションヘルパーに置くと、後で実装の詳細を簡単に交換できます。

`HtmlBody`、`TextBody`、`Template` のいずれかを使います。本文型は一度に 1 つの選択肢を許可します。テンプレートには `templateId` と `Map Text Text` のパラメーターがあります。`Sender` と `Recipient` は異なる型で、誤って逆にするのを防ぎやすくなっています。

短い `Brevo.send` コンストラクターは `?config.brevoApiKey` を読みます。この暗黙の設定値が実際にバインドされている場所だけで使います。アプリケーション設定を登録しただけでは、純粋な型付きハンドラーのシグネチャに暗黙のパラメーターは追加されません。上の明示的なリクエストなら、認証情報の配線が見えます。

## 応答を正確に読む

Brevo のアダプターは HTTP 201 を認識し、`messageId` をデコードします。無効な応答データはエラーコールバックに進みます。認証、アカウント残高、レート制限、クライアント、サーバーの状態をエラーテキストに対応付けます。

ACS は、`endpoint`、`sender`、`to`、`subject`、`body`、`accessToken`、2 つのコールバックを持つ `Acs.Request` を使います。公開ファサードに実行インスタンスが含まれるため、`Integration.outbound` に直接渡せます。ACS の受け入れられた応答は `operationId` を公開します。これは非同期の送信操作であり、配信確認ではありません。トークンは `Redacted Text` です。取得と更新の方法は別に用意します。

ACS のエンドポイントは信頼された設定に保ちます。アダプターは HTTPS を強制しますが、それだけでビジネス固有のホスト許可リストにはなりません。

どちらのアダプターも共有 HTTP 機構を使います。1 回の送信試行だと仮定する前に、[現在の再試行制限](/ja/connect/http-and-payments/#understand-the-current-retry-boundary)を読みます。

## アプリケーションを通して通知を実行する

`mug-shop` でヘルパーとハンドラーの登録を確認するために `neo build` を使います。リクエストと応答のフィクスチャには `neo test` を実行し、その後、開発用メール認証情報を環境に設定して `neo run` を起動します。テスト受信者への通知をリクエストし、メールボックスを確認する前に結果クエリを調べます。これらの観測は配信経路の異なる部分を確立します。

## Jess が信頼できるものを確認する

まずメールを送らずに、リクエストと応答の対応付けをテストします。使う本文の選択肢と、壊れた受け入れ応答を含めます。その後、制御されたプロバイダー環境で 1 通送り、アプリケーションの結果と受信者のメールボックスの両方を調べます。

**演習：**プロバイダーはメールを受け入れましたが、アプリケーションへの受け入れ記録に失敗しました。「再送」ボタンは何をするべきか説明します。

<details>
<summary>考え方の例</summary>

ローカルの結果を未解決として扱います。安定した通知識別子と、利用できる場合はプロバイダーの証拠を保ち、どう調査するかを定義し、メールが重複するリスクを許容できるか決めます。通常の受け入れ・失敗経路だけでなく、重複するトリガーイベントと遅れて届く結果もテストします。

</details>

次は[ファイル添付](/ja/connect/files/)で、保存したバイト列をアプリケーションのアクションにつなぐ方法を学びます。

<details>
<summary>フレームワークソースの注記</summary>

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
