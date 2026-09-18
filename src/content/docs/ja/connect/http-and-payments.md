---
title: 外部 HTTP API を呼び出す
description: リクエストと完了した操作を混同せずに、外部 API を接続します。
sidebar:
  order: 2
---
<!-- translation-source-sha256: c57edfc06dcb49ed47a18d2adbe3eff8741f6a3f550f554e6bbcef0aa77e05ca -->

アプリケーションが別のサービスへリクエストを送った後、応答が届く前に接続が閉じました。そのサービスが作業を拒否したのか、作業の完了後に応答だけが消えたのかは分かりません。HTTP インテグレーションは、通常の成功・失敗だけでなく、この不確実性も扱う必要があります。

NeoHaskell はリクエストの仕組みを提供します。プロバイダーの応答を解釈し、どの操作を安全に繰り返せるかを決めるのはアプリケーションです。まず状態検索から始め、その後 EC プロジェクトでシミュレートした決済を使い、より重大な引き渡しを練習します。

前提：[インテグレーションのライフサイクル](/ja/connect/)と[設定](/ja/build/configuration/)。

## プロバイダー呼び出しをプロジェクトに置く

自分の `mug-shop` ディレクトリで続け、[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)を完了します。プロトコルヘルパーを `src/Shop/Integrations/ProviderStatus.hs` に保ちます。いつ呼び出すかを選ぶ Cart 側のハンドラーは、[完全なハンドラーモジュール](/ja/connect/workflows/#create-the-outbound-integration)に従って `src/Shop/Cart/Integrations/` の下に置きます。

リクエストを追加する前に、状態結果を記録するコマンドを定義し、`InternalTransport` で関係するサービスに登録します。安定した操作識別子を持つ成功、拒否、未解決の結果を用意します。以下のビルダーは、その機能のリクエスト部分です。コールバックが結果をアプリケーションのコマンドに結び付けます。

## 読み取りでリクエストの形を学ぶ

プロバイダーの状態を読む操作から始めます。この**部分的なインテグレーションビルダー**では、`statusUrl`、`recordReply`、`recordFailure` はアプリケーションが提供する値です。2 つのコールバックは、登録済みの 1 つのコマンド型を返します。

```haskell
-- Inside the event handler's Integration.batch:
Integration.outbound Http.Request
  { method = Http.GET
  , url = statusUrl
  , headers = []
  , body = Http.noBody
  , onSuccess = recordReply
  , onError = Just recordFailure
  , auth = Http.Bearer "${SHOP_PROVIDER_TOKEN}"
  , retry = Http.defaultRetry
  , timeoutSeconds = 15
  }
```

URL とヘッダーの値は環境変数置換に対応します。認証は `NoAuth`、`Bearer`、`Basic`、名前付きヘッダーの `ApiKey` に対応します。環境変数がない場合、準備中にインテグレーション認証エラーを発生させます。必ずしも `onError` には届きません。

`Http.Response` は `statusCode`、JSON の `body`、応答 `headers` を持ちます。**コールバックでステータスを調べてください。**`onSuccess` という名前のコールバックは応答経路を表すだけで、プロバイダーがビジネス操作を承認したという宣言ではありません。

リクエスト本文には `Http.json`、`Http.form`、`Http.raw`、`Http.noBody` を使います。現在のアダプターは POST、PUT、PATCH で JSON に対応し、POST では form と raw も実装されています。GET と DELETE は指定された本文を使いません。応答は JSON クライアント経由でデコードされるため、空や JSON でない内容を返すプロバイダーには、明示的な互換性テストかカスタムアダプターが必要です。

## HTTP から決済の意味へ進む

テストプロバイダーを使い、練習用プロジェクトで決済をモデル化します。

1. 安定した識別子と注文の金額・通貨を持つ、アプリケーションの決済試行を記録します。
2. 信頼されたアプリケーション状態からプロバイダーリクエストを構築します。
3. プロバイダーが対応していれば、文書化された冪等性の仕組みを使います。これはプロバイダー固有の作業です。
4. 応答をデコードして検証し、操作識別子を保持します。
5. 確認済み、拒否、未解決の結果をコマンドで記録します。
6. 未解決の試行についてプロバイダーに実際の状態を問い合わせ、照合します。

これは設計手順であり、提供済みの決済アダプターではありません。プロバイダーの現在の API は別に選び、確認します。顧客が成功ページへ戻ったことだけでは、決済確認の証拠になりません。

プロバイダーからのコールバックでは、受け取ったデータをコマンドに変換する前に真正性を検証します。汎用のインバウンドワーカー抽象化は、決済プロバイダーの署名検証や Webhook ルートを提供しません。

## 現在の再試行境界を理解する

ソースの `Retry` レコードでは、`maxAttempts` に最初の試行を含むことを説明しています。現在の実行器は再試行する前に `attempt <= maxAttempts` を比較するため、試行が 1 回余分に許される可能性があります。そのため `noRetry` プリセットを、失敗するリクエストが一度しか送信されない保証として扱ってはいけません。

実行器は、ステータスコードのリストとは別にリクエストエラーも再試行します。列挙されたステータスだけが別のリクエストにつながると推測しないでください。これらの実装上の制限は、課金、課金対象の AI 呼び出し、ラベル購入に重要です。操作を承認する前に、制御されたエンドポイントで実際のリクエスト数をテストします。

タイムアウトも、リモート側が何もしなかった証拠ではありません。証拠が得られるまで、未解決の結果を保ちます。

## 制御した状態確認を実行する

ヘルパーとコールバックコマンドを追加したら、`mug-shop` から `neo build` を実行します。`tests/` スイートで、JSON のエラー応答を含む状態の対応付けを `neo test` で確認します。`neo run` でアプリケーションを起動し、コマンドを通してリクエストを発生させ、結果の状態クエリを調べます。決済認証情報を接続する前に、制御されたエンドポイントを使います。

## 演習：決済の応答を失う

タイムアウト後の練習用アプリケーションの状態、その画面表示、不確実性を解決する方法を記述します。その後、カレンダーエントリの作成や書類の処理送信にもどの部分が適用できるか考えます。

<details>
<summary>確認の例</summary>

操作を受け入れた後で接続を切るテストプロバイダーを使います。選んだプロバイダーの契約に従い、繰り返しリクエストで二重課金できないことを確認します。拒否、壊れた JSON、有効な JSON のエラーステータス、未知の操作 ID、後の照合結果も確認します。実プロバイダーのサンドボックス検証は、応答対応付けのユニットテストとは別に記録します。

</details>

より小さなプロバイダーインテグレーションは、[メール](/ja/connect/email/)へ進みます。

<details>
<summary>フレームワークソースの注記</summary>

- [integrations/Integration/Http/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Request.hs)
- [integrations/Integration/Http/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Response.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/Integration/Http/Retry.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Retry.hs)
- [integrations/test/Integration/Http/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Http/InternalSpec.hs)
- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)

</details>
