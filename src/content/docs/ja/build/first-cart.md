---
title: "最初に動くスライス"
description: 自分のプロジェクトに、1 つのリクエスト、1 つの記録された事実、役に立つ答えを与えます。
sidebar:
  order: 1
---
<!-- translation-source-sha256: ee9faef1c553e39b9740cb67730af2c3f85b251152a601d0d4ff137b366cae87 -->

最小限で役に立つアプリケーションのスライスは、人のリクエストを観測できるものにつなぎます。ここでは**自分の `mug-shop` プロジェクト**でそのスライスを構築します。「カートを作成する」を受け入れ、起きたことを覚え、空のカートのサマリーを表示します。

カートを練習用の例にします。同じ形で予約や書類レビューを始めることもできます。アクションの意味はあなたが決め、NeoHaskell がリクエスト、履歴、状態、ビューをつなぎます。

スライスは、責任を 1 つずつ組み立てます。各セクションでは、焦点を絞った部分を示す前に考え方を説明します。その後、すべての決定が明確になったところで、各アプリケーションソースファイルを実際の配置先とともにまとめて示します。アーカイブをダウンロードしたり、どの定義や import が不足しているか推測したりせず、手作業でプロジェクトを作れます。

## 自分のプロジェクトで始める

先に[はじめに](/ja/getting-started/)を完了します。そのページで `neo new mug-shop` を使って `mug-shop` を作成しました。既存のプロジェクトを開いたターミナルで、次を実行します。

```sh
cd mug-shop
```

このページのすべてのパスは `mug-shop` ディレクトリからの相対パスです。`neo.json`、ランチャー、生成されたビルド設定は保ちます。`neo` がプロジェクトのコンパイラ設定を提供するため、アプリケーションファイルに言語プラグマは必要ありません。

生成されたプロジェクトには Counter の例があります。Cart のファイルを作る前に、提供されたアプリケーションファイルを削除するか移動します。

```sh
rm -r src/Starter tests/Decider/Counter
rm tests/Property/CounterReplaySpec.hs
rm tests/scenarios/counter-flow.hurl tests/integration/smoke.hurl
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

`tests/Spec.hs` は残します。[テストのレッスン](/ja/build/testing/)で Cart のテストファイルを追加します。以下のソースファイルは、最初のスライス全体です。`src/App.hs` を置き換え、`src/Shop/Cart/` の下にファイルを作成します。`neo build` がソースファイルを見つけるため、別のモジュール一覧を管理する必要はありません。

フレームワークモジュールの `Core` と、小さなドメインファサード `Shop.Cart.Core` には異なる役割があります。フレームワークの型を使うファイルは `Core` を import します。`Shop.Cart.Core` は Cart のエンティティ型とイベント型を再エクスポートするため、Cart のコマンドとクエリはドメイン向けの 1 つの import を共有できます。

## 1. 覚えておきたい事実に名前を付ける

「何が起きたか？」への永続的な答えになるため、受け入れられた事実から始めます。事実は**カートが作成された**ことです。カートの識別子と所有者識別子が必要です。`src/Shop/Cart/Events/CartCreated.hs` を作成し、次の焦点を絞った宣言から始めます。

```haskell
data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
```

フィールドは、後で読んだときに事実の意味を与える情報です。マーカーで、NeoHaskell が通常のイベントサポートを提供するようにします。

```haskell
deriveEvent ''Event
```

宣言はイベントの意味を示し、マーカーは機械的なインスタンスとイベントの配線を提供します。Cart モデル内でイベントの場所に名前を付けた後、完全なファイルを示します。

## 2. Cart イベントの場所と経路を与える

`src/Shop/Cart/Event.hs` を作成します。ドメインイベント型には、カートを変更できる事実を列挙します。この最初のマイルストーンでは、コンストラクターは 1 つです。

```haskell
data CartEvent
  = CartCreated CartCreated.Event
```

`CartCreated.Event` は上のファイルにあるペイロードです。`CartCreated` は Cart のイベント語彙におけるコンストラクターです。ルーティングヘルパーは、事実のストリーム識別子を返します。

```haskell
getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
```

`getEventEntityId` はイベントモジュールに置きます。エンティティファイルが `deriveEntity` マーカーの前にこれを import するため、リプレイで各事実を変更対象の Cart に関連付けられます。`deriveEvent` マーカーはこれらの宣言の後ろに置きます。

## 3. 事実を現在の状態に変える

エンティティは、受け入れられたイベントから再構築される現在のビジネス状態です。`src/Shop/Cart/Entity.hs` を作成します。最初のスライスで Cart に必要なのは、識別子と所有者だけです。

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }
```

再構築は nil の識別子と空の所有者から始め、作成の事実を適用します。

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}
```

初期値の nil はリプレイの開始点です。実際の Cart が存在する証拠ではありません。受け入れられた `CartCreated` がその識別情報を確立します。`deriveEntity ''CartEntity ''CartEvent` の前に `initialState` と `update` を置きます。このビジネス上の振る舞いはあなたが提供し、`deriveEntity` がフレームワークのリプレイ、JSON、デフォルト状態、イベントルーティングのサポートにつなぎます。

## 4. 人のリクエストを受け入れる

`CreateCart` はコマンドです。誰かが行うリクエストを表します。このアプリケーションでは Cart の識別子を生成するため、入力フィールドはありません。`src/Shop/Cart/Commands/CreateCart.hs` を作成します。

決定は、すでに状態を持つストリームをまず拒否し、その後作成を委任します。

```haskell
decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context
```

ヘルパーは Cart の UUID を生成し、`CartCreated` を記録します。ログイン済みの識別情報がない場合、このローカル演習では匿名の所有者識別子を生成します。履歴上のそのラベルは、ブラウザーセッションを確立したり、将来の呼び出し元が Cart を所有することを証明したりしません。[アクセス制御](/ja/build/access-control/)で後ほどポリシーを明示します。

コマンドは、使うエンティティとトランスポートも宣言します。マーカーはフレームワーク向けの `Core` import から提供されます。

```haskell
type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

完全なコマンドファイルには UUID の生成と、2 つの決定分岐が含まれます。

## 5. 画面の問いに答える

画面に必要なのは、イベント履歴全体ではなく役に立つ答えです。最初の画面が尋ねる問いとして、`src/Shop/Cart/Queries/CartSummary.hs` に `CartSummary` を定義します。

```haskell
data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }
```

このマイルストーンではすべての Cart が空なので、クエリの最初のプロジェクションは意図的に `count` を 0 にします。

```haskell
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

これはリードモデルです。Cart を作成できるかは決めません。公開アクセスのポリシーは、このローカル練習のために意図的に選んでいます。非公開のアプリケーションデータには別のポリシーとテストが必要です。クエリのマーカーは、ビューを読むエンティティにつなぎます。

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

完全なクエリファイルでは、マーカーを `QueryOf` インスタンスより前に置きます。インスタンスが、マーカーの生成する `Query` サポートを使うためです。

## 6. 部品に到達できるようにする

サービスは Cart コマンドのレジストリです。`src/Shop/Cart/Service.hs` を作成し、`CreateCart` を登録します。

```haskell
service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

生成された `src/App.hs` を置き換え、イベントストア、Web トランスポート、Cart サービス、Cart クエリを選択するようにします。

```haskell
app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

以下の完全な `App.hs` が `eventStore` の設定を提供します。`persistent = False` を使うため、再起動するとこの演習の履歴は消えます。[設定](/ja/build/configuration/)と[永続化](/ja/operate/persistence/)で、後ほどストレージを明示的な選択にします。

## 最初のスライスの完全なファイルを作成する

以下のブロックは説明用の断片ではなく、組み立て済みのファイルです。各タイトルは、`mug-shop` プロジェクトのルートから作成または置き換えるパスです。各ブロックをそのままコピーします。

完全なイベントファイルには `deriving (Eq)` が含まれます。これは、デシダーの例が記録されたペイロード値を比較するためです。この等価性のサポートはイベントマーカーとは別です。フレームワークが生成するイベントインスタンスには、引き続き `deriveEvent` が標準ヘルパーです。

### `src/App.hs` — 生成されたアプリケーションを置き換える

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

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

### `src/Shop/Cart/Events/CartCreated.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/CartCreated.hs"
module Shop.Cart.Events.CartCreated (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated

data CartEvent
  = CartCreated CartCreated.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Entity.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Core.hs` — ドメインファサードを作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Core.hs"
module Shop.Cart.Core (
  module Shop.Cart.Entity,
  module Shop.Cart.Event,
) where

import Shop.Cart.Entity
import Shop.Cart.Event
```

### `src/Shop/Cart/Commands/CreateCart.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCart.hs"
module Shop.Cart.Commands.CreateCart (CreateCart (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Uuid qualified

data CreateCart = CreateCart

getEntityId :: CreateCart -> Maybe Uuid
getEntityId _ = Nothing

decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context

createCart :: RequestContext -> Decision CartEvent
createCart context = do
  cartId <- Decider.generateUuid
  case context.user of
    Just user ->
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = user.sub})]
    Nothing -> do
      anonymousId <- Decider.generateUuid
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = Uuid.toText anonymousId})]

type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

### `src/Shop/Cart/Queries/CartSummary.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

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
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — 作成

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

[最初のカートのアーカイブ](/examples/mug-shop-first-cart.tar.gz)は、チェックポイントを比較する便利な資料です。ただし、これらのファイルを取得するために必要ではありません。アーカイブにあるテストは、[テストのレッスン](/ja/build/testing/)で作成する証拠として導入します。

## ビルドしてリクエストする

`mug-shop` プロジェクトのルートから、次を実行します。

```sh
neo build
neo run
```

別のターミナルから Cart をリクエストします。

```sh
curl -i http://localhost:8080/commands/create-cart \
  -H 'Content-Type: application/json' \
  --data '[]'
```

HTTP 200 と、`entityId` を含む JSON オブジェクトを期待します。その UUID を保存します。フィールドのないコマンドを `[]` でエンコードしています。

ビューを読みます。

```sh
curl http://localhost:8080/queries/cart-summary
```

`cartSummaryId` が `entityId` と一致する行を見つけます。`itemCount: 0` と `isEmpty: true` になっているはずです。応答は `items`、`total`、`hasMore`、`effectiveLimit` を含むページです。

リードモデルは非同期に更新されます。行がまだ現れていなければ、短い間隔で読み直します。作成コマンドを再送すると、元の Cart の更新ではなく別の Cart が作られます。

## 繰り返し実行できる証拠を保つ

[テストのレッスン](/ja/build/testing/)で、受け入れられた `CartCreated` イベントと既存 Cart の拒否を確認するユニット仕様に加え、空のサマリーを待つ HTTP シナリオを追加します。それまでは、上のビルド、サーバー応答、クエリ応答が実行可能な最初のチェックポイントです。任意のアーカイブには、比較用の公開テストソースが入っています。

作成したのは Cart であり、受け入れられた注文ではありません。モデルには価格、決済、履行の約束はありません。エージェントに、提案した各主張の背後にある事実を指し示してもらいます。

## バリエーションを試す

Cart を 2 つ作り、両方のサマリーを特定します。その後、`{` だけを含む本文など、壊れた JSON を送ります。その拒否されたリクエストの後、何が変わらないべきでしょうか？

<details>
<summary>考え方と確認の例</summary>

成功した 2 つのリクエストは、異なる ID を返し、それぞれ別の空のサマリーを得るはずです。壊れた JSON はクライアントエラーを返し、作成が受け入れられた応答を返してはいけません。空の Cart は有効に作成されたエンティティであり、存在しない Cart とは異なります。この非永続アプリケーションを再起動すると、新しい演習が始まります。

</details>

次は、同じプロジェクトから `neo ide` を実行して[視覚的な IDE で Cart を探索](/ja/getting-started/visual-ide/)します。その後、[新しいコマンドを追加](/ja/build/commands-and-events/)します。
