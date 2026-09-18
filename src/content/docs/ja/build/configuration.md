---
title: "設定"
description: 型付き設定を、それを利用するアプリケーションの各部分につなぎます。
sidebar:
  order: 9
---
<!-- translation-source-sha256: 3efdbe4acc9f0b262596a1e4e03d8517882c1c2c7856ae43dd8256fee4c90191 -->

アプリケーションは、ビジネスルールを一貫させたまま環境ごとに異なる設定を必要とします。設定は選択に名前を付け、型を検証し、実行中のアプリケーションとの接続を明示します。

データベースのアドレスは設定です。合意した注文価格はビジネス履歴に属します。明日設定を変えても、昨日の合意を書き換えてはいけません。

以下の例では、関係する宣言と振る舞いを示し、各配置先に名前を付けます。小さなスニペットで一度に 1 つの選択を説明します。このページの後半にある組み立て済みファイルには、宣言に必要な import が含まれます。[Build ファイル一式](/examples/mug-shop-build.tar.gz)は補足資料で、同じチェックポイントとテストを含みます。

## アプリケーションが使う設定を追加する

ここまでのアプリケーションは、空のインメモリ履歴で必ず起動します。ローカル永続化を明示的な開発設定にし、デフォルトでは同じ振る舞いにします。

まず選択とデフォルトを名前で表します。

```haskell
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

フィールドを `src/Shop/Config.hs` の `defineConfig "ShopConfig"` の内側に置きます。チェックポイントには完全な定義があります。

`defineConfig` はレコードとそのパーサーを生成します。このフィールドには説明、Boolean 型、デフォルト値、環境変数があります。マクロでは、各フィールドに説明と、意図的なデフォルトまたは必須値のポリシーが必要です。

## 設定をストアにつなぐ

Cart と Stock のレッスンを完了したら、その設定を**ローカル開発の基準**につなぎます。すでに認証や他の登録を追加している場合は、それらを保ちます。`Shop.Config` の import を追加し、`withConfig @ShopConfig` を挿入し、`withEventStore` のステップだけを置き換えます。アプリケーションの権限設定を捨てないでください。

`src/App.hs` にある関係するパイプラインのステップは次のとおりです。

```haskell
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
```

`withConfig` は読み込む型を登録します。ストアファクトリーは読み込まれたレコードを消費します。重要な接続はここです。`persistEvents` を宣言するだけでは、ストレージは変わりません。

## 必須値を意図的に追加する

プロバイダーの認証情報は、必須のシークレットフィールドにできます。これは対応するプロバイダーを実装するときに追加する**フィールドリストの断片**であり、現在のアプリケーションに必要なものではありません。

```haskell
  , Config.field @Text "providerKey"
      |> Config.doc "Credential for the selected external provider"
      |> Config.required
      |> Config.envVar "SHOP_PROVIDER_KEY"
      |> Config.secret
```

その後、インテグレーションは `config.providerKey` を消費しなければなりません。`required` は存在を確立しますが、リモートプロバイダーが認証情報を受け入れることまでは証明しません。

`Config.secret` は、生成されたレコード表示と JSON からフィールドを隠します。値を暗号化したり、取り出した後の生のフィールドをコードがログに出すことを防いだりはしません。実際の認証情報は、デプロイ環境の認証情報メカニズムで管理します。

## パーサーだけでなく利用者を検証する

ローダーはプロセスの引数と環境変数を読みます。`.env` ファイルが自動的にプロセス環境へ入るわけではありません。その形式を選ぶなら、明示的なローダーかプロセスマネージャーを使います。

`httpPort` というフィールドも、リスナーを自動的に変更しません。現在のアプリケーションは、8080 で待ち受ける `WebTransport.server` を使っています。固定した別の開発用ポートには、次のパイプラインステップへ置き換えます。

```haskell
  |> Application.withTransport (WebTransport.server {port = 8081})
```

クライアントも合わせて更新します。現在の `neo test` HTTP ワークフローはポート 8080 を調べるため、チュートリアルのテストではそのポートを維持します。Hurl の URL だけ変更しても、起動時の確認先は変わりません。[CLI リファレンス](/ja/reference/cli/)を参照してください。後でポートを設定可能にするなら、解析した値を実際のトランスポートまで追跡し、待ち受けアドレスを確認します。

## ローカル永続化のチェックポイントを組み立てる

ここまでで、フィールドと利用者を別々に見ました。同じ `mug-shop` プロジェクトで、`src/Shop/Config.hs` を次の完全なファイルで作成または置き換えます。

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

次に、`src/App.hs` のアプリケーション配線を、以下の完全なローカルチェックポイントで置き換えます。[アクセス制御](/ja/build/access-control/)の認証済み版をすでに追加している場合は、そのポリシーを保ち、ファイル全体を置き換えるのではなく、既存のパイプラインに `withConfig` と `withEventStore` のステップを挿入します。

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

これらのファイルを作成または置き換えたら `neo build` を実行します。デフォルトでは、`neo test` を実行し、ローカルの新しい演習を始めたい場合は `.neo/events` を削除します。`PERSIST_EVENTS=True` では、再起動の間もサーバーのイベントディレクトリを残し、同じカート ID のサマリーが保たれることを確認します。これは開発用のチェックポイントであり、本番での永続的な復旧保証ではありません。

再起動の演習では、ほかのサーバーを止めて次を実行します。

```sh
PERSIST_EVENTS=True neo run
```

`True` と `False` は大文字で書きます。この Boolean フィールドは型付き Haskell 値のパーサーを使います。カートを作成して ID を保存します。サーバーを停止し、同じコマンドをもう一度実行します。再構築とプロジェクションの時間を見込んで、カートのサマリーを読みます。以前のインメモリ実行で作ったカートは、設定を有効にしてもファイルへ移行されません。

[永続化の章](/ja/operate/persistence/)では、PostgreSQL へ移行し、永続的な復旧を確認する方法を説明します。ローカルイベントファイルは便利な開発オプションですが、アプリケーションの運用にはバックアップ、リストアの証拠、保持の選択、適切なアクセスも必要です。

## 演習：任意か、設定ミスか？

エージェントが、必須のプロバイダーキーに空文字列のデフォルトを与え、起動が成功するようにしました。プロバイダーが利用できない、または設定されていないとき、どの振る舞いを望みますか？

<details>
<summary>考え方と確認の例</summary>

機能が必須なら認証情報を必須にし、ない場合は明確な起動失敗を報告します。任意なら、無効状態を明示的にモデル化します。有効な設定、必須値の不在、型が無効な値をテストします。害のないテスト用認証情報で秘匿を確認し、プロバイダーが設定値を受け取ることも別に確認します。

</details>

次は、ほかのシステムへ接続する前に[アプリケーションをレビューする](/ja/build/your-shop/)へ進みます。

API リファレンス：[設定](https://github.com/neohaskell/NeoHaskell/blob/main/core/config/Config.hs)、[アプリケーションファクトリー](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)、[シンプルストア](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Simple.hs)。
