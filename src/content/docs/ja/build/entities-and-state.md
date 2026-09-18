---
title: エンティティと状態
description: 記録された事実が、次のビジネス上の決定に使われる状態になる方法を理解します。
sidebar:
  order: 3
---
<!-- translation-source-sha256: 6bca4999700dc492c501c8515d57fcb22d50687ded825f4c40f360072f53a1d6 -->

新しいリクエストを受け入れる前に、アプリケーションは関係する現在の状態を知る必要があります。その状態がどう生まれたかを知ることは、過去の決定を説明する助けにもなります。NeoHaskell はこの 2 つをつなぎます。エンティティの現在の状態は、イベントを順番に適用して作られます。

**エンティティ**は、ルールで守ろうとしているビジネス上の対象です。予約、書類、口座などを表します。練習用プロジェクトでは、UUID で識別される 1 つの Cart です。その状態は次のコマンドを決める助けになり、イベント履歴は受け入れた変更を記録します。

このページは、[最初に動くスライス](/ja/build/first-cart/)と[カートへの追加](/ja/build/commands-and-events/)が同じ `mug-shop` プロジェクトにあることを前提にします。直接ここへ来た場合は、Getting Started で作ったプロジェクトを開き、まず 2 つのページにある完全なファイルのチェックポイントを使います。このページの完全なエンティティファイルは、追加のチェックポイントにある `CartItem` と `ItemAdded` を参照します。

## 時間の中で 1 つの Cart を追う

1 つの Cart のイベント履歴が次のようになっているとします。

| 記録されたイベント | 結果の状態 |
| --- | --- |
| `CartCreated` | Cart に識別子と所有者識別子があり、エントリはない。 |
| `ItemAdded`、数量 2 | 1 つのエントリに、選択した在庫識別子と数量 2 が入る。 |
| `ItemAdded`、数量 1 | 同じ在庫を指していても、2 つ目のエントリが追加される。 |

エントリと数量合計の区別は、モデル上の選択です。現在の例では、繰り返しの追加をまとめません。商品を削除したり、価格を記録したり、Cart をチェックアウト済みにしたりもしません。これらは独立したビジネス上の決定であり、独自の事実とルールを持つ価値があります。

## 状態の振る舞いを置く場所を決める

`mug-shop` プロジェクトのルートから作業します。`src/Shop/Cart/Event.hs` は Cart のイベント語彙と `getEventEntityId` を所有します。`src/Shop/Cart/Item.hs` は各エントリに保存する小さな値を所有します。`src/Shop/Cart/Entity.hs` は状態レコード、開始値、リプレイを所有します。`src/Shop/Cart/Core.hs` のドメインファサードは、コマンドとクエリのためにエンティティ型とイベント型を再エクスポートします。

追加のページでは、`src/Shop/Cart/Entity.hs` を置き換えるよう案内しました。このページでは、なぜそのファイルにこの順番と境界があるのかを説明し、現在の完全なファイルを示します。今変更を適用するなら、以下の組み立て済みブロックでそのパスのファイルを置き換えます。`initialState`、`update`、`getEventEntityId` を、それらに依存するマーカーの後ろへ移動しないでください。

## 状態と配線を読む

Cart の状態レコードには、後の決定が必要とする事実が入ります。

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }
```

再構築は、空の配列と nil 識別子から始まります。

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}
```

`CartCreated` のケースが識別情報と所有者を確立します。`ItemAdded` のケースは、すでにコマンドが受け入れたエントリを追加します。

```haskell
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

更新関数は受け入れられた事実を適用します。検証は事実を記録する前に行い、外部作業はその事実に反応するインテグレーションに置きます。Cart の更新が倉庫を呼び出したり、今日のカタログを調べたり、リクエストを受け入れるべきだったかを再検討したりすることはありません。

`initialState` と `update` の後で、フレームワーク向けの `Core` import がエクスポートするヘルパーを使って、エンティティをイベント型につなぎます。

```haskell
deriveEntity ''CartEntity ''CartEvent
```

`Event.hs` の `getEventEntityId` は、このマーカーより前に import しなければなりません。これらの補助要素は、エージェントとレビューする振る舞いです。マーカーが `CartEntity` と `CartEvent` の関係、JSON 変換、デフォルトの開始値、フレームワークのリプレイとイベントルーティングのインスタンスを提供します。エンティティのフィールドに `Show` を要求するものではありません。

## リプレイはビジネス上の境界である

`update` から検証を外すと、リプレイが安定します。昨日の Cart を再構築するときに今日の商品価格を参照したら、同じ履歴から違う商業上の結果が生まれる可能性があります。価格を注文の合意の一部にする必要があるなら、適切な時点で合意した金額と通貨を記録するイベントを設計します。

価格を記録することは、**練習用プロジェクトに対する設計上の拡張**です。この Cart にすでにあるフィールドではありません。一般的な教訓は、過去の決定に意味を与える情報を保つことです。[言語の基本](/ja/build/language-essentials/#amounts-and-money)で、現在の Decimal 型とその限界を確認してください。

スナップショットを使うと、エンティティ再構築に必要な作業を減らせます。これは性能上の補助です。教え、検証する振る舞いは、記録された事実を順番に適用することのままです。永続化と復旧は、[実行と進化](/ja/operate/)で別に扱います。

## 現在のエンティティファイル全体

以下は、`mug-shop` プロジェクトのルートから見た `src/Shop/Cart/Entity.hs` の置き換え後のファイルです。import している `CartEvent`、`CartItem`、`ItemAdded` の定義は、[コマンドとイベント](/ja/build/commands-and-events/)で完全に示しています。

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

## 演習：再構築を説明する

エージェントに、Cart が作成され、マグカップ 2 個が追加され、その後さらに 3 個が追加された履歴を与えます。エントリ数と数量合計の両方を予測させます。その後、`initialState` からの再構築を実演させます。

<details>
<summary>考え方と確認の例</summary>

現在のモデルでは、2 エントリと 5 単位になります。空の履歴では初期状態になり、作成だけなら実際に空の Cart になります。数量 0 の拒否されたコマンドは `ItemAdded` の事実に寄与してはいけません。同じ初期状態から同じ受け入れ済み履歴をリプレイすれば、同じ状態になるはずです。これを履歴を 2 回追加することと混同しないでください。重複を扱う設計がなければ、受け入れ済みの追加を重ねると結果が変わります。

</details>

次は、[クエリ](/ja/build/queries/)でこの状態を画面に役立つ情報へ変えます。

プロジェクトで `neo build`、`neo test`、`neo ide` を使って作業を続けます。[テストのレッスン](/ja/build/testing/)で、これらの Cart モジュールのリプレイ確認を追加します。
