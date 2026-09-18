---
title: "変更を調整する：在庫とチェックアウト"
description: 2 つ目のドメインを追加し、その決定にどこで調整が必要か定義します。
sidebar:
  order: 5
---
<!-- translation-source-sha256: 3365d2858cbd3e34499d408fb35db1cab4fe86484c41948e1edd6f1059e483a0 -->

受け入れられた 1 つのアクションが、別の決定につながることがあります。スケジュールアプリは、部屋が予約される前にリクエストを受け入れるかもしれません。書類ワークフローは、レビュアーが受け入れる前に下書きを保存するかもしれません。役に立つアプリケーションは、この区別を見えるようにします。

練習用プロジェクトに **Stock** を追加します。カートは選択を記録し、在庫は利用可能な単位と予約済みの単位を追跡します。ここで在庫の決定を実装・テストし、その後[インテグレーションのレッスン](/ja/connect/workflows/)でカートへの追加につなぎます。

以下の例では、関係する宣言と振る舞いを示し、各配置先に名前を付けます。小さなスニペットで一度に 1 つの決定を教えます。このページの後半にある組み立て済みの Stock ファイルには、このチェックポイントに必要な完全なモジュールが含まれます。[Build ファイル一式](/examples/mug-shop-build.tar.gz)は補足資料です。同じプロジェクトでここにあるファイルを作成すれば、チェックポイントを構築できます。

## 約束を明記する

`InitializeStock` は、利用可能な数量が負でないレコードを作成します。`ReserveStock` は、残りが十分な場合にだけ正の数量を予約します。予約すると、単位が `available` から `reserved` へ移ります。

商品 ID と在庫 ID には異なる役割があります。商品はマグカップのデザインを識別し、在庫 ID は利用可能性のレコードを識別します。この演習では、商品ごとに 1 つの在庫レコードを自分で初期化します。コマンドは商品の一意性を強制しません。

プロジェクトのルートから、モジュールのディレクトリを作成します。

```sh
mkdir -p src/Shop/Stock/Commands src/Shop/Stock/Events src/Shop/Stock/Queries
```

## 各事実に焦点を絞ったファイルを与える

初期化では商品と開始数量を記録します。予約ではカートに確保した数量を記録します。2 つを `src/Shop/Stock/Event.hs` の Stock ドメインのイベント型にまとめます。

```haskell
data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
```

イベントマーカーが標準のインスタンスを扱います。

```haskell
deriveEvent ''StockEvent
```

各ペイロードは `Events/` に別々に置きます。`Event.hs` は可能な事実を列挙し、それぞれがどの在庫ストリームに影響するかを識別します。

## 受け入れられた履歴を適用する

エンティティには現在の利用可能性が入ります。予約を適用すると、2 つの件数の間で数量が移動します。

```haskell
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }
```

この更新は `Entity.hs` に置きます。昨日受け入れた予約が妥当だったかを、今日の倉庫に尋ねることはありません。コマンドがリクエストを事実にする前に検証します。

Cart と同様に、`Core.hs` はドメイン型とその操作を再エクスポートするだけです。コマンドを追加しても、大きな実装ファイルにはなりません。

## 0 も含めて在庫を初期化する

`src/Shop/Stock/Commands/InitializeStock.hs` の `InitializeStock` には 2 つの入力フィールドがあります。

```haskell
data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }
```

コマンドは在庫 ID を生成し、初期数量が負なら拒否します。0 は許可します。在庫レコードは存在するが、利用可能なものが残っていない商品もあり得るからです。決定とエンティティ・トランスポート宣言を置いたら、マーカーがそれらをつなぎます。

```haskell
deriveCommand ''InitializeStock
```

## 予約を保護する

`ReserveStock` は、存在、正の数量、利用可能性を確認します。`src/Shop/Stock/Commands/ReserveStock.hs` の最後の決定は、リクエストと現在の状態を比較します。

```haskell
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]
```

このコマンドは `InternalTransport` を使います。アプリケーション内部の作業向けであり、顧客向け HTTP エンドポイントとして公開しません。インテグレーションのレッスンがそのきっかけを提供します。

[テストのレッスン](/ja/build/testing/)では、この決定を直接呼び出します。自動化が呼び出す前に、最後の 1 単位のルールを確立できます。

## 結果を表示してドメインを登録する

`StockLevel` は、商品、利用可能数量、予約数量のビューを提供します。現在の公開ポリシーはこのローカル練習に合っています。実際のカタログで何を見せるかは見直してください。

既存のアプリケーションパイプラインに、Cart やほかの登録を残したまま次のステップを追加します。

```haskell
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## チェックアウトが約束することを決める

ドメインを接続した後でも、カートへの追加が受け入れられた一方で、後の予約が拒否されることがあります。チェックアウトには、観測可能な予約結果と部分的な失敗への応答が必要です。次の約束を、後続のスライスとして設計します。

| 約束 | まだ必要な決定 |
| --- | --- |
| 在庫が予約された | 予約が成功したかを Cart はどう知るか？ |
| 注文が受け入れられた | どの価格、数量、通貨、配送情報を固定するか？ |
| 決済が確認された | 遅れて届く応答や重複した応答も含め、どのプロバイダーの証拠が決済を確立するか？ |
| 予約の期限が切れた | どの事実が予約を解放し、期限切れは決済とどう関わるか？ |

これらはアプリケーションのポリシーです。Stock や Cart というドメイン名から自動的に導かれるものではありません。

## Stock のチェックポイントを組み立てる

決定が理解できたら、前のコマンドでディレクトリを作成し、同じ `mug-shop` プロジェクトに以下のファイルを追加または置き換えます。すでに作成した Cart のファイルと `tests/Spec.hs` は残します。このチェックポイントでは、最初のカートレッスンの非永続ストアを使います。認証や別のトランスポートポリシーを追加している場合は、Stock のサービスとクエリのステップだけを既存の `app` パイプラインに統合します。

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockInitialized.hs"
module Shop.Stock.Events.StockInitialized (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , productId :: Uuid
  , available :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockReserved.hs"
module Shop.Stock.Events.StockReserved (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Event.hs"
module Shop.Stock.Event (StockEvent (..), getEventEntityId) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved

data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
  deriving (Eq)

getEventEntityId :: StockEvent -> Uuid
getEventEntityId change = case change of
  StockInitialized fact -> fact.entityId
  StockReserved fact -> fact.entityId

deriveEvent ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Entity.hs"
module Shop.Stock.Entity (StockEntity (..), initialState, update) where

import Core
import Shop.Stock.Event (StockEvent (..), getEventEntityId)
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Uuid qualified

data StockEntity = StockEntity
  { stockId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

initialState :: StockEntity
initialState = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 0, reserved = 0}

update :: StockEvent -> StockEntity -> StockEntity
update change stock = case change of
  StockInitialized initialized ->
    StockEntity
      { stockId = initialized.entityId
      , productId = initialized.productId
      , available = initialized.available
      , reserved = 0
      }
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }

deriveEntity ''StockEntity ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Core.hs"
module Shop.Stock.Core (
  module Shop.Stock.Entity,
  module Shop.Stock.Event,
) where

import Shop.Stock.Entity
import Shop.Stock.Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/InitializeStock.hs"
module Shop.Stock.Commands.InitializeStock (
  InitializeStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Stock.Core

data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }

getEntityId :: InitializeStock -> Maybe Uuid
getEntityId _ = Nothing

decide :: InitializeStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Just _ -> Decider.reject "Stock already initialized for this product!"
  Nothing -> initialize request

initialize :: InitializeStock -> Decision StockEvent
initialize request =
  if request.available < 0
    then Decider.reject "Available stock cannot be negative"
    else do
      stockId <- Decider.generateUuid
      Decider.acceptNew
        [StockInitialized (StockInitialized.Event {entityId = stockId, productId = request.productId, available = request.available})]

type instance EntityOf InitializeStock = StockEntity

type instance TransportsOf InitializeStock = '[WebTransport]

deriveCommand ''InitializeStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/ReserveStock.hs"
module Shop.Stock.Commands.ReserveStock (
  ReserveStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Stock.Core

-- | Command to reserve stock for a cart.
-- Keep reservation internal; the integration lesson supplies its trigger.
data ReserveStock = ReserveStock
  { stockId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }

getEntityId :: ReserveStock -> Maybe Uuid
getEntityId cmd = Just cmd.stockId

decide :: ReserveStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Stock not found!"
  Just stock -> reservePositiveQuantity request stock

reservePositiveQuantity :: ReserveStock -> StockEntity -> Decision StockEvent
reservePositiveQuantity request stock =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else reserveAvailableStock request stock

reserveAvailableStock :: ReserveStock -> StockEntity -> Decision StockEvent
reserveAvailableStock request stock =
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]

type instance EntityOf ReserveStock = StockEntity

type instance TransportsOf ReserveStock = '[InternalTransport]

deriveCommand ''ReserveStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Queries/StockLevel.hs"
module Shop.Stock.Queries.StockLevel (
  StockLevel (..),
  canAccess,
  canView,
) where

import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Stock.Core (StockEntity (..))

data StockLevel = StockLevel
  { stockLevelId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

-- | Authorization: Anyone can access stock levels (public catalog data)
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess claims = AccessControl.publicAccess claims

-- | Authorization: Anyone can view any stock level
canView :: Maybe UserClaims -> StockLevel -> Maybe AccessError
canView claims stockLevel = AccessControl.publicView claims stockLevel

-- | Use TH to derive Query instances.
-- Wires canAccess -> canAccessImpl, canView -> canViewImpl
deriveQuery ''StockLevel [''StockEntity]

instance QueryOf StockEntity StockLevel where
  queryId stock = stock.stockId

  combine stock _maybeExisting =
    Update
      StockLevel
        { stockLevelId = stock.stockId
        , productId = stock.productId
        , available = stock.available
        , reserved = stock.reserved
        }
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Service.hs"
module Shop.Stock.Service (
  service,
) where

import Core
import Service qualified
import Shop.Stock.Commands.InitializeStock (InitializeStock)
import Shop.Stock.Commands.ReserveStock (ReserveStock)
import Shop.Stock.Core ()

service :: Service _ _
service =
  Service.new
    |> Service.command @InitializeStock
    |> Service.command @ReserveStock
```

Cart と設定のレッスンを完了している場合、`src/App.hs` にはここで示す Stock サービスとクエリの登録があるはずです。追加のポリシーがないアプリケーションならパイプラインだけを作成または置き換えます。それ以外は、既存のストア、トランスポート、Cart の登録を残し、最後の 2 ステップを追加します。

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
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## 在庫を作成して調べる

プロジェクトルートからチェックポイントを実行します。

```sh
neo build
neo run
```

在庫レコードを作成します。

```sh
curl -i http://localhost:8080/commands/initialize-stock \
  -H 'Content-Type: application/json' \
  --data '{"productId":"11111111-1111-1111-1111-111111111111","available":3}'
```

返された `entityId` を在庫 ID として保存します。そのビューを読みます。

```sh
curl --get http://localhost:8080/queries/stock-level \
  --data-urlencode 'q=.stockLevelId == "YOUR-STOCK-UUID"'
```

プロジェクションが追いつくと、利用可能 3、予約済み 0 になるはずです。Cart を作成し、この在庫 ID と数量 2 で `AddItem` を送信します。Cart には 1 エントリがあるはずです。**Stock は利用可能 3、予約済み 0 のままです**。両方の決定は実装しましたが、接続していないためです。

この観測が証拠になります。2 つのサービスを登録しても、一方が他方を呼ぶとは限りません。[アプリケーションのステップを接続する](/ja/connect/workflows/)で接続を追加し、利用可能 1、予約済み 2 への変化を確認します。

## 繰り返し可能な Stock の確認を保つ

下の HTTP シナリオを `tests/scenarios/stock-flow.hurl` として保存します。独自のレコードを作成し、ビューを待ち、負の初期数量の拒否を確認します。`neo test` を実行する前に `neo run` を停止します。

<details>
<summary>完全なファイル：tests/scenarios/stock-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/stock-flow.hurl"
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}

HTTP 200
[Captures]
stock_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 3
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 0

POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"22222222-2222-2222-2222-222222222222","available":-1}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Available stock cannot be negative"
```

</details>

プロジェクトルートから `neo test` を実行します。取得した Stock ID が、以前の実行から独立した確認を保ち、クエリの再試行でプロジェクションが追いつきます。このページではまだ `AddItem` を `ReserveStock` に接続していません。そのトリガーは[接続の章](/ja/connect/workflows/)で学びます。

## 演習：最後のマグカップ

エージェントは、カートのリクエストが成功したので最後のマグカップが顧客のものになったと言います。不足している証拠を特定します。

<details>
<summary>考え方と確認の例</summary>

Cart のリクエストは選択を確立するだけです。予約の決定と、記録された結果を確認します。在庫 3 から 2 を予約し、4 を 3 から予約すると拒否され、ちょうど 3 は受け入れられることを確認します。最後の 1 単位を競合するリクエストには、アプリケーションレベルの同時実行確認が必要です。繰り返しのリクエストには意図的な重複ポリシーが必要です。現在のコマンドは、十分な在庫が残っていれば再び予約できます。

</details>

次は[HTTP とフロントエンド](/ja/build/http-and-frontend/)で、これらの結果を正直なインターフェースに変えます。
