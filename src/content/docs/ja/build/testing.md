---
title: "振る舞いをテストする"
description: 自分のプロジェクトの決定、再構築された状態、HTTP 振る舞いを確認するテストを書きます。
sidebar:
  order: 7
---
<!-- translation-source-sha256: 69e400893ac5fa78dc7f5610ae62af95ffec32b6f77f5a956175b82183e26e13 -->

「コードがコンパイルできる」と「このリクエストが意図したルールに従う」は異なる主張です。失敗する可能性のある場所で各約束を確認すると、自信が高まります。速い決定テストは拒否を説明し、HTTP テストは実行中のアプリケーションが約束した振る舞いを実際に公開しているかを確認します。

意図した結果を所有するのはあなたです。エージェントは確認の実装、実行、失敗の説明を助けられます。自分で認識できる例を保ちます。2 単位は受け入れ、0 は拒否し、境界の 1 単位は受け入れる、という例です。

以下のファイルはすべて、構築してきた `mug-shop` プロジェクトに属します。生成された `tests/Spec.hs` は残します。CLI がテストを見つけ、`neo test` で実行します。

以下の例では、関係する宣言と振る舞いを示し、各配置先に名前を付けます。焦点を絞ったスニペットで、テストする境界を見つけやすくします。このページ後半の完全なテストモジュールには import とヘルパーが含まれるため、同じプロジェクトに直接作成できます。[Build ファイル一式](/examples/mug-shop-build.tar.gz)は補足資料です。

## 約束に合う確認を選ぶ

| 問い | 役に立つ境界 |
| --- | --- |
| 数量 0 は拒否されるか？ | コマンドの決定。 |
| リプレイは別々の追加を保つか？ | エンティティの更新。 |
| リクエストは約束した応答とビューを返すか？ | 実行中の HTTP アプリケーション。 |
| カートへの追加は在庫を予約するか？ | インテグレーションと両方のドメイン。[接続の章](/ja/connect/workflows/)で追加します。 |
| プロバイダーは実際のリクエストを受け入れるか？ | サンドボックスまたは制御されたライブ確認。 |

偽のプロバイダー応答は、決定的なローカルテストを与えます。アカウント、認証情報、ライブリクエストが受け入れられることまでは確立できません。

## 決定を直接テストする

`tests/Decider/Cart/AddItemSpec.hs` では、完全に受け入れられた事実を 1 つのテストで確認します。本文では、固定した別々の Cart UUID と Stock UUID を使います。

```haskell
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])
```

完全なイベントファイルには、これらの完全なペイロードのアサーションに必要な等価性サポートが含まれています。これは、イベントマーカーが生成するシリアライズと表示のインスタンスとは別です。概念のレッスンでは、このテスト上の詳細を省略しています。

ヘルパーは、ID を生成できるコンテキストで `Decision` を実行します。データベースもサーバーも必要ありません。受け入れられた結果について、挿入の種類と完全なイベントペイロードを確認するため、間違った Stock ID や数量を観測できます。

2 つの固定 UUID は意図的に異なるため、Cart ID と Stock ID を入れ替えると観測できます。これらのテストは決定ルールを検証し、UUID 生成やストリーム検索は検証しません。状態を直接渡すことで、決定を分離してテストしています。エンティティが実際に存在するかは、アプリケーション実行器が確立します。

## 再構築を確認する

`tests/Decider/Cart/ReplaySpec.hs` では、アプリケーションが使う同じ更新関数に受け入れられた事実を通します。

```haskell
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

この確認では、別々の追加を 2 回適用します。エントリの選んだ意味を保護します。各エントリに保存された数量も確認できます。同じ商品をまとめる変更には、明示的な新しいポリシーとそれに対応する証拠が必要です。

## 内部コマンドをテストする

`ReserveStock` を HTTP で公開しなくても、そのルールはテストできます。`tests/Decider/Stock/ReserveStockSpec.hs` で、1 単位の在庫に 2 単位を要求します。

```haskell
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")
```

最後の 1 単位を受け入れることと、多すぎる数量を拒否することは別の確認です。これらの順次テストでは、同じ最後の 1 単位を 2 つの同時リクエストが競合したときの動作は確立できません。より強い約束をする前に、アプリケーションレベルの同時実行シナリオを追加します。

## テストのチェックポイントを組み立てる

存在しない場合は、次のディレクトリを作成します。

```sh
mkdir -p tests/Decider/Cart tests/Decider/Stock tests/scenarios
```

以下の完全なモジュールを新しいファイルとしてプロジェクトに追加できます。生成された `tests/Spec.hs` は残します。これらのモジュールを見つけます。モジュールがすでにある場合は、対応するファイルで置き換え、import とヘルパーコンテキストをアサーションと同期させます。

<!-- complete-file -->
```haskell title="tests/Decider/Cart/CreateCartSpec.hs"
module Decider.Cart.CreateCartSpec (spec) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.CreateCart (CreateCart (..), decide)
import Shop.Cart.Core (CartEvent (..), initialState)
import Task qualified
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Task.yield Uuid.nil}) decision

spec :: Spec Unit
spec = describe "CreateCart" do
  it "records the generated cart and anonymous owner" \_ -> do
    result <- runDecision (decide CreateCart Nothing Auth.emptyContext)
    result |> shouldBe (AcceptCommand StreamCreation
      [CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = Uuid.toText Uuid.nil})])

  it "rejects an existing cart" \_ -> do
    result <- runDecision (decide CreateCart (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart already exists!")
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/AddItemSpec.hs"
module Decider.Cart.AddItemSpec (spec) where

import Core
import Array qualified
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Maybe qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.AddItem (AddItem (..), decide)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

cartIdFixture :: Uuid
cartIdFixture = Uuid.fromText "11111111-1111-1111-1111-111111111111" |> Maybe.getOrDie

stockIdFixture :: Uuid
stockIdFixture = Uuid.fromText "22222222-2222-2222-2222-222222222222" |> Maybe.getOrDie

spec :: Spec Unit
spec = describe "AddItem" do
  it "records the requested stock and quantity" \_ -> do
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])

  it "rejects a missing cart" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart not found!")

  it "rejects zero" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 0}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "accepts the smallest positive quantity" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 1})])
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/ReplaySpec.hs"
module Decider.Cart.ReplaySpec (spec) where

import Array qualified
import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Core (CartEntity (..), CartEvent (..), initialState, update)
import Test
import Uuid qualified

spec :: Spec Unit
spec = describe "Cart replay" do
  it "starts empty after creation" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let cart = initialState |> update created
    cart.items |> Array.length |> shouldBe 0
    cart.ownerId |> shouldBe "owner"

  it "retains separate entries for successive additions" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

<!-- complete-file -->
```haskell title="tests/Decider/Stock/ReserveStockSpec.hs"
module Decider.Stock.ReserveStockSpec (spec) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Stock.Commands.ReserveStock (ReserveStock (..), decide)
import Shop.Stock.Core (StockEntity (..), StockEvent (..), initialState)
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

request :: Int -> ReserveStock
request quantity = ReserveStock {stockId = Uuid.nil, cartId = Uuid.nil, quantity = quantity}

spec :: Spec Unit
spec = describe "ReserveStock" do
  it "accepts the last available unit" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 1) (Just stock) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [StockReserved (StockReserved.Event {entityId = Uuid.nil, quantity = 1, cartId = Uuid.nil})])

  it "rejects more units than remain" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")

  it "rejects zero quantity" \_ -> do
    result <- runDecision (decide (request 0) (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "rejects missing stock" \_ -> do
    result <- runDecision (decide (request 1) Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Stock not found!")
```

`neo build` を実行し、その後 `neo test` を実行します。これらのモジュールが純粋な決定とリプレイの境界を確立し、上の Hurl ファイルが実行中のトランスポートとプロジェクションの境界を確立します。後で所有権や重複リクエストのルールを追加する場合は、既存の期待結果を変更するのではなく、その決定のテストを追加します。

最初のスライスの HTTP 確認は、別の小さなファイルです。作成ルートと空のサマリーだけを確認したいときは、`tests/scenarios/create-cart.hurl` を次の内容で作成または置き換えます。

<!-- complete-file -->
```hurl title="tests/scenarios/create-cart.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true
```

## 実行中のアプリケーションを演習する

上のモジュールを配置した後、`tests/scenarios/cart-flow.hurl` を次の完全なシナリオで作成または置き換えます。

<details>
<summary>完全なファイル：tests/scenarios/cart-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/cart-flow.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}

HTTP 200

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":0}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Quantity must be positive"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false
```

</details>

このテストは独自の Cart を作るため、昨日の ID に依存しません。拒否された数量 0 のリクエストによって、ビューが受け入れられた 1 エントリのままになることを確認します。再試行は読み取りに対して行います。受け入れられた追加を再試行すると、もう一度追加される可能性があります。

`neo run` のサーバーを停止してから、プロジェクトのルートで次を実行します。

```sh
neo test
```

CLI は Haskell のテストを実行し、Hurl シナリオのためにアプリケーションを起動します。決定テストが通るのに HTTP シナリオが失敗する場合、ルール単体ではなく、登録、シリアライズ、設定、インテグレーションが原因であることが多いです。ビジネスロジックを変える前に、失敗した境界を調べます。

## 間違いを説明する回帰テストを保つ

エージェントが、各リクエストを 6 と比較して 6 単位の**Cart**上限を実装したとします。4 個を追加し、さらに 4 個をリクエストします。そのポリシーでは 2 回目のリクエストが拒否されるべきです。実装を直す前に失敗する確認を実行し、修正後も残します。

テストを通すためだけに期待結果を変更しないでください。ポリシーが変わったなら、その変更を明示的に説明し、新しい合意に合わせて証拠を更新します。

## 演習：応答が失われた

クライアントがマグカップ 2 個をリクエストした後でタイムアウトしました。エージェントはコマンドを自動再送することを提案しています。どんなテストでリスクを明らかにできますか？

<details>
<summary>考え方と確認の例</summary>

サーバーが最初のリクエストを受け入れたが、応答は失われた状態を作ります。同じリクエストをもう一度送信し、履歴と状態を調べます。現在のコマンドは、2 回目の追加を受け入れられます。再試行と、意図的に別のリクエストを区別する識別子や別のポリシーを決めます。最初の送信、再試行、意図的に異なるリクエストをテストします。ボタンを無効にすることは役に立つ UI の振る舞いですが、サーバー側の重複処理を確立するものではありません。

</details>

次は[アクセス制御](/ja/build/access-control/)で、同じ証拠に基づく方法を権限に適用します。
