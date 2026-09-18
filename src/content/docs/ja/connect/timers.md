---
title: 定期的な作業をスケジュールする
description: タイマーの tick で作業を要求し、永続的なスケジュールと取り違えないようにします。
sidebar:
  order: 9
---
<!-- translation-source-sha256: b7d1f56484358a4c2ceb5fccedb2f55daa5519c02ebd35d2446b232de48cea87 -->

期限切れレコードの確認、サービスのポーリング、サマリーの更新など、一定間隔で行う必要がある作業があります。タイマーはその作業を要求できますが、実際に期限が来ているかを決めるのはアプリケーションのルールです。責任を分けると、再起動時の振る舞いを理解しやすくなります。

NeoHaskell は、プロセス内で動く単純なタイマーインテグレーションを提供します。アプリケーションの実行中に定期的なリクエストを送るのに便利です。見逃した実行をすべて覚える永続的なジョブスケジューラーではありません。

まず、既存のカート作成ルールでタイマーを観測します。その後、在庫予約の期限切れを設計します。タイマー自体は永続しなくても、期限は再起動後も残らなければなりません。

以下のすべてのパスは `mug-shop` プロジェクトのルートからの相対パスです。このレッスンでは Cart ファイルを 3 つ作り、サービスファイルを 1 つ置き換え、アプリケーション登録を 1 つ追加します。まず焦点を絞った宣言を示し、各変更の後に完全な結果ファイルを示します。

## タイマーに内部コマンドを与える

タイマーのコマンドはインテグレーションディスパッチャーを使います。ディスパッチャーは `InternalTransport` で宣言されたコマンドだけを登録します。既存の `CreateCart` は `WebTransport` に属します。その公開アクションを残し、同じ決定へ委任するタイマー専用の入り口を与えます。

リクエストの到着方法を変えながら、カート作成を一貫させることがビジネス上の選択です。

```haskell
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context
```

`src/Shop/Cart/Commands/CreateCartInternal.hs` を作成します。フィールドはなく新しい Cart を作るため、`getEntityId` は `Nothing` を返します。トランスポートは内部です。

```haskell
data CreateCartInternal = CreateCartInternal

getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing

type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]

deriveCommand ''CreateCartInternal
```

### 内部コマンドファイル全体

フェンスが示すパスに、モジュールヘッダーと import を含むファイル全体をコピーします。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCartInternal.hs"
module Shop.Cart.Commands.CreateCartInternal (
  CreateCartInternal (..),
  getEntityId,
  decide,
) where

import Core
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Cart.Commands.CreateCart qualified as CreateCart
import Shop.Cart.Core (CartEntity, CartEvent)


data CreateCartInternal = CreateCartInternal


getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing


decide :: CreateCartInternal -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context


type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]


deriveCommand ''CreateCartInternal
```

`CreateCart` に両方のトランスポート型を追加しないでください。フレームワークは、1 つのコマンドに内部と公開のトランスポートを混在させることを拒否します。この演習では、観測のために空の Cart を作ります。観測後にタイマー登録を削除します。

## Cart サービスの登録を置き換える

`src/Shop/Cart/Service.hs` を下のファイルで置き換えるか、最初の 2 つの登録が変わっていないなら、既存の Cart サービスに最後の `Service.command` 行を追加します。

```haskell
  |> Service.command @CreateCartInternal
```

タイマーがディスパッチする前に、コマンドを登録しなければなりません。この完全なファイルが接続用の正確なオーバーレイです。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
  |> Service.command @CreateCartInternal
```

## タイマーインテグレーションを作成する

`src/Shop/Cart/Timers.hs` を作成します。タイマーは各 tick を内部コマンドに変換します。tick の値は意図的に無視します。コマンドが作業リクエストであり、永続的なスケジュール識別子ではないためです。

```haskell
periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

### タイマーファイル全体

タイトルにあるパスへ、ファイル全体をコピーします。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Timers.hs"
module Shop.Cart.Timers (periodicCartCreator) where

import Core
import Integration qualified
import Integration.Timer qualified as Timer
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal (..))


periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

## `App.hs` にタイマーを追加する

`src/App.hs` で、ほかの Cart import と一緒に次を追加します。

```haskell
import Shop.Cart.Timers (periodicCartCreator)
```

既存のサービスとクエリの登録の後ろに、次の登録を追加します。

```haskell
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

`@()` ファクトリーはアプリケーション設定を必要としません。この完全なファイルはワークフローとアップロードのレッスンを続け、それらの登録を保ったままタイマーを追加します。どちらかの任意機能を省略した場合は、その import と登録を省略します。追加した認証設定は残してください。

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig (..))
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Cart.Timers (periodicCartCreator)
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
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

## 実行して最初の tick を観測する

編集前に動いているサーバーを停止し、`mug-shop` から次を実行します。

```sh
neo build
neo test
neo run
```

別のターミナルで `/queries/cart-summary` をクエリします。起動後に空の Cart が現れ、タイマーが動く間に増えるはずです。各 Cart は 0 エントリを報告します。振る舞いを観測したら、サーバーを停止し、`withInbound` 行と `Shop.Cart.Timers` の import を削除します。完全なチェックポイントをビルドしたい場合はコマンドとタイマーモジュールを残せます。登録されていないタイマーは実行されません。

`Timer.every` は、ワーカー起動直後に `toCommand` へ tick count **1** を渡し、そのコマンドを出力してからスリープします。後の tick では count が増えます。間隔ヘルパーは秒、分、時間をミリ秒に変換します。

tick count はワーカーとともに再起動します。永続的な識別子、保存されたシーケンス、経過した壁時計時間の証拠ではありません。作業とディスパッチにも時間がかかるため、このループはカレンダーに揃ったスケジューラーではありません。アプリケーションは報告された失敗の後、増加するバックオフでインバウンドワーカーを再起動しますが、見逃した tick の永続キューを復元するわけではありません。複数のアプリケーションインスタンスが複数のタイマーワーカーを作ることもあります。

## パターンを予約に適用する

練習用プロジェクトで、永続状態を使って期限切れ確認を要求するコマンドを設計します。保留中の予約をどう見つけ、1 回の実行でどれだけ処理し、予約自身のコマンドがまだ期限切れ可能かをどう確認するかを決めます。

タイマーはそのプロセスを開始すべきであり、「tick 20 ならこの予約が期限切れになる」とエンコードしてはいけません。実際の期限を予約または関連するワークフローに保存します。アプリケーションの時計と永続化された事実を、資格を決めるレイヤーで使います。

繰り返しの期限切れ確認を安全にします。たとえば、すでに解放された予約が在庫をもう一度戻してはいけません。そのルールはタイマーのスリープ間隔ではなく、ドメインとテストに属します。

## 演習：期限切れの途中で再起動する

予約が 10 分後に期限切れになり、6 分後にアプリケーションが再起動したとします。起動後の最初のタイマー tick で何が起きるか説明します。タイマーはすぐ確認を要求しますが、予約は元の期限を使い続けます。期限前、選んだ境界のちょうどその時点、期限後を確認します。その後、同じコマンドを繰り返し、ワーカーを再起動し、同じ予約に対して 2 つのワーカーを実行します。在庫の結果は、選んだ重複処理ポリシーと一致するはずです。

起動テストでは、最初のコマンドがすぐ発行されることを期待します。時計を制御したビジネステストでは、10 分待たずに期限切れを証明できます。

アプリケーションに永続的なスケジュールが必要なら、その機能を明示的に選ぶか構築し、[インバウンドインテグレーション抽象化](/ja/connect/custom-integrations/)を通して接続します。[デプロイ](/ja/operate/deployment/)で、ワーカー数と再起動について考えます。

<details>
<summary>フレームワークソースの注記</summary>

- [core/service/Integration/Timer.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Timer.hs)
- [testbed/src/Testbed/Cart/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
