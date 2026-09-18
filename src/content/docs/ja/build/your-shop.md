---
title: "アプリケーションをレビューする"
description: 構築したプロジェクトを確認し、次に実装する意味のある約束を選びます。
sidebar:
  order: 10
---
<!-- translation-source-sha256: d1943b1dcb11690b1e384e67f7d0544df06c56ab72b7b7129b6a19c1a42dd13c -->

役に立つマイルストーンとは、アプリケーションの振る舞いを説明し、その証拠を示せる時点です。今は、Cart と Stock、明示的な決定、リードモデル、テストを 1 つのプロジェクトに持っています。別の機能を追加する前に、これらが同じ物語を語っているか確認します。

これは `neo new` から始めた `mug-shop` プロジェクトです。2 つ目のワークスペースへ移行することはありません。次のセクションも、ここで作成したファイルから続きます。

## プロジェクトの形を確認する

ドメインファイルには、次のものが含まれているはずです。

```text
src/
  App.hs
  Shop/
    Config.hs
    Cart/
      Core.hs
      Entity.hs
      Event.hs
      Item.hs
      Events/CartCreated.hs
      Events/ItemAdded.hs
      Service.hs
      Commands/CreateCart.hs
      Commands/AddItem.hs
      Queries/CartSummary.hs
    Stock/
      Core.hs
      Entity.hs
      Event.hs
      Events/StockInitialized.hs
      Events/StockReserved.hs
      Service.hs
      Commands/InitializeStock.hs
      Commands/ReserveStock.hs
      Queries/StockLevel.hs
tests/
  Spec.hs
  Decider/Cart/CreateCartSpec.hs
  Decider/Cart/AddItemSpec.hs
  Decider/Cart/ReplaySpec.hs
  Decider/Stock/ReserveStockSpec.hs
  scenarios/create-cart.hurl
  scenarios/cart-flow.hurl
  scenarios/stock-flow.hurl
```

生成されたランチャーと `neo.json` はプロジェクトの一部として残ります。`neo` がソースモジュールとテストモジュールを見つけ、生成されたビルド成果物を管理します。プロジェクトをバージョン管理に入れ、後の変更を明確に比較できるようにします。

## 証拠を実行する

開発サーバーが動いていたら停止し、次を実行します。

```sh
neo build
neo test
```

決定テストでは、受け入れられたペイロード、存在しないエンティティ、数量 0、最後に利用可能な在庫単位を確認します。リプレイの確認では、Cart の別々のエントリを保護します。HTTP の確認では独自の Cart を作り、一致するサマリーを待ちます。

次に `neo run` を実行し、[Stock レッスンのリクエスト](/ja/build/stock-and-checkout/#create-and-inspect-stock)を繰り返します。在庫を 3 単位作り、Cart を作成して 2 単位を追加します。Cart には 1 エントリが表示されるはずです。Stock は利用可能 3、予約済み 0 のままです。ドメイン間のインテグレーションは次のレッスンだからです。

このプロジェクトをルートにした別のターミナルで `neo ide` を実行します。[モデルのワークフロー](/ja/getting-started/visual-ide/)に沿って関係を調べます。グラフはコードの場所を見つける助けになり、テストはコードの振る舞いを確立します。

## 実装用語なしで結果を説明する

次のように説明できます。

> 「アプリケーションは人の選択を記録し、無効な数量を拒否します。在庫を予約できるかどうかも決定できます。これらのルールはテスト済みです。次は、受け入れられた選択を在庫の決定につなぎ、その 2 つ目のステップが失敗したとき何が起こるかを示します。」

この説明によって次の作業が具体的になります。完全なチェックアウトがすでに存在するふりをする必要はありません。

## 次のスライスを選ぶ

| マイルストーン | 求める証拠 |
| --- | --- |
| [Cart と Stock を接続する](/ja/connect/workflows/) | 受け入れられた追加、予約結果、両方のビュー、拒否された予約。 |
| 注文の受け入れ | 合意した価格、通貨、数量、配送コンテキストを持つ、明示的に受け入れられた注文の事実。 |
| 決済 | プロバイダーの識別情報、重複処理、拒否、応答を失った後の照合。 |
| 通知 | 元の注文を書き換えずに受け入れ・失敗を扱う配送作業。 |
| [AI 支援機能](/ja/connect/ai/) | 公開前のレビューと、遅い応答が新しい作業を置き換えないための保護。 |
| [アプリケーションを運用する](/ja/operate/) | 永続的な再起動、リストアの証拠、認証済みアクセス、デプロイ済みリビジョンへのスモークテスト。 |

これらには、実装済みのインテグレーションもあれば、意図的な設計演習もあります。1 つの約束を選び、受け入れと拒否を記述し、その後に実装・検証してから別の約束を追加します。

## 演習：完了を定義する

エージェントは、リクエストが 200 を返したので「チェックアウトは完了」と言います。その主張を選んだチェックアウトポリシーについて受け入れるには、どんな証拠が必要かを書きます。

<details>
<summary>考え方と確認の例</summary>

注文が受け入れられたことを意味する事実に名前を付けます。固定される価格と顧客情報を特定します。予約と決済が前提条件か後続ステップか、それぞれの拒否をどう表すか説明します。通常の成功、部分的な失敗、重複または遅延した結果をテストします。HTTP の受け付け確認が証明するのは、その特定のコマンドが受け入れられたことだけです。

</details>

同じプロジェクトで、各約束を見えるようにする習慣を保ちながら[インテグレーション](/ja/connect/)へ進みます。
