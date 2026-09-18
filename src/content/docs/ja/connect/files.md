---
title: ファイルをアップロードして添付する
description: アップロードしたバイト列を保存し、ファイル参照を検証し、受け入れられたアプリケーションのアクションに添付します。
sidebar:
  order: 5
---
<!-- translation-source-sha256: 0a81f2fdd4de6e40404671fbcce68f5cdbb189b58e661c2e8a4fec26d9c10443 -->

誰かがファイルをアップロードした後、フォームを完了する前にブラウザーを閉じることがあります。アプリケーションには、未完了のアップロードを一時保存する場所と、ファイルが受け入れられたアクションの一部になったときの明確な関連付けが必要です。

NeoHaskell は、ファイル参照、アップロードとダウンロードのルート、ユーザー向け経路の所有権チェック、ファイルのライフサイクルを提供します。どのファイルを受け入れ、いつ添付するかを決めるのはあなたです。自分の `mug-shop` プロジェクトで続けます。アップロード設定ファイルを 1 つ作り、アプリケーション登録を 1 つ追加し、小さなサンプルをアップロードし、アートワークを個別のマグカップにどう添付するかを設計します。

以下のすべてのパスは `mug-shop` プロジェクトのルートからの相対パスです。焦点を絞ったスニペットで、まず選択を説明します。完全なファイルには、実行可能なチェックポイントに必要な正確な import と周辺のアプリケーションコードがあります。

## アップロードポリシーを選ぶ

このローカル演習では、小さなテキストメモ、PNG アートワーク、PDF を許可します。バイト列を `./uploads` に保存し、ライフサイクルのメタデータをメモリに保持し、未完了の参照を 6 時間後に期限切れにします。

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

これは学習用の設定です。メタデータストアはメモリ上にあるため、`uploads/` にバイト列が残っていても再起動すると参照を失います。デプロイするアプリケーションでは、永続的なメタデータと永続的な Blob ストレージを一緒に選びます。

## アップロード設定ファイルを作成する

`src/Shop/Uploads.hs` を作成します。どのファイルアップロード型を import すべきか推測せず、下の完全なファイルを 1 ファイルとしてコピーします。

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

フィールドはアプリケーション上の決定です。

| フィールド | デプロイで何を意味するかを決める |
| --- | --- |
| `blobStoreDir` | 実際のファイルバイト列を置く場所 |
| `stateStoreBackend` | ファイルのライフサイクルメタデータを永続化する場所 |
| `maxFileSizeBytes` | 受け入れる最大アップロードサイズ |
| `pendingTtlSeconds` | 未完了のアップロードを利用可能にする時間 |
| `cleanupIntervalSeconds` | クリーンアップのスケジュール設定 |
| `allowedContentTypes` | 許可する宣言メディア型、または制限なし |
| `storeOriginalFilename` | 元の名前を保持するか |

起動時に、サイズと時間の値が正であること、ディレクトリが空でないこと、クリーンアップ間隔が pending TTL より短いことを確認します。現在のアプリケーション配線は、利用可能なクリーンアップワーカーを起動しません。アクセス時には期限切れを強制しますが、この設定では放置された Blob バイト列を自動的に回収しません。デプロイするバックエンド向けにクリーンアップを手配し、テストします。

## `App.hs` にアップロード対応を追加する

`src/App.hs` で、ほかの `Shop` import と一緒に次の qualified import を追加します。

```haskell
import Shop.Uploads qualified as Uploads
```

既存のトランスポート、サービス、クエリの後ろに次の登録を追加します。

```haskell
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

`@()` ファクトリーは、このローカル例では `ShopConfig` から独立しています。ディレクトリと上限をデプロイ設定にする場合は、`Application.withConfig` で登録した設定型から受け取る関数にファクトリーを置き換えます。

[ワークフローのレッスン](/ja/connect/workflows/)を完了した後の、結果の `src/App.hs` 全体は次のようになります。アウトバウンド登録を保ち、アップロードを追加しています。直接このページに来た場合は、同じ場所にそのレッスンのワークフローの 2 行を追加するか、前のページを完了するまで省略します。

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

## 添付する前にバイト列をアップロードする

編集後に停止・ビルドし、プロジェクトルートからアプリケーションを起動します。

```sh
neo build
neo test
neo run
```

同じプロジェクトルートの別のターミナルで、フィクスチャを作成し、実行中のサーバーに送ります。

```sh
mkdir -p examples
printf 'Blue mug artwork draft\n' > examples/artwork-note.txt
curl -F 'file=@examples/artwork-note.txt;type=text/plain' \
  http://localhost:8080/files/upload
```

`fileRef`、`filename`、`contentType`、`sizeBytes`、`expiresAt` を含む JSON を期待します。この最初の往復は、認証なしのローカルアプリケーションを使います。認証を有効にしている場合は、[アクセス制御](/ja/build/access-control/)の説明に従って認証情報を渡します。

返された参照を使ってバイト列をリクエストします。返された `fileRef` でプレースホルダーを置き換えます。

```sh
curl http://localhost:8080/files/YOUR-FILE-REFERENCE
```

**現在の認証済みダウンロードの制限：**ダウンロードルートは `Everyone` ミドルウェアモードを使い、トークンが存在していても匿名 claim を返します。そのため、認証済み subject が所有するアップロードがこのルートからダウンロードできるとは限りません。非公開の添付を有効にする前に、この経路を検証して解決します。匿名の演習は、認証済み所有権のエンドツーエンド対応を確立しません。

## 受け入れられたアクションを通して参照を添付する

バイト列をアップロードしただけでは、Cart は変わりません。アートワーク機能を追加するには、`attachment :: FileRef` フィールドを持つコマンドを作成します。`FileRef` は `Service.FileUpload.Core` で定義された参照型です。[コマンドとイベント](/ja/build/commands-and-events/)のコマンドマーカーを使います。フレームワークはコマンドの実行前に参照を解決し、メタデータを `RequestContext.files` で提供します。

ファイル参照を、Cart やアートワークのリクエストとの関連付けとともに受け入れられたイベントに保持します。生のバイト列をイベントにコピーしないでください。アートワークを表示するコマンド、イベント、ビューは新しいアプリケーション作業です。画面に「添付」アクションを提供する前に、これらのファイルを作成します。

リゾルバーは、ファイルの存在、削除、pending の期限切れ、所有権、Blob の存在を確認します。pending の参照は期限切れになります。確定済みの参照は、pending TTL が過ぎただけでは拒否されません。アプリケーションには、保持と削除のルールも必要です。

バックグラウンドのインテグレーションが使うファイルアクセスコンテキストは、ユーザーのリクエストコンテキストとは異なります。実装は参照からストレージを取得しますが、要求したユーザーの所有権チェックは持ちません。関連付けを検証した認証済みアクションからだけ処理を起動します。信頼できないプロンプトから任意の参照を受け取り、バックグラウンドプロセッサーへ渡してはいけません。

宣言されたメディア型はルーティングと上限に役立ちますが、バイト列が有効なアートワークや安全な書類であることは証明しません。アプリケーションが依存する性質を、受け入れる前に検証します。

## 演習：顧客が放置したアートワーク

練習用プロジェクトで、いつアートワークを注文に添付するか、pending の期限切れ後にどうするか、保存されたバイト列がない場合に画面へ何を表示するかを決めます。有効な所有済み参照、別ユーザーの参照、期限切れの pending アップロード、削除済み参照、Blob バイト列の不在、multipart データの不在、サイズ超過ファイルをテストします。必要な添付を解決できない場合は、コマンドを拒否されたままにします。`neo test` でこれらの確認を実行し、別にライブ HTTP アップロードルートを試します。非公開の添付を有効にする前に、認証済み所有権のシナリオを追加します。

添付ファイルのライフサイクルが明確になったら、[書類処理](/ja/connect/documents/)へ進みます。

<details>
<summary>フレームワークソースの注記</summary>

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
