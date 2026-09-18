---
title: 再利用可能なインテグレーションを構築する
description: 外部作業を小さなリクエストと明示的な結果の背後にパッケージします。
sidebar:
  order: 10
---
<!-- translation-source-sha256: e3e707031b44439183bc1787e923b91de97405c7627b025459c1cd831f7efa20 -->

NeoHaskell がラップしていない外部 API やローカルツールをアプリケーションで必要とするとき、その作業を再利用可能なインテグレーションとしてパッケージできます。呼び出し元は小さなレコードでリクエストを記述し、プロトコルの詳細、認証情報、応答の解析を 1 つの実装に保ちます。

これは道のりの中でも深い分岐です。アプリケーションのルールだけでなく、ネットワークやサブプロセスの振る舞いにも責任を持ちます。プロバイダーに[汎用 HTTP](/ja/connect/http-and-payments/)が合うなら、まずそちらから始めます。

## mug-shop にアダプターの場所を与える

自分の `mug-shop` プロジェクトで作業を続けます。`src/Shop/Integrations/Parcel.hs` のようなモジュールから始め、責任を分ける必要が出たら、リクエスト、レスポンス、内部モジュールに分割します。結果として import するモジュールは `Shop.Integrations.Parcel` とその子になります。プロバイダー固有の依存関係は、[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)に従ってプロジェクトの `neo.json` に置きます。

役に立つ構造は、次を分けます。

- API 利用者が import するファサードモジュール。
- 入力、設定、結果のコールバックを持つリクエスト型。
- 役に立つプロバイダー結果を持つレスポンス型。
- 実行を実装または組み合わせる内部モジュール。

架空の配送ラベルプロバイダーなら、アプリケーションのリクエストに配送参照と荷物の詳細を含めるかもしれません。これは設計例であり、提供済みの配送 API ではありません。どのプロバイダー状態がラベル作成を確立するか、応答が失われたらどうするかを決めます。

両方のコールバックは、`InternalTransport` で宣言された 1 つのコマンド型を返すようにします。コールバックで、呼び出し元自身のワークフロー識別子を捕捉させます。再利用可能なインテグレーションを、特定のアプリケーションエンティティと結合しないでください。

## 実行契約を理解する

`Integration.ToAction` はリクエストを `Action` に変換します。中心となるメソッドは次のとおりです。

```haskell
class ToAction config where
  toAction :: config -> Action
```

アクションは `ActionContext` を受け取り、`Task IntegrationError (Maybe CommandPayload)` を返します。成功した作業では `Integration.emitCommand` を使えます。後続コマンドがない作業では `Integration.noCommand` を使えます。

[Cart と Stock の調整](/ja/connect/workflows/)で、すでに `Integration.Command.Emit` を使いました。これは外部操作をせず、設定されたコマンドを出力します。配送アダプターでは、結果コマンドを選ぶ前にプロトコル作業を追加します。

HTTP プロバイダーでは、リクエスト処理を複製せず `Integration.Http.Request` を組み合わせます。OpenRouter の `toHttpRequest` は具体例です。エンドポイント、本文、ヘッダー、認証、コールバック、タイムアウトを組み立ててから、実行を委任します。プロバイダーの互換性テストでは、[現在の再試行動作](/ja/connect/http-and-payments/#understand-the-current-retry-boundary)を保ちます。

## 呼び出し元の復旧に役立つエラーを選ぶ

ランタイムのエラー語彙には `NetworkError`、`AuthenticationError`、`ValidationError`、`RateLimited`、`PermanentFailure`、`UnexpectedError` があります。

どの失敗を結果コマンドにし、どの失敗をリクエスト実行前の準備失敗にするかを決めます。その境界をインテグレーションのドキュメントで説明します。コールバックを待つ呼び出し元には、コールバックを通らずに起きた失敗を検出する運用上の方法が必要です。

プロバイダーの本文を任意のエラー文字列として返さないでください。顧客データや認証情報が含まれる可能性があります。安全な説明と、プロバイダーが対応していれば相関識別子を保持します。

## 長寿命リソースと永続状態を分ける

インテグレーションがエンティティごとに高価なリソースを必要とするなら、`Integration.Lifecycle.OutboundConfig state` は次を提供します。

```haskell
initialize :: StreamId -> Task Text state
processEvent :: state -> Event Json.Value -> Task Text (Array Integration.CommandPayload)
cleanup :: state -> Task Text Unit
```

これらはライフサイクル型から抜粋した**フィールドシグネチャ**です。ワーカーはリソースを初期化し、イベントを処理し、停止または回収時に後処理します。後のイベントが新しいワーカーを作ることがあるため、この状態は永続的なワークフロー履歴ではありません。

ワーカーは `ConcurrentVar`、接続ハンドル、その他の一時リソースを保持できます。ワーカーが再作成されると値はリセットされる可能性があります。未完了の作業を、その変数だけでなく永続的なアプリケーション状態に保ちます。`mug-shop` なら「ラベル購入がまだ保留中」がその一例です。

`shipmentLifecycle` を実装したら、それと `CartEntity` を `src/App.hs` で利用できるようにします。この**登録の断片**が Cart イベントに接続します。

```haskell
    |> Application.withOutboundLifecycle @() @CartEntity (\_ -> shipmentLifecycle)
```

`shipmentLifecycle` は上の 3 つの関数をすべて持つ `OutboundConfig state` 値でなければなりません。配送実装が提供されているわけではありません。リソースのライフサイクルが役立つ場合だけ、このレイヤーを使います。ほとんどのプロバイダーリクエストはステートレスのままにできます。

## 外部からの作業を受け取る

`Integration.inbound` は、`run` 関数が emit コールバックを受け取る `InboundConfig` をラップします。ワーカーは外部から来た情報をコマンドに変換します。アプリケーション起動時に、登録済みのインバウンドワーカーが起動します。

Webhook インテグレーションには、実際のリスナー、プロバイダーの認証・署名検証、入力上限、確認応答の方針が必要です。この抽象化が自動生成された Webhook サーバーを提供するわけではありません。同様に、キューのコンシューマーには、確認応答、再配送、永続的な進捗について意図的なポリシーが必要です。

## 出荷前にアダプターを証明する

`Integration.getActions` でハンドラーが選んだアクションを調べ、制御された `ActionContext` で `Integration.runAction` を使って実行を試します。純粋なリクエスト構築関数は、通信を送らずにプロトコルの対応付けをテストするのに特に役立ちます。

アダプターのテストは `tests/` ディレクトリの他のテストと並べます。モジュールを追加したら `neo build` を実行し、その後 `neo test` でリクエストの対応付けとエラーケースを確認します。有効な入力、プロバイダーの拒否、壊れた成功データ、認証情報の不在、タイムアウト、重複呼び出し、リモートが成功した後の失われた応答を確認します。制御されたサーバーに対するリクエスト数を数えます。最後にサンドボックスの認証情報で `neo run` を実行し、アプリケーションのコマンドと結果クエリを通してプロバイダーの契約を確認します。

**演習：**練習用プロジェクト向けに、制御されたテストプロバイダーへの配送状態検索をパッケージします。別の読み手に、公開リクエスト API だけを使って設定してもらいます。通常の選択をするために内部 HTTP 解析を理解する必要があるなら、API とドキュメントを一緒に見直します。

ランタイム依存関係、設定、復旧計画は、[アプリケーションの実行](/ja/operate/deployment/)に戻って確認します。

<details>
<summary>フレームワークソースの注記</summary>

- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [core/service/Integration/Lifecycle.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Lifecycle.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [testbed/src/Testbed/Cart/Integrations/EventCounter.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/EventCounter.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
