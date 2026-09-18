---
title: 書類のテキストを抽出し、音声を書き起こす
description: 抽出したテキストを事実とみなさず、添付ファイルをレビュー可能な情報に変えます。
sidebar:
  order: 6
---
<!-- translation-source-sha256: b8c5cb4e9e1fac8c5d9b28ae670333b4fd76a8683059f6fc2b6461d5210b60fa -->

PDF や音声記録には、アプリケーションで使いたい情報が含まれています。抽出によって検索可能なテキストやレビュー可能な下書きに変えられますが、元の添付ファイルは証拠として残ります。結果が十分正確かを決めることは、別のステップです。

NeoHaskell には、ローカル PDF テキスト抽出、AI 支援の書類抽出、音声文字起こしが含まれます。ローカル抽出ではサーバー上で処理を続けられます。AI の経路ではファイル内容を外部プロバイダーへ送るため、コスト、遅延、精度を考慮する必要があります。

前提：[ファイルアップロード](/ja/connect/files/)、[インテグレーションのライフサイクル](/ja/connect/)、結果を記録するための結果コマンド。練習では、マグカップを説明するサンプル PDF を使って、カタログの下書き情報を抽出します。

## アップロードしたファイルを使って続ける

[ファイル](/ja/connect/files/)の `mug-shop` アップロード設定を使い、[インテグレーションのセットアップ](/ja/connect/#prepare-your-project)を完了します。ほかのアプリケーションインテグレーションの隣に、`src/Shop/Integrations/ExtractArtworkText.hs` のようなヘルパーを置きます。添付コマンドがすでに受け入れた `FileRef` を受け取ります。

処理結果のコマンドを `InternalTransport` で宣言し、`src/App.hs` でアウトバウンドハンドラーを配線する前に、それを所有するサービスへ追加します。結果には処理試行の識別子が必要です。遅い応答が新しい試行を静かに置き換えないようにするためです。下のリクエストは、そのワークフローの抽出部分です。

## デジタル PDF から始める

この**部分的なビルダー**は最初の 2 ページをリクエストします。`attachment`、`recordExtraction`、`recordFailure` はアプリケーションが提供する値です。2 つのコールバックは、登録済みの 1 つのコマンド型を生成します。

```haskell
Integration.outbound PdfExtract.Request
  { fileRef = attachment
  , config = PdfExtract.defaultConfig
      { PdfExtract.layout = PdfExtract.PreserveLayout
      , PdfExtract.pageRange = Just (1, 2)
      }
  , onSuccess = recordExtraction
  , onError = recordFailure
  }
```

[ワークフロー](/ja/connect/workflows/)のとおり、外側のハンドラーを登録します。現在の実行インスタンスは `Integration.Pdf.ExtractText.Internal` にあります。完全なヘルパーでも、その依存関係を残します。

アプリケーションの実行環境に `pdftotext` と `pdfinfo` をインストールします。インテグレーションはファイルのバイト列を取得し、一時 PDF を書き、これらのツールを実行し、ページ数と任意のメタデータとともにテキストを返します。`PreserveLayout` は位置を保ち、`RawText` はそのレイアウト設定を外し、`Table` は固定幅の抽出オプションを使います。結果はテキストであり、商品や書類エントリのような解析済みレコードではありません。

メタデータの抽出に失敗してもテキスト抽出に成功した場合、現在の実装はページ数 `0` とメタデータ `Nothing` を返すことがあります。これはメタデータが利用できないことを意味し、必ずしも 0 ページの書類を意味しません。

スキャンされたページには選択可能なテキストがないことがあります。ローカル PDF 抽出は OCR ではありません。抽出結果が空の場合を確認してから、アプリケーションの有用な結果として扱います。

## 解釈が必要なら AI を使う

`Integration.Ocr.Ai.Request` は `fileRef`、`mimeType`、`model`、`config`、`onSuccess`、`onError` を受け取ります。実行インスタンスは `Integration.Ocr.Ai.Internal` にあります。

設定には `FullText`、`Summary`、`Structured` の抽出モードがあります。`Structured` はプロンプトを変えますが、返された `Text` を検証済みのアプリケーションデータには変えません。結果を解析し、人の入力に適用するのと同じルールを適用します。この例では商品ルールです。

ファイル型に現在対応しているモデルを選び、`OPENROUTER_API_KEY` を提供します。アダプターはファイル全体を添付ファイルとして送信します。`maxPages` はプロンプト内の指示であり、ペイロードを切り詰める仕組みや厳格な支出上限ではありません。現在の実装では `pageCount` と `confidence` はどちらも `Nothing` です。

## 本当の必要を解決するときだけ音声を追加する

録音したメモでは、`Integration.Audio.Transcribe.Request` が同じファイル参照パターンを使います。実行インスタンスは `Integration.Audio.Transcribe.Internal` にあります。設定には言語ヒントと `maxDurationSeconds` が含まれます。後者はモデルに文字起こしを制限するよう求めますが、ファイル全体はアップロードされます。

現在の結果は文字起こしテキストを提供し、`duration`、`confidence`、`language` はすべて `Nothing` です。この実装にチャンク分割した文字起こしやストリーミングはありません。ワークフローを作る前に、選んだプロバイダー・モデルが実際の添付ファイルのエンコードとメディア型を受け入れることを確認します。

## 操作全体の予算を取る

インテグレーションディスパッチャーのデフォルトタイムアウトは 30 秒です。OCR のデフォルトリクエストタイムアウトは 120 秒、音声は 180 秒です。リクエストタイムアウトを長くするだけでは、外側のイベント処理タイムアウトは延びません。

この**アプリケーション配線の断片**はイベント作業全体に 4 分を与えます。実測した振る舞いと同時実行の要件に合わせて調整します。

```haskell
    |> Application.withDispatcherConfig @()
        (\_ -> Dispatcher.defaultConfig
          { Dispatcher.eventProcessingTimeoutMs = Just 240000 })
```

ファイルアップロードが無効、ファイルがない、PDF 実行ファイルがないといった準備失敗は、結果コールバックの前にインテグレーションエラーを発生させます。結果コマンドだけでなくランタイムの失敗も監視します。そうしないと、書類が永遠に「処理中」のまま残る可能性があります。

## 実行中のプロジェクトで抽出を確認する

結果コマンドとハンドラーを追加したら、`mug-shop` から `neo build` と `neo test` を実行します。必要な PDF 実行ファイルがある環境で `neo run` を起動します。小さな PDF をアップロードし、添付コマンドを通してその参照を送り、処理状態と抽出テキストの両方を調べます。役に立つテキストだけでなく、空の出力と利用できないメタデータのフィクスチャも `tests/` に残します。

## 演習：間違った商品寸法

練習用プロジェクトを、抽出した寸法を公開前にレビューするワークフローで拡張します。2 つの役割を演じます。サンプル書類をアップロードし、承認前に提案された値を調べます。

<details>
<summary>確認の例</summary>

きれいなデジタル PDF、スキャン、空の抽出、ファイル不在、利用できない実行ファイル、タイムアウト、壊れた構造化テキスト、もっともらしいが間違った寸法を確認します。元の添付ファイルと処理試行の識別子を保ちます。下書きの承認は独自のルールを持つ別コマンドにします。これらのアダプターからモデルの信頼度は得られません。

</details>

次は[アプリケーション機能に AI を使う](/ja/connect/ai/)へ進み、生成された提案と受け入れられたアプリケーションデータを同じように分けます。

<details>
<summary>フレームワークソースの注記</summary>

- [integrations/Integration/Pdf/ExtractText.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText.hs)
- [integrations/Integration/Pdf/ExtractText/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText/Internal.hs)
- [integrations/Integration/Ocr/Ai.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai.hs)
- [integrations/Integration/Ocr/Ai/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai/Internal.hs)
- [integrations/Integration/Audio/Transcribe.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe.hs)
- [integrations/Integration/Audio/Transcribe/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe/Internal.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)
- [testbed/src/Testbed/Examples/PdfExtraction.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Examples/PdfExtraction.hs)

</details>
