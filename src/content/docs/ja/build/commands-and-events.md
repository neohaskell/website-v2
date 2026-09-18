---
title: "コマンドとイベント"
description: リクエスト、受け入れられた事実、状態を分けたままビジネスアクションを追加します。
sidebar:
  order: 2
---
<!-- translation-source-sha256: 104b60cec22bebd56f918af33bd935d5443f2466be9360c4352e624d560d94df -->

アプリケーションは、誰かが要求したことと、アプリケーションが受け入れたことを区別しなければなりません。その区別によって、ルールを表現し、拒否を説明し、エージェントの実装を問い直す場所ができます。

**コマンド**は意図に名前を付けます。**イベント**は受け入れられた事実に名前を付けます。`mug-shop` プロジェクトでは、`AddItem` が選択と数量をリクエストし、`ItemAdded` が Cart に受け入れられた追加を記録します。[イベントモデル](/ja/start/event-modeling/)がこれらの名前に共有された意味を与えます。

このページは、[最初に動くスライス](/ja/build/first-cart/)で作った Cart を続けます。最初のページでは、そのスライスを実行するために必要なソースファイルをすべて作りました。ここでは、同じプロジェクトの特定のファイルを作成または置き換えて、1 つのアクションを追加します。まず焦点を絞った断片で決定を説明し、後の組み立て済みファイルに実際のモジュールヘッダーと import を含めます。

## ファイルより先にルールを選ぶ

`mug-shop` プロジェクトのルートから作業し、編集中は `neo run` を停止します。最初のスライスで `src/Shop/Cart/Commands`、`src/Shop/Cart/Events`、`src/Shop/Cart/Queries` のディレクトリがすでにあります。直接このページに来た場合は、次で作成します。

```sh
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

既存の Cart と正の数量を必須にします。受け入れられた追加は、同じ在庫が再び選ばれても 1 エントリになります。利用可能性と所有権は、[在庫](/ja/build/stock-and-checkout/)と[アクセス制御](/ja/build/access-control/)で扱う別のポリシーです。このアクションは選択を記録するだけで、在庫が予約されたとは主張しません。

## 1. 新しい事実に専用の場所を与える

`src/Shop/Cart/Events/ItemAdded.hs` を作成します。ペイロードには、受け入れられた追加を説明するために必要な識別子と数量を保持します。

```haskell
data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
```

`entityId` で事実を Cart ストリームに保ちます。`stockId` は選択された在庫レコードを識別し、`quantity` はコマンドのルールを通過した入力を記録します。標準のイベントサポートを正規ヘルパーで導出します。

```haskell
deriveEvent ''Event
```

新しいファイルなので、完全な内容は下の組み立て済みチェックポイントに示します。

## 2. Cart のイベント語彙を拡張する

最初のスライスの `src/Shop/Cart/Event.hs` では、すでに `CartCreated` を持つ `CartEvent` を定義しています。イベント宣言を次のリストに置き換えます。

```haskell
data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
```

同じファイルの既存の `getEventEntityId` 関数を編集し、新しいケースを加えます。

```haskell
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId
```

これらの宣言の後ろに `deriveEvent ''CartEvent` を保ちます。`ItemAdded.Event` はペイロードであり、`ItemAdded` は受け入れられた事実のドメイン上のリストにおけるコンストラクターです。マーカーは通常のイベントサポートを提供し、名前とフィールドはビジネスモデルとして残ります。

## 3. 選択を Cart の状態に保持する

各 Cart エントリに保存する値のために `src/Shop/Cart/Item.hs` を作成します。

```haskell
data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
```

完全な値型には、必要な JSON インスタンスも含めます。次に `items` 配列を追加した版で `src/Shop/Cart/Entity.hs` を置き換えます。新しい更新分岐は 1 つのエントリを追加します。

```haskell
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

更新関数は受け入れられた事実を適用します。リクエストを検証したり、サプライヤーに連絡したりはしません。下のコマンドは正の数量だけを許可します。ほかの `ItemAdded` の生成元もこの不変条件を保つ必要があります。リプレイはイベントを受け入れられた事実として扱うためです。

既存の `CartCreated` 分岐でも `items` を `Array.empty` に初期化しなければなりません。ファイルを置き換えるときも、この初期化を残します。

## 4. 決定を実装する

`src/Shop/Cart/Commands/AddItem.hs` を作成します。リクエストによって、コマンド実行器はどの Cart ストリームを読み込むか分かります。

```haskell
getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId
```

決定は、Cart がないことを拒否し、次に数量を確認します。イベントには受け入れた入力が残ることに注目してください。

```haskell
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]
```

コマンドの `cartId` はイベントの `entityId` になり、`stockId` は商品名ではなく選択された在庫識別子です。トランスポート宣言でリクエストを Web トランスポートに公開します。コマンドのマーカーは、上にある決定、エンティティ、トランスポートの宣言から通常の配線を生成します。

```haskell
type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

## 5. アクションを登録し、答えを更新する

`src/Shop/Cart/Service.hs` を、両方のコマンドを含むレジストリに置き換えます。新しい行は既存の `CreateCart` 登録の隣に置きます。

```haskell
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

`src/Shop/Cart/Queries/CartSummary.hs` を置き換え、現在のエントリ数を数えるようにプロジェクションを変更します。

```haskell
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

最初のスライスの `src/Shop/Cart/Core.hs` と `src/App.hs` は残します。アプリケーションはすでに Cart のサービスとクエリを登録しています。サービスとプロジェクションを変更することで、新しいコマンドに到達でき、結果が表示されます。[クエリのレッスン](/ja/build/queries/)で、このリードモデルと非同期更新を詳しく説明します。

## Cart 追加の完全なファイルを作成する

以下は、このチェックポイントの組み立て済みファイルです。各タイトルは `mug-shop` プロジェクトのルートから見た正確なパスです。新しいファイルを作成し、指定されたファイルを置き換えます。

### `src/Shop/Cart/Events/ItemAdded.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/ItemAdded.hs"
module Shop.Cart.Events.ItemAdded (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — 置き換え

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Item.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Item.hs"
module Shop.Cart.Item (CartItem (..)) where

import Core
import Json qualified

data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
  deriving (Generic)

instance Json.FromJSON CartItem
instance Json.ToJSON CartItem
```

### `src/Shop/Cart/Entity.hs` — 置き換え

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified
import Array qualified
import Shop.Cart.Item (CartItem (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}

update :: CartEvent -> CartEntity -> CartEntity
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Commands/AddItem.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart :: AddItem -> CartEntity -> Decision CartEvent
addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]

type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

### `src/Shop/Cart/Queries/CartSummary.hs` — 置き換え

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

import Array qualified
import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Cart.Core (CartEntity (..))

data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }

canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.publicAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.publicView

deriveQuery ''CartSummary [''CartEntity]

instance QueryOf CartEntity CartSummary where
  queryId cart = cart.cartId
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — 置き換え

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

最初のスライスにある `src/App.hs`、`src/Shop/Cart/Core.hs`、`CreateCart.hs`、`Events/CartCreated.hs` はそのままです。[カート追加のアーカイブ](/examples/mug-shop-cart.tar.gz)は比較に便利なチェックポイントですが、このページだけで実装済みの追加に必要なファイルがそろいます。

## 新しい振る舞いを確認する

`mug-shop` プロジェクトのルートから、次を実行します。

```sh
neo build
neo run
```

[最初に動くスライス](/ja/build/first-cart/)のリクエストで新しい Cart を作成し、下の `YOUR-CART-UUID` を置き換えます。固定の stock UUID は、このレッスンで Stock の実際のレコードを作るまでの説明用の選択です。

```sh
curl -i http://localhost:8080/commands/add-item \
  -H 'Content-Type: application/json' \
  --data '{"cartId":"YOUR-CART-UUID","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}'
```

受け入れられ、その後 `isEmpty: false` の 1 エントリのサマリーになることを期待します。1 エントリには 2 単位が含まれます。数量 0 を送ると、`reason: "Quantity must be positive"` を含む HTTP 400 を期待します。受け入れられた件数は 1 のままです。

トランスポート宣言、サービス登録、アプリケーション登録がそろうことで `/commands/add-item` が公開されます。ファイルに型があるだけでは、到達可能な機能にはなりません。リードモデルの反映には少し時間がかかることがあります。追加を 2 回送らず、もう一度クエリします。

## 演習：Cart ごとの上限

**Cart ごとに**マグカップ 6 個という上限を選びます。エージェントは 6 個を超えるリクエストを拒否し、作業完了と言いました。どのケースが抜けていますか？

<details>
<summary>考え方と証拠</summary>

4 個の追加を 2 回行うと、その確認を通過して合計 8 個になります。上限が 1 商品にかかるのか、すべての商品にかかるのかを明記し、既存の数量とリクエストを合わせて確認します。通常の追加、ちょうど 6 個、6 個超、6 個に達した後の追加を確認します。拒否された操作は、成功した `ItemAdded` を生成してはいけません。これは設計する拡張であり、これらのファイルにすでにあるルールではありません。

</details>

次は、[エンティティと状態](/ja/build/entities-and-state/)で、受け入れられた事実が次の決定にどう影響するかを説明します。
