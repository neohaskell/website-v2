---
title: アプリケーションに AI 支援を追加する
description: 生成された提案を役に立つもの、範囲の明確なもの、レビュー可能なものにします。
sidebar:
  order: 7
---
<!-- translation-source-sha256: f2d45b6e68597c4201ea1d07c613eabc1aa78f902690d3af8674a1d17ca58fae -->

エージェントにコードを書かせることと、そのコードに AI 機能を追加することは、異なる関係です。アプリケーションの機能は、メモを要約したり、文章の下書きを作ったり、書類の解釈を助けたりします。独自の入力、権限、支出上限、失敗状態、受け入れルールが必要です。

最初に役立つ機能は、レビュー用の文章を提案するものです。EC の練習用プロジェクトでは、Jess が提供された事実から商品説明の下書きを生成します。プロバイダーが利用できなくても、残りのアプリケーションを使えるまま、下書きを確認して承認できます。

## 機能をアプリケーションの内側に保つ

`mug-shop` で作業し、[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)を完了します。リクエストヘルパーを `src/Shop/Integrations/ProductDraft.hs` に置きます。下書きのリクエスト、記録、承認のコマンドとイベントは、商品情報を所有するアプリケーション領域に追加します。Cart と Stock には、この機能はまだありません。

プロバイダー結果のコマンドには `InternalTransport` を与えます。ユーザー向けの下書きリクエストと承認は、別々の公開コマンドのままにします。[コマンド](/ja/build/commands-and-events/)と[ハンドラー登録](/ja/connect/workflows/)に従い、サービス、クエリ、アウトバウンドハンドラーを `src/App.hs` に配線します。下のビルダーがプロバイダー呼び出しを提供し、入力とコールバックはあなたのワークフローが用意します。

## リクエストする前に下書きをモデル化する

下書きワークフローは、リクエストを記録し、プロバイダーを呼び出し、生成された文章または失敗を記録します。承認は別のコマンドです。例では、遅れて届いた応答が新しい下書きを上書きしないよう、商品識別子とリクエスト識別子を保持します。

プロバイダーのコールバックは、応答のデコードが成功したことを示します。事実の正確さ、公開への適合性、アプリケーションのルールへの準拠までは確立しません。

## OpenRouter リクエストを構築する

この**部分的なビルダー**は短い下書きを要求します。`modelName` は選んだプロバイダー設定から来て、`productFacts` には承認済みの入力だけが入ります。`recordDraftResponse` は応答を調べ、`recordDraftFailure` と同じコマンド型を生成しなければなりません。

```haskell
Integration.outbound OpenRouter.Request
  { messages =
      [ OpenRouter.system
          "Draft a short product description using only the supplied facts."
      , OpenRouter.user productFacts
      ]
  , model = modelName
  , config = OpenRouter.defaultConfig
      { OpenRouter.maxTokens = Just 300
      , OpenRouter.timeoutSeconds = 30
      }
  , onSuccess = recordDraftResponse
  , onError = recordDraftFailure
  }
```

アダプターは `OPENROUTER_API_KEY` から bearer token を取得します。現在利用できるモデルを独立に選んで確認します。古い例のモデル識別子は、現在も利用できるという約束ではありません。

応答には `choices` と任意の `usage` が含まれます。`choices` が空の配列の場合を扱います。choice には message と finish reason が含まれます。HTTP リクエストが成功していても、切り詰めやフィルタリングによって文章が不適切になることがあります。message の内容はプレーンテキストの場合も、複数の content part の場合もあります。

このインテグレーションはストリーミングしないリクエストを作ります。バックグラウンドの下書きワークフローには適していますが、ストリーミングチャットのインターフェース、会話の保存、検索システムをそれだけで実装するものではありません。

## 適切な場合は Azure AI を使う

Azure リクエストには、明示的に検証されたエンドポイントと秘匿された API キーがあります。ヘルパーは `Integration.AzureAI` にあります。最初に次を呼びます。

```haskell
AzureAI.azureEndpoint endpointText
```

これは `Result Text AzureEndpoint` を返します。無効なエンドポイントは設定問題として扱います。`azureEndpointAllowing` では、デプロイ用に信頼するホストサフィックスを追加できます。サフィックスは運用担当者の管理下に置きます。

検証済みの値と実際の暗黙の設定バインドがある場合の**式の断片**は、次のようになります。

```haskell
AzureAI.chatCompletion
  validatedEndpoint
  [AzureAI.system "Use only supplied product facts.", AzureAI.user productFacts]
  deploymentName
  recordDraftResponse
  recordDraftFailure
```

ヘルパーは `?config.azureAiApiKey :: Redacted Text` を読みます。明示的に認証情報を配線する場合は、`apiKey` と、`endpoint` に検証済みの値を持つ設定を使って `AzureAI.Request` を構築します。裸のデフォルト設定を完全なエンドポイント設定として使わないでください。ソースには API バージョンのデフォルトがあります。デプロイとの互換性を確認します。

## 下書きをワークフローに通す

下書きのサービスとハンドラーを `mug-shop` に追加したら `neo build` を実行します。固定応答のフィクスチャには `neo test` を使います。これらの確認はライブモデルを必要としないはずです。プロバイダーの認証情報を付けて `neo run` を起動し、下書きをリクエストし、クエリを調べます。別の承認コマンドが成功するまで、生成された文章が未承認のままであることを確認します。

## きれいな段落以上の証拠を Jess に与える

> **エージェント:** 「モデルが説明を返したので、公開します。」
>
> **Jess:** 「公開を承認するコマンドを見せてください。私が受け入れるまで、生成された文章は下書きのままにします。」

ライブモデルを試す前に、固定フィクスチャで応答処理をテストします。choice がない場合、望ましくない主張、切り詰め、プロバイダーの拒否、商品情報が変わった後に応答が届く場合を確認します。商品事実と受け入れられない出力の小さな評価セットを作ります。ライブプロバイダーの呼び出しは、接続性と作業負荷への適合性を確認します。ユニットテストは、決定的なルールを確認します。

共有される[HTTP の再試行に関する注意](/ja/connect/http-and-payments/#understand-the-current-retry-boundary)はプロバイダー呼び出しにも適用されます。タイムアウトは、課金対象の作業が起きなかった証拠ではありません。アプリケーションの支出ポリシーを設定し、プロバイダーのリクエストタイムアウトを[ディスパッチャーの予算](/ja/connect/documents/#budget-the-entire-operation)に合わせます。

**演習：**練習用プロジェクトに再生成アクションを追加します。古い処理中の応答で置き換えてよいか決め、応答が逆の順番で到着する場合をテストします。

モデルに構造化されたアクションを提案させる準備ができたら、[AI ツール](/ja/connect/ai-tools/)へ進みます。

<details>
<summary>フレームワークソースの注記</summary>

- [integrations/Integration/OpenRouter/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Request.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [integrations/Integration/OpenRouter/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Response.hs)
- [integrations/Integration/AzureAI/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/AzureAI/Request.hs)
- [integrations/test/Integration/AzureAI/RequestSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/AzureAI/RequestSpec.hs)

</details>
