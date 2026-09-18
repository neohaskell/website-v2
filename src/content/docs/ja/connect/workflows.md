---
title: エンティティ間の作業を調整する
description: 各ルールを明示したまま、サービス間でイベントとコマンドを接続します。
sidebar:
  order: 1
---
<!-- translation-source-sha256: 7916e17a3e9a10332cb125157f4a090af1d94900dad98769570db76df4cba7b4 -->

受け入れられた 1 つの変更が、アプリケーションの別の部分の作業を必要とすることがあります。責任を分けると各ルールの場所が明確になりますが、一方が変わり他方がまだ変わっていない期間が生まれます。インテグレーションによって、その引き渡しを明示できます。

[在庫とチェックアウト](/ja/build/stock-and-checkout/)から、自分の `mug-shop` ディレクトリで続けます。Cart と Stock のサービスは、すでに別々の決定を行います。ここで接続します。マグカップ 2 個の追加を Cart に記録し、その後 Stock に 2 単位の予約を要求します。このポリシーでは追加時に予約します。チェックアウト時に予約するのは後のバリエーションです。

以下のすべてのパスは `mug-shop` プロジェクトのルートからの相対パスです。例は同じプロジェクトを成長させます。小さな宣言でまず決定を説明し、各セクション後半の完全なファイルをコピーできるチェックポイントとして示します。

## 境界を越えるものを決める

引き渡しの役割は 1 つです。受け入れられた `ItemAdded` イベントを在庫リクエストに変えます。重要な値は Stock サービスへ送るコマンドです。

```haskell
ReserveStock
  { stockId = added.stockId
  , quantity = added.quantity
  , cartId = cart.cartId
  }
```

`added` は `ItemAdded` の中にあるペイロードで、`cart` がカート識別子を提供します。その値を `Command.Emit` で包み、インテグレーションランタイムが配送できるようにします。これはアプリケーションコマンドです。そのため Stock の決定と拒否ルールを迂回せず保ちます。

## アウトバウンドインテグレーションを作る

プロジェクトのルートから、インテグレーションのディレクトリを作成します。

```sh
mkdir -p src/Shop/Cart/Integrations
```

プロジェクトルートからディレクトリとファイルを作成します。`mkdir -p src/Shop/Cart/Integrations` を実行し、`src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs` を作成します。下の宣言とルールから始め、その後完全なファイルをコピーします。`CartEntity` はイベント用に再構築された状態で、`CartEvent` は Cart スライスがすでに定義したイベントファミリーです。

```haskell
data ReserveStockOnItemAdded = ReserveStockOnItemAdded

type instance EntityOf ReserveStockOnItemAdded = CartEntity

handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none

deriveOutboundIntegration ''ReserveStockOnItemAdded
```

商品が追加されたら、要求された数量を予約するよう Stock に依頼します。ほかの Cart イベントはアクションを生成しません。`Command.Emit` は登録済みの別サービスへコマンドを送信します。外部 HTTP 呼び出しは行いません。

マーカーは `handleEvent` をアウトバウンドの仕組みにつなぎます。いつ在庫を予約すべきかを決めるビジネスルールは、引き続き関数が提供します。マーカーが選ぶわけではありません。

### インテグレーションファイル全体

下のフェンスにある宣言に必要な import を含め、内容全体を指定パスにコピーします。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs"
module Shop.Cart.Integrations.ReserveStockOnItemAdded (
  ReserveStockOnItemAdded (..),
  handleEvent,
) where

import Core
import Integration qualified
import Integration.Command qualified as Command
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Stock.Commands.ReserveStock (ReserveStock (..))


data ReserveStockOnItemAdded = ReserveStockOnItemAdded


type instance EntityOf ReserveStockOnItemAdded = CartEntity


handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none


deriveOutboundIntegration ''ReserveStockOnItemAdded
```

## Stock コマンドとインテグレーションを登録する

新しいハンドラーが `ReserveStock` を出力できるのは、Stock サービスがそのコマンドを `InternalTransport` で登録している場合だけです。Stock レッスンのソースがすでにそうしています。公開 Cart コマンドも残します。

Cart サービスの `CreateCart` と `AddItem` の登録を保ちます。インテグレーションの登録は `App.hs` に置きます。別の Cart コマンドではありません。

Cart サービスがまだ Build のチェックポイントと一致するなら、以下が結果の完全なファイルです。タイマーの章をすでに追加している場合は、追加の `CreateCartInternal` import と登録を保ちます。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

このワークフローのためだけに `CreateCartInternal` を追加しないでください。[タイマーのレッスン](/ja/connect/timers/)で導入します。

## `App.hs` にインテグレーションを追加する

`src/App.hs` で、ほかの `Shop.Cart` import と一緒に次を追加します。

```haskell
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
```

既存のサービスとクエリの後ろに、すべてを残したまま次の登録を追加します。

```haskell
  |> Application.withOutbound @ReserveStockOnItemAdded
```

ファイルがまだ Build のチェックポイントと一致するなら、下の完全な結果で置き換えるのが最短です。アップロード、タイマー、認証、その他のインテグレーションをすでに追加している場合は、その import と登録を残し、対応する場所にこの 2 行を追加します。

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
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
  |> Application.withOutbound @ReserveStockOnItemAdded
```

型付きインテグレーションは、記録された履歴から Cart の状態を再構築します。登録には `CartEntity` のデフォルト開始値が必要です。エンティティマーカーが `initialState` からすでに提供しています。

```haskell
deriveEntity ''CartEntity ''CartEvent
```

この宣言は、`src/Shop/Cart/Entity.hs` で `initialState`、`update`、`getEventEntityId` の後ろに置かれたままにします。マーカーがエンティティの仕組みを提供するため、手動の `Default` インスタンスを追加しないでください。

## 接続した振る舞いを実行する

プロジェクトルートから、ファイルを変更する前に既存のサーバーを停止し、次を実行します。

```sh
neo build
neo run
```

[在庫とチェックアウト](/ja/build/stock-and-checkout/)のリクエストを別のターミナルで使います。利用可能 3 単位の新しい Stock と、新しい Cart を作り、返された識別子で 2 単位を追加します。Stock のクエリが利用可能 1、予約済み 2 を報告するまでポーリングします。Cart の成功応答が、Stock のクエリもすでに追いついたことを意味するわけではありません。

Cart のサマリーも読みます。追加が 2 単位を要求していても、エントリ数を数えるため `itemCount` は 1 です。Stock は単位数量を追跡します。これらのビューは同じワークフローについて異なる問いに答えます。

## 繰り返し可能なインテグレーションテストを追加する

プロジェクトルートから `tests/stock-reservation.hurl` を作成します。`neo test` の前に `neo run` を停止します。CLI がテストサーバーを起動するためです。以下の完全なファイルは、新しい識別子を取得し、両方のビューを確認し、ビューを変えずに数量 0 を拒否し、その後、最後に残った 1 単位を予約します。

```hurl
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}
HTTP/1.1 200
[Captures]
stock_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]
HTTP/1.1 200
[Captures]
cart_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":2}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":0}
HTTP/1.1 400

GET http://localhost:8080/queries/cart-summary
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1

GET http://localhost:8080/queries/stock-level
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":1}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 2

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 0
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 3
```

`mug-shop` から `neo test` を実行します。クエリの再試行が非同期のインテグレーションとプロジェクションを待ちます。受け入れられた追加を再送するわけではありません。小さな Cart と Stock のテストも残します。このシナリオは接続した振る舞いをテストし、小さなテストはどのローカルルールが失敗したかを示します。

## 成功経路だけでは決まらないケース

> **Jess:** 「在庫がないなら、商品追加を自動的に取り消します。」
>
> **エージェント:** 「Stock コマンドが予約を拒否するので、Cart は変更されません。」
>
> **Jess:** 「Cart のイベントはすでに受け入れられています。Cart を更新する戻りの経路を見せてください。」

Stock 側の拒否では、すでに記録された Cart イベントを消せません。上のハンドラーは一方向の通信を提供します。完全なワークフローには、予約失敗を記録し、チェックアウトで許されることを変えるなど、明示的な結果の経路が必要です。その戻りの経路を実装することは、練習用プロジェクトの役に立つ拡張です。

これは**プロセスマネージャー**の問題です。エンティティ間のステップを調整し、進行状況を追跡し、未完了の作業を扱います。保留中の作業と復旧を明示的に表します。この例では、Cart が商品を受け入れただけでチェックアウト完了とはみなせません。

## 演習：在庫を予約する時点を選ぶ

練習用プロジェクトのポリシーを「追加時」から「チェックアウトのリクエスト時」に変えます。コードを変更する前にイベントの順序を書きます。カートへの追加では、もう在庫を予約しないようにします。チェックアウトは、安定したビジネス操作に対して一度だけ予約を要求します。十分な在庫、不十分な在庫、重複リクエスト、予約保留中のキャンセルを確認します。それぞれの場合に顧客が見るものを定義します。

次のステップが自分のアプリケーションの外へ出るときは、[プロバイダー呼び出し](/ja/connect/http-and-payments/)へ進みます。

<details>
<summary>フレームワークソースの注記</summary>

- [testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs)
- [core/service/Service/OutboundIntegration/TH.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/OutboundIntegration/TH.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/tests/scenarios/stock-reservation.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/scenarios/stock-reservation.hurl)

</details>
