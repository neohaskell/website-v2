---
title: "クエリと役に立つビュー"
description: 読み手ごとに必要な問いを中心に、リードモデルを構築します。
sidebar:
  order: 4
---
<!-- translation-source-sha256: 919b26e8b68bacc03787967b39a93c7c60d5208e1095967bfe4cf4c90692529a -->

画面やレポートには、読み手の問いに合わせた情報が必要です。アプリケーション内部の履歴をすべて表示すると、その問いに答えにくくなります。クエリは、レビュー待ちの作業やリクエストの進捗など、役に立つビューを準備します。

NeoHaskell のリードモデルは、情報の表示と、変更が許可されるかの決定を分離します。そのためビューを自由に形作れますが、受け入れた変更が表示されるまで少し時間がかかることがあります。

このページは[カートへの追加](/ja/build/commands-and-events/)に続きます。そちらのページで同じ Cart エンティティを変更し、`items` を持つようにしました。下のクエリはその状態を読みます。[最初に動くスライス](/ja/build/first-cart/)と追加のページを 1 つの `mug-shop` プロジェクトで進めてください。直接ここへ来た場合は、先に完全なチェックポイントを使い、その後このページの完全なファイルで `src/Shop/Cart/Queries/CartSummary.hs` を作成または置き換えます。

## 画面の問いから始める

既存の `CartSummary` は、「これはどの Cart か、誰が所有するか、エントリはいくつあるか、空か？」に答えます。単位の合計や価格は報告しません。エージェントにフィールドを追加させる前に、それぞれの意味を決めます。現在 `itemCount` はエントリ数を意味するため、マグカップ 5 個を 1 回追加すると件数は 1 です。

クエリのビジネスロジックは `src/Shop/Cart/Queries/CartSummary.hs` に置きます。`mug-shop` プロジェクトのルートから、次の焦点を絞ったプロジェクションを確認してからファイルを置き換えます。

```haskell
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

`queryId` は、このエンティティがどのビュー行に寄与するかを決めます。`combine` は現在のエンティティ状態と、存在する場合は既存のビューを受け取ります。ここでは現在のエンティティに必要なものがすべてあるため、古いビューは使わず `Update` で置き換えます。

ほかの結果には、ビュー行を削除する `Delete` と、変更しない `NoOp` があります。複数のエンティティ型が 1 つのクエリに寄与することもできます。画面に結合されたビューが必要になるまでは、1 つから始めます。

## ビューを導出して登録する

このクエリでは、データレコード、`canAccess`、`canView` を定義し、正規ヘルパーを呼びます。

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

関係する `QueryOf` ビジネスインスタンスは、このマーカーの**後**に置きます。マーカーが生成する `Query` インスタンスに依存するためです。マーカーはフレームワーク向けの `Core` import から来て、標準のクエリサポートを生成します。下の完全なファイルでは、必要な import と宣言順を保っています。

アプリケーションの登録は、最初のスライスの `src/App.hs` にすでにあります。既存のアプリケーションに Cart サービスはあるがクエリ登録がない場合は、サービス登録の隣に次の行を追加します。

```haskell
  |> Application.withQuery @CartSummary
```

マーカー内部の名前は `CartSummary` です。HTTP URL は `/queries/cart-summary` です。練習用クエリでは意図的に公開アクセスを許可しています。非公開のアプリケーションデータを公開する前に、[アクセス制御ポリシー](/ja/build/access-control/)を定義しテストします。

## 現在のクエリファイル全体

必要なら `src/Shop/Cart/Queries` ディレクトリを作成し、プロジェクトルートから `src/Shop/Cart/Queries/CartSummary.hs` を次の組み立て済みファイルで置き換えます。

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

`Array qualified` はプロジェクションが実際に使う import です。ファイルを組み立てるときも残します。`canAccess` と `canView` は、アプリケーションポリシーを明示する関数です。ここでは認証なしで Cart を調べられるよう公開しています。この便利さは、非公開データの推奨ではありません。

## Cart を見つける

`mug-shop` プロジェクトのルートからアプリケーションを実行します。

```sh
neo build
neo run
```

Cart を作成し、[Cart への追加](/ja/build/commands-and-events/)のとおりに商品を追加します。作成時に返された識別子で `YOUR-CART-UUID` を置き換えます。

```sh
curl --get http://localhost:8080/queries/cart-summary \
  --data-urlencode 'q=.cartSummaryId == "YOUR-CART-UUID"' \
  --data-urlencode 'limit=10' \
  --data-urlencode 'offset=0'
```

ページオブジェクトが返ります。プロジェクションが追いつくと、`items` 配列に一致するサマリーが含まれます。`total` はアクセス可能でフィルター済みの結果件数、`hasMore` は一致する結果が残っているか、`effectiveLimit` は適用されたページ上限を示します。

デフォルトはページサイズ 100、offset 0、絶対最大サイズ 1000 です。クエリのマーカーより前に `maxResults :: Int` を定義すると、より低い上限を設定できます。ページを進めるときは、返された `effectiveLimit` を使います。

現在の NeoQL は、文字列または数値リテラルによるフィールドアクセスと等値比較に対応します。汎用 SQL 言語ではありません。join、ソート、複合条件、Boolean リテラルの比較を推測して実装しないでください。無効な構文は解析エラーになり、式は 500 文字に制限されています。

## 誤解を招く読み込み画面を避ける

コマンドを受け入れた後、ビューが追いつく間は明確な保留状態を表示します。上限付きの再試行で読み直し、役に立つ失敗状態を用意します。最初の空の応答は、コマンドが失敗した証拠ではありません。サマリーが現れないからといって追加を再送すると、二重に追加されます。

## 演習：Cart バッジ

インターフェースには「5 items」と表示されていますが、顧客が行ったのはマグカップ 5 個の追加 1 回です。バッジには 1 と 5 のどちらを表示すべきですか？意味を明言し、何を変更すべきかエージェントに特定させます。

<details>
<summary>考え方と確認の例</summary>

既存のサマリーは 1 エントリを報告します。バッジが単位を意味するなら、`itemCount` の名前を変えるのではなく、数量合計を設計します。マグカップ 5 個の追加 1 回、同じ商品の追加 2 回、空の Cart、拒否された追加を確認します。未知の Cart ID もクエリします。フィルターは一致する行を返さず、別の顧客の Cart を返してはいけません。テストでは、即座に見えると仮定せず、上限付きのプロジェクション更新を待ちます。

</details>

次は[在庫とチェックアウト](/ja/build/stock-and-checkout/)です。
