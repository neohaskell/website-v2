---
title: "HTTP とフロントエンド"
description: インターフェースをコマンドとクエリにつなぎ、各リクエストの状態を伝えます。
sidebar:
  order: 6
---
<!-- translation-source-sha256: 79f3faf0995deda2ea89dd830481ff910c8c7013965e158eaef5f051d10cffc7 -->

ユーザーインターフェースは選択をリクエストに変え、結果を表示します。何が起き、次に何ができるか分かるように、受け入れ、進行中、失敗を区別する必要があります。

NeoHaskell の Web トランスポートは、コマンドとクエリを HTTP 経由で公開します。チームに合ったフロントエンドフレームワークでインターフェースを構築できます。現在のトランスポートはアプリケーション API とそのドキュメントを提供しますが、汎用的な静的フロントエンドホスティング API は提供しません。

実例では、EC の練習用プロジェクト向けの店舗を作ります。カートへの追加、保留中の予約、確認済みの注文によって、インターフェースが伝えるべき異なる状態を具体的に示します。

例は同じ `mug-shop` プロジェクトで続きます。このレッスンで実装するのは API 部分です。ブラウザーのフロントエンドは、Neo プロジェクトと並べて追加する任意のクライアントです。

## 実際の契約から始める

`neo run` で[アプリケーションを起動](/ja/build/first-cart/)し、`http://localhost:8080/docs` を開いて生成された API ドキュメントを確認します。同じスキーマを `/openapi.json` と `/openapi.yaml` でも利用できます。

| 目的 | ルートの例 | 成功の意味 |
| --- | --- | --- |
| ビジネスリクエストを送信する | `POST /commands/add-item` | Cart コマンドが受け入れられた。 |
| ビューを読む | `GET /queries/cart-summary` | 現在利用でき、権限のあるビュー行のページが返された。 |
| インターフェースを調べる | `GET /openapi.json` | アプリケーションが生成した API スキーマが返された。 |

登録がインターフェースを駆動します。コマンドがトランスポートを宣言し、サービスがコマンドを登録し、アプリケーションがサービスとクエリを登録します。HTTP ルートには kebab-case の名前を使います。「checkout」のような画面ラベルに一致するコマンドがない場合、そのラベルからルートを推測してはいけません。

## HTTP アプリケーションの配線を組み立てる

プロジェクトがまだローカルの非永続ストアを使っている場合は、`src/App.hs` を次の完全な配線で作成または置き換えます。Web トランスポートを通して Cart と Stock のコマンドおよびクエリビューを公開します。`App.hs` に設定、認証、別のトランスポートポリシーがすでにある場合は、そのステップを残し、不足しているサービスとクエリの登録だけを追加します。

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
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

プロジェクトルートから `neo build`、続いて `neo run` を実行します。ブラウザーをつなぐ前に `/docs` と `/openapi.json` を開き、登録したコマンドとクエリが生成された契約にあることを確認します。

## 1 つのアクションをつなぐ

この**ブラウザー JavaScript の部分関数**は、アプリケーションの `AddItem` リクエストを送信します。[在庫とチェックアウト](/ja/build/stock-and-checkout/)にある実際の ID で呼び出します。練習用フロントエンドが `/commands` に同一オリジンのプロキシを使うことを前提にしています。クロスオリジン開発には、サーバーの明示的な CORS 設定が必要です。

```javascript
async function addMugs(cartId, stockId, quantity) {
  const response = await fetch('/commands/add-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, stockId, quantity }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.reason ?? result.error ?? 'Could not add mugs');
  }
  return result.entityId;
}
```

これは適応したブラウザー関数の断片であり、完全なフロントエンドファイルではありません。フロントエンドが使うモジュールに置きます（まだブラウザーコードがない場合は、たとえば `frontend/cart.js` を作成します）。AddItem フォームのイベントハンドラーから呼び出します。Neo プロジェクトは、そのフロントエンドディレクトリを生成したり、プロキシを設定したりしません。認証済みアプリケーションでは、認証設定に従って認証情報も提供する必要があります。このローカル練習用関数は、完全な顧客セッション実装ではありません。

UI はリクエスト中の偶発的な二重送信を無効にし、役に立つ拒否を表示し、受け入れ後に関係するクエリを更新します。ネットワーク応答が失われた場合は特に注意が必要です。サーバーはすでにリクエストを受け入れているかもしれません。書き込みを自動再送する前に、重複をどう検出するかを決めます。

## 結果を分けて扱う

Web トランスポートは、受け入れられたコマンドの応答を HTTP 200 に対応付けます。ビジネス上の拒否は現在、`reason` とともに 400 に対応付けられます。コマンドの失敗も `error` とともに 400 です。すべての 400 を無効な JSON と扱わず、ステータスと同時に応答本文も調べます。

認証と権限の失敗は 401 または 403 を使います。未登録のルートは 404 です。受け入れられた書き込みにリードモデルが一時的に遅れることがあるため、「受け入れ済み、更新中」は役に立つインターフェース状態です。読み取りの上限付き再試行は、書き込みをリプレイすることとは異なります。

## ブラウザーアクセスをアプリケーションの配線に置く

API には、許可するオリジン、メソッド、ヘッダー、任意のプリフライトキャッシュ期間を持つ `CorsConfig` があります。この**アプリケーション配線の部分式**は、ローカルフロントエンドのポリシーを示します。既存の `Application` と `WebTransport` の import が必要です。

```haskell
Application.withCors @() (\_ -> WebTransport.CorsConfig
  { allowedOrigins = ["http://localhost:4321"]
  , allowedMethods = ["GET", "POST", "OPTIONS"]
  , allowedHeaders = ["Content-Type", "Authorization"]
  , maxAge = Just 600
  })
```

アプリケーションのパイプラインに適用し、実際のフロントエンドのオリジンを使います。CORS はブラウザーアクセスを制御しますが、ビジネス上の権限を与えるものではありません。[アクセス制御](/ja/build/access-control/)で非公開情報を保護します。

`tests/scenarios/create-cart.hurl` を次の完全な API 確認で作成または置き換えます。フロントエンドを追加する前に、ブラウザーの契約に繰り返し可能なサーバー側の境界を与えます。`neo test` を実行する前に `neo run` を停止します。

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

プロジェクトルートから `neo test` を実行します。Hurl の確認で API 応答と最終的なクエリ更新を証明できますが、ブラウザーのレイアウト、プロキシ、認証プロバイダーが設定されていることまでは証明できません。

## 演習：遅れて届くサマリー

サーバーは追加を受け入れましたが、次のサマリーはまだ空に見えます。別の追加を送信せずに、画面が行う次の 3 つのアクションを設計します。

<details>
<summary>考え方と確認の例</summary>

保留中の更新として受け入れを表示し、上限付きの時間内で読み取りを再試行し、古いままなら明確な更新・復旧状態を提供します。通常の更新、拒否された数量 0、遅延したプロジェクションを確認します。送信後にネットワークエラーを別にシミュレートします。「結果を確認できなかった」のほうが、「追加に失敗した」と断言するより正確です。ダブルクリックで静かに 2 回追加されないことも確認します。

</details>

次は[振る舞いのテスト](/ja/build/testing/)です。

公開ソース：[Web トランスポート](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)、[コマンド応答](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Response.hs)、[アプリケーション配線](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)。
