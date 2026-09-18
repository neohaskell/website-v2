---
title: アプリケーションデータを永続化する
description: イベント、リードモデル、ファイル、認証情報のストレージを選び、再起動後に何が残るかを証明します。
sidebar:
  order: 1
---
<!-- translation-source-sha256: 16be86b1ad86ca0cea9a3ceedf55e41210cd17c287c35a5f5280b7900f75b354 -->

アプリケーションを再起動しても、残すと約束した作業は消えないべきです。一方、一時的なダッシュボードなら再構築しても安全かもしれません。永続化はその区別から始まります。どの情報が権威あるものか、どれを再構築できるかを決めます。`mug-shop` の Cart と受け入れられた追加が、再起動を通して追う小さな例になります。

イベントソーシングされたアプリケーションでは、受け入れられたイベントがビジネス履歴を保ちます。エンティティとクエリは、異なる目的でその履歴を解釈します。イベントを安全に保つことは必須ですが、アプリケーションが保持する必要があるデータはイベントだけではありません。

以下のすべてのパスは、`neo new` で作った `mug-shop` プロジェクトのルートからの相対パスです。このレッスンではまず置き換えを説明し、その後、Postgres チェックポイントに必要な完全な `ShopConfig`、ストレージファクトリー、`App.hs` のファイルを示します。インテグレーションをすでに追加している場合は、その import と登録を残し、完全な永続化ファイルを統合します。

## ストレージの種類を特定する

| 情報 | NeoHaskell の仕組み | アプリケーション上の決定 |
| --- | --- | --- |
| 受け入れられたイベント | `Service.EventStore` | 再起動後も残す必要がある作業を受け入れる前に、永続ストレージを使う |
| クエリ結果 | `Service.QueryObjectStore` | イベントストレージとは独立に、メモリか Postgres を選ぶ |
| アップロードされたバイト列 | `blobStoreDir` で設定するローカル Blob ストア | 実際のファイルを保持し、バックアップする |
| ファイルの所有権とライフサイクル | ファイル状態ストア | 永続的なバイト列と同じく、永続的な状態を選ぶ |
| 接続済みプロバイダーのシークレット | `Application.withSecretStore` | デプロイに必要な寿命を持つストレージを提供する |

スターターは `persistent = False` で `SimpleEventStore` を設定します。その設定にファイルシステムのようなパスを書いても、設定は永続的になりません。最初の実験には適していますが、再起動するとその実験のイベント履歴は失われます。

## 設定をデータベース用に置き換える

自分の `mug-shop` ディレクトリで続けます。コマンドは `neo.json`、`src/App.hs`、`src/Shop/` のモジュールに対して引き続き動きます。ここで道のりにデータベースを追加します。前のレッスンでは Cart と Stock にデータベースは必要ありませんでした。

パスワードは最初の例に適しています。必須で、環境から提供され、設定レコードを表示すると秘匿されます。

```haskell
Config.field @Text "dbPassword"
  |> Config.doc "PostgreSQL password"
  |> Config.required
  |> Config.envVar "DB_PASSWORD"
  |> Config.secret
```

その他の選択でサーバーとデータベースを識別し、接続プールと TLS ポリシーを設定します。`src/Shop/Config.hs` を下の完全なファイルで置き換えます。以前の `persistEvents` フィールドを残しているため、このオーバーレイは Build チェックポイントの直接の拡張です。切り替え後、そのフィールドは Postgres イベントストアを制御しなくなるため、ほかで使わなくなったら削除できます。

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

設定は `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`DB_POOL_SIZE`、`DB_SSL_MODE`、`DB_SSL_ROOT_CERT` に直接対応します。ローカルのデフォルトは、生成されたプロジェクトの Docker Compose データベースに一致します。パスワードを必須にするため、認証情報がないと設定エラーになります。このローカル演習を離れるときは、デプロイ先データベースの実際のアドレス、認証情報、プール予算、TLS 要件を選びます。

## ストレージファクトリーを作成する

`src/Shop/Storage.hs` を作成します。設定からストレージへの変換をこのファイルに置くと、`App.hs` はファクトリーを選ぶだけになります。まず契約を記述します。

```haskell
makePostgresConfig :: ShopConfig -> PostgresEventStore
```

`host = config.dbHost` のように、多くのフィールドは値をそのまま渡します。TLS モードは環境からテキストが来るため、検証が必要です。

```haskell
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
```

下の完全なファクトリーをコピーします。プールと TLS 設定を含む、現在の `PostgresEventStore` の 8 フィールドすべてを渡し、空のルート証明書パスは不在として扱います。

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

未知の TLS モードは起動時に失敗します。`unset` ならドライバーのデフォルトのネゴシエーションを使います。環境変数名が認識されそうな名前だからではなく、ファクトリーが値を渡すから設定が効果を持ちます。

## アプリケーションのイベントストア配線を置き換える

`src/App.hs` に次の import を追加します。

```haskell
import Shop.Storage qualified as Storage
```

`SimpleEventStore` の import と `Application.withEventStore` 式を Postgres ファクトリーに置き換え、トランスポート、サービス、クエリ、インテグレーションの登録は残します。

```haskell
  |> Application.withEventStore Storage.makePostgresConfig
```

下の完全な結果は、Cart と Stock の調整、アップロードのレッスンを続けながらイベントストアを置き換えます。一時的なタイマーの観測は終わっているため、その登録はありません。機能を省略した場合は、その import と登録を省略します。認証や追加したほかのものは残します。`ShopConfig` と `Shop.Storage` は、上で作成した 2 つの完全なファイルです。

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

`neo.json` に追加パッケージは必要ありません。イベントストアの実装はフレームワークが提供します。生成されたプロジェクトとこれらの例が互換性のあるコンパイラとフレームワークを使えるよう、同じ Neo リリースの CLI とフレームワークの pin を保ちます。

## ローカルデータベースとアプリケーションを起動する

Docker とその Compose コマンドが使える場合は、生成されたプロジェクトの `docker-compose.yml` を使います。

```sh
docker compose up -d postgres
docker compose exec postgres pg_isready -U neohaskell
neo build
DB_PASSWORD=neohaskell neo run
```

`pg_isready` がデータベースが接続を受け入れると報告するまで待ちます。上のパスワードはローカル Compose 例の認証情報です。実際の認証情報はデプロイのシークレット機構から提供します。設定ローダーはプロセス環境を読みます。`.env` ファイルを作っただけでは、アプリケーションに届いた証明になりません。

別のローカルサービスがポート 5432 を使っている場合は、起動前に Compose のホストマッピングを `55432:5432` のような空きポートに変更し、アプリケーションやテスト実行時に `DB_PORT=55432` を提供します。関係のないデータベースを停止しないでください。

ストアを切り替えても、以前のインメモリ履歴や `persistEvents` で有効にしたローカルイベントファイルは移行されません。Postgres で起動した後、次の実験用に Cart を作成します。繰り返し可能な HTTP テストでは、動いているアプリケーションを停止し、使い捨てのローカルデータベースに対して `DB_PASSWORD=neohaskell neo test` を使います。CLI が独自のサーバーを起動します。テストはデータを書き込むため、このコマンドを本番データベースへ向けないでください。

## 永続イベントと永続クエリは別である

クエリは、`Application.withQueryObjectStore`（`useQueryObjectStore` としても公開）でクエリストアのバックエンドを提供しない限りメモリを使います。`PostgresQueryObjectStoreConfig` には、独自の接続とプール設定があります。ストアはインスタンス識別子だけでなく名前でもクエリを区別するため、同じエンティティの 2 つのビューは分離されたままです。

重要な運用上の境界があります。低レベルのクエリサブスクライバー API はチェックポイントとハッシュを考慮した再構築を提供しますが、通常の `Application` 配線は現在 `Subscriber.new` を構築します。Postgres のクエリストアを選んだだけでは、**起動時に保存済みチェックポイントから再開する証拠にはなりません**。実際の配線とプロジェクションロジックで再起動とリプレイをテストします。特に、値を置き換えず累積するプロジェクションでは重要です。

## 代表的な変更で永続性を証明する

ローカルの Postgres 設定で、[HTTP とフロントエンド](/ja/build/http-and-frontend/)の Cart ルートを使います。

1. Cart を作成し、正の数量を追加し、その識別子と期待する内容を保存します。
2. `CartSummary` が期待する結果を表示するまで待ち、数量 0 を送って拒否を確認します。
3. Ctrl-C で停止し、同じデータベースを使って、同じプロジェクトからもう一度 `DB_PASSWORD=neohaskell neo run` を実行します。
4. `/ready` を待ち、同じ Cart のサマリーを取得します。
5. 識別子、エントリ数、空・非空の状態を比較します。リプレイで追加が 2 回数えられていないこと、拒否されたリクエストが何も寄与していないことを確認します。

ワークフローが添付ファイルを使うなら、アップロードした添付でも繰り返します。データベース行が残っていても、対応するバイト列が残った証拠にはなりません。放置されたアップロードをどう削除するかも確立します。`Service.FileUpload.Web` には低レベルのクリーンアップワーカーがありますが、現在の `Application.withFileUpload` の起動処理はそれを起動しません。そのため `cleanupIntervalSeconds` を設定しただけでは、自動クリーンアップの証拠になりません。選んだライフサイクル配線を検証し、ストレージの増加を監視します。

保持すると決めたリソースだけを残して、プロセスを新しいホストへ移してみます。Cart は保持したイベントストアから復旧可能なはずです。ファイルやプロバイダー接続が欠ければ、別の永続化依存関係が明らかになります。それをデプロイとバックアップ計画に追加し、実験を繰り返します。通常の再起動が成功しただけで、永続性があると推測しないでください。

次は[デプロイ](/ja/operate/deployment/)と[復旧](/ja/operate/recovery/)へ進みます。

<details>
<summary>フレームワークとチェックポイントのソース</summary>

- [Postgres イベントストアのフィールド](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Postgres/Internal.hs)
- [TLS モードの解析](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Infra/Postgres/SslMode.hs)
- [生成されたローカルデータベース](https://github.com/neohaskell/NeoHaskell/blob/main/neo/starter/docker-compose.yml)
- [永続化設定全体](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Config.hs)
- [永続化ストレージファクトリー全体](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Storage.hs)
- [永続化アプリケーション全体](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/App.hs)

</details>
