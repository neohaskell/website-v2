---
title: AI ツールを制約する
description: アプリケーションがルールを所有したまま、モデルに構造化されたアクションを提案させます。
sidebar:
  order: 8
---
<!-- translation-source-sha256: 303adcc973af9939e5f428e90a83d37e040b68f56ba2051b875ff15b9d03b74e -->

モデルは、普通の言葉のリクエストを構造化された提案に変えられます。商品を追加する、タスクをスケジュールする、下書きを更新する、といった提案です。どのオブジェクトを変更できるか、提案された値が有効か、人がアクションを確認しなければならないかを決めるのは、引き続きアプリケーションです。

NeoHaskell のエージェントインテグレーションは、コマンドスキーマを使ってツールを記述し、返された引数をコマンドにデコードします。これにより、引き渡しに構造を与えられます。モデルが生成した引数を信頼できるようにしたり、モデルにユーザーの識別情報を与えたりするものではありません。EC の例で「青いマグカップを 2 個ほしい」を練習します。

前提：[AI リクエスト](/ja/connect/ai/)、[コマンド](/ja/build/commands-and-events/)、[権限](/ja/build/access-control/)。

## 同じ mug-shop プロジェクトを拡張する

[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)を完了します。モデルリクエストのヘルパーを `src/Shop/Integrations/CartAssistant.hs` に置き、提案コマンドを `src/Shop/Cart/Commands/` の下に定義します。ハンドラーを `src/App.hs` に追加する前に、そのコマンドを `InternalTransport` で Cart サービスに登録します。

コマンドは新しいアプリケーションの振る舞いです。既存の `AddItem` をモデルのツールとして公開し、正の数量チェックが所有権ポリシーだと仮定してはいけません。買い物客が別に認証されたアクションでカートを変更する前に確認できる、提案から始めます。

## 提案コマンドから始める

レビュー用の提案を記録するコマンドから始めます。練習用 Cart では、チェックアウト、決済、取り消せないアクションを範囲外に保ちます。サーバー自身が信頼された Cart・ユーザーコンテキストをバインドし、モデルが生成した所有権の主張を受け入れないようにします。

`Agent.commandTool @YourCommand` は、`NameOf` からワイヤー名、`Documented` から説明、`ToSchema` から JSON Schema を取得します。コマンドマーカーと確立した[コマンドの規約](/ja/build/commands-and-events/)を使い、実際のコマンドの導出経路に必要なスキーマとドキュメントのインスタンスを提供します。

次は**リクエスト式の部分**であり、完全なコマンド実装ではありません。

```haskell
Agent.agent
  customerMessage
  [proposalTool]
  modelName
  recordProposalFailure
  |> Integration.outbound
```

`proposalTool` は `CommandTool` で、通常は `Agent.commandTool` を一度使ってバインドします。リクエストの `command` 型は JSON のエンコード・デコードとコマンド名をサポートしなければなりません。エラーコールバックは同じ型を返すため、成功した提案だけでなく失敗も表す意図的な方法が型に必要です。

現在の実行インスタンスは `Integration.Agent.Internal` にあります。API の説明はプロバイダーに依存しませんが、この実装は `OPENROUTER_API_KEY` を使って OpenRouter 経由でリクエストを送信します。

## 実際に実行されるものを正確に理解する

現在の実装は次の処理をします。

1. 空のツールリストをエラーコールバック経由で拒否する。
2. ツール選択を必須にした、ストリーミングしないリクエストを送る。
3. 最初の choice にある最初の tool call を読む。
4. 返されたツール名が許可された名前の中にあることを確認する。
5. 引数を 1 つの `Request command` 型としてデコードする。
6. アプリケーションディスパッチャー向けにそのコマンドを出力する。

応答にあるすべてのツール呼び出しを実行する、複数ステップの計画ループはありません。

**複数のツール説明が、異なる Haskell のコマンド型へ自動的にディスパッチするわけではありません。**返されたすべての引数の形は、1 つの対象型であるリクエストへデコードできなければなりません。sum または envelope の設計には、明示的でテストされたデコーダーが必要です。まずは互換性のある 1 つのツール形状から始めます。

## アプリケーションに権限を保つ

インテグレーションディスパッチャーは、出力コマンドに信頼されたシステムコンテキストを使います。外部アクセスゲートを迂回しますが、元のユーザーの認証済みリクエストコンテキストではありません。コマンド内のビジネスルールは重要ですが、識別情報と権限の境界を明示的に設計しなければなりません。

ユーザーのリクエストに応答するアシスタントでは、まず信頼されたリクエスト情報に結び付けた提案を記録し、ユーザーに見せ、通常の認証済み確認コマンドを要求する設計が安全です。モデルが生成したエンティティ ID や権限の主張は、信頼できない入力として扱います。

ツール名の許可リストで、未登録の名前が受け入れられることを防ぎます。許可された名前の引数が安全だと証明するものではありません。同様に、システムプロンプトはモデルへの指針であり、認可メカニズムではありません。

## 提案の境界をテストする

新しい提案コマンドとモデルリクエスト型を確認するために `neo build` を実行します。`tests/` スイートに固定した tool-call 応答を追加し、`neo test` を実行します。特に別の Cart を名指しする応答を含めます。`neo run` と開発用認証情報でライブリクエストを 1 回行い、確認する前に提案を調べます。通常の Cart サマリーは、認証済みの後続アクションを通した場合にだけ変わるべきです。

## 誤解をリハーサルする

> **Jess:** 「買い物客はマグカップを 2 個求めました。なぜ提案に別の Cart が出ているのですか？」
>
> **エージェント:** 「モデルがその Cart 識別子を含めました。」
>
> **Jess:** 「提案を認証済みリクエストの Cart に結び付け、矛盾する識別子を拒否してください。テストを見せてください。」

空のツール、未知のツール名、壊れた引数、tool call がない場合、返された呼び出しが複数の場合、無効な数量、別の顧客の識別子、モデルに制約を無視させようとする一見無害なプロンプトを確認します。提案と、最終的に確認された結果を別々に調べます。

**演習：**あいまいな商品名で提案を作るべきか、買い物客に確認を求めるべきかを決めます。モデルに促す前に期待する結果を書きます。モデルを変更しても受け入れルールは安定しているべきです。

異なるプロバイダーの振る舞いや、より豊かな実行ループが必要なら、[カスタムインテグレーション](/ja/connect/custom-integrations/)へ進みます。

<details>
<summary>フレームワークソースの注記</summary>

- [integrations/Integration/Agent.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent.hs)
- [integrations/Integration/Agent/Types.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Types.hs)
- [integrations/Integration/Agent/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Internal.hs)
- [integrations/test/Integration/Agent/CompileSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Agent/CompileSpec.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)

</details>
