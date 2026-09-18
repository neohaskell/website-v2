---
title: アクセス制御
description: 誰が操作でき、どの記録を見られ、境界をどう検証するかを決めます。
sidebar:
  order: 8
---
<!-- translation-source-sha256: e3b1320bfc67c0e36c85bdbdfdef805140d4e633600619dd900940207a5facdf -->

アプリケーションでは、人によって必要なアクセスが異なります。ある人は記録を見られても変更はできないかもしれません。自分の記録は管理できても、他人の記録は見られないかもしれません。これらは認証設定になる前に、アプリケーションのポリシーです。

NeoHaskell は識別情報と権限の仕組みを提供しますが、それを接続してポリシーを宣言するのはアプリケーションです。ここでは、自分のカートを見られる顧客と、より広い権限を持つ販売者を想定します。現在の `mug-shop` プロジェクトは、ローカルでの匿名練習を意図的に許可しています。この章では、実際の識別情報サービスを導入したときにポリシーを厳しくする方法を示します。

## 識別情報と権限を分ける

**認証**は呼び出し元が誰かを確立します。**認可**は、その呼び出し元が何を実行・閲覧できるかを決めます。

Web トランスポートは、アプリケーションが `Application.withAuth` を配線すると JWT 認証情報を検証できます。コマンドは、結果の識別情報を `RequestContext.user` で受け取ります。クライアントが提供した `ownerId` は、検証済みユーザーの識別情報と同じではありません。

認証サーバー URL を使ってアプリケーションの JWT 認証を有効にするには、`src/App.hs` にこの**アプリケーションパイプラインのステップ**を追加します。例のホスト名はプレースホルダーで、動作するプロバイダーではありません。

```haskell
Application.withAuth @() (\_ -> "https://auth.example.com")
```

後の章で `App.hs` を拡張するときも、この登録を保ちます。実際の識別情報サービスを使い、discovery、issuer、audience、トークン設定をテストします。設定の上書きには `withAuthOverrides` を使えます。デプロイ固有の識別情報設定は、アプリケーションの運用ドキュメントに置きます。

## コマンドとレコードの両方を保護する

コマンドは `deriveCommand` マーカーの前にトップレベルの `canAccess` 関数を定義できます。マーカーが実行前の権限チェックにつなぎます。明示的な関数がなければ、コマンドクラスはデフォルトで認証を要求します。

コマンドを使う権限は、変更対象の具体的なレコードにも依存することがあります。練習用プロジェクトでは、認証済みの顧客が別の顧客のカートを編集してはいけません。決定関数で、変更を受け入れる前に検証済みの subject と Cart に記録された所有者を比較します。`src/Shop/Cart/Commands/AddItem.hs` で書いた `AddItem` は、現在リクエストコンテキストを無視しています。

デプロイ上の重要な境界があります。**`Application.withAuth` がなければ、現在の Web トランスポートは信頼されたコマンドコンテキストを作り、コマンド権限ゲートを迂回します**。`canAccess` を宣言するだけでは、認証が配線されていないアプリケーションは保護されません。`decide` 内のドメインチェックは、引き続きコードの責任です。

## 変更を受け入れる前に所有者を確認する

`src/Shop/Cart/Commands/AddItem.hs` で `decide` を置き換え、その下に `addForOwner` を追加します。既存の `addToCart` 数量ヘルパーと型宣言は保ちます。

```haskell
decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"
```

これは、識別情報サービスの設定と一緒に導入する**認証済み版**です。以前の匿名契約を変更するため、有効なテスト認証情報を提供してその識別情報で Cart を作成するまで、元の匿名 HTTP テストは失敗します。変更前のチェックポイントを保ち、所有者、別ユーザー、ユーザー不在のテストを追加します。新しいルールを静かに弱めないでください。

`CreateCart` は、ログイン済みの呼び出し元ならすでに `context.user.sub` を記録します。以前の演習で匿名に作った Cart が、新しくログインしたユーザーに自動的に属することはありません。この版を確認するときは、新しい認証済み Cart を使います。ゲストからアカウントへの移行には、独自の明示的な設計が必要です。

## ビューを別に保護する

クエリには 2 つのポリシーが必要です。`canAccess` は呼び出し元がクエリ型を使えるかを決め、`canView` は特定の行が見えるかを決めます。

この**CartSummary ポリシーの置き換え**は、実際のヘルパー API を使います。`CartSummary` が `ownerId :: Text` フィールドを保持していることを前提にし、`AccessControl` が所有権ヘルパーを提供します。

```haskell
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)
```

これらを `deriveQuery` の前に置きます。`ownerOnly` は行の所有者と検証済み `sub` claim を比較します。エンドポイントは `canView` に失敗した行を除外し、認証とフィルターの後にページネーションの合計を計算します。クエリにアクセスできても一致する Cart を所有していないユーザーには、他人の情報ではなく空の結果セットが返ります。

最初の `CartSummary` は `publicAccess` と `publicView` を使います。商品カタログには合うかもしれませんが、顧客データに適用する前に意図的な選択をします。そのほかのヘルパーには `requirePermission`、`requireAnyPermission`、`requireAllPermissions`、`tenantOnly` があります。

## ゲストカートを明示的に設計する

`CreateCart` は、利用可能なら認証済み subject を記録し、それ以外では匿名の所有者識別子を生成します。その生成された識別子が、安全なブラウザーセッションになったり、後からログインしたユーザーに所有権を与えたりすることはありません。

練習用プロジェクトにゲストチェックアウトを追加するなら、ゲストが Cart へのアクセスを証明する方法と、ログイン後に所有権が変わる方法を決めます。匿名の作業が後で認証済みユーザーに属する必要がある場面では、同じ問いが起きます。その移行をモデル化し、テストします。リクエスト本文から任意の所有者識別子を受け入れて解決してはいけません。

## 認証済み版を組み立てる

識別情報サービスを選んだら、下のコマンドとクエリファイルを完全な版で置き換えます。先ほど説明した所有者チェックを組み立てています。これは匿名の練習用プロジェクトから分岐する任意の版です。テストでは認証済みの識別情報を提供する必要があります。まだ認証を設定しないなら、以前のチェックポイントを保ちます。

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"

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
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)

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

最後に、下の認証配線で `src/App.hs` を置き換え、`https://auth.example.com` を識別情報サービスの URL に置き換えます。このホスト名はプレースホルダーです。アプリケーションをすでに拡張している場合は、追加したものを残し、トランスポート登録の後に `withAuth` を挿入します。

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
  |> Application.withAuth @() (\_ -> "https://auth.example.com")
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

実際のプロバイダーを設定したら `neo build` を実行します。`neo test` の前に、決定テストをログイン済みのリクエストコンテキストへ、HTTP テストを有効な認証情報へ更新します。以前の匿名成功の期待は適用されません。所有者、別ユーザー、認証情報の不在、無効なトークンを確認します。これらの完全なファイルはアプリケーションポリシーを組み立てます。プロバイダーの設定と認証情報を使った検証は、この任意の版を採用する作業に残ります。

## 演習：別の顧客の Cart

顧客 2 人と販売者 1 人を使う練習用プロジェクトのテスト計画を作ります。それぞれが何を読み、何を変更できるべきですか？認証情報のないリクエストと、無効なトークンのリクエストを含めます。

<details>
<summary>考え方と確認の例</summary>

所有者は自分の Cart を読み、許可された変更を実行できるべきです。別の顧客はその行を見られず、変更にも成功してはいけません。販売者のアクセスは、ログインしていることだけでなく、明示的な権限ポリシーに依存します。認証情報がないと認証必須のクエリは失敗し、無効なトークンはトランスポートに拒否されます。ユニットテストだけでなく、実際の認証済み Web 設定も試します。ユニットテストでは、本番が認証の配線を忘れたことを検出できません。

</details>

次は[設定](/ja/build/configuration/)で、これらのデプロイ上の選択を明示します。

公開ソース：[アクセスヘルパー](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/AccessControl.hs)、[リクエストコンテキスト](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Auth.hs)、[コマンドのデフォルト](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Command/Core.hs)、[クエリエンドポイント](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Endpoint.hs)、[Web 認証ディスパッチ](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)。

ユーザーの外部アカウントを接続することは、アプリケーションにサインインすることとは別の関心事です。そのワークフローは[プロバイダーアカウントと同意](/ja/connect/provider-accounts/)を参照してください。
