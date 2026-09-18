---
title: OAuth2 で外部アカウントを接続する
description: 同意、認証情報、アプリケーションの結果を明示したまま、外部アカウントをリンクします。
sidebar:
  order: 3
---
<!-- translation-source-sha256: 17a8eb2e9c99df4613009c86e429a7d033d17de068e3960a586f7cd24ebcdffc -->

誰かが、カレンダー、書類サービス、会計ツールなど、別の場所で持っているアカウントをアプリケーションで使いたいとします。プロバイダーのパスワードをアプリケーションに渡さずに、接続を認可できるべきです。OAuth2 は、同意のフローと、その後のアクセスに使う認証情報を提供します。

これはアプリケーションへのサインインとは異なります。JWT 認証はユーザーを識別します。プロバイダーの OAuth2 トークンは外部アカウントへのアクセスを認可します。練習用プロジェクトでは、テスト用の会計アカウントを接続すると考えます。同意は機能の一部です。請求書の作成や注文のエクスポートには、別のアダプターが必要です。

[アプリケーションのアクセス制御](/ja/build/access-control/)と[インテグレーションの結果](/ja/connect/)から始めます。実際の機能に必要な最小限のプロバイダー権限を選びます。

## mug-shop に接続の場所を与える

`neo new` で作成したプロジェクトを続けます。プロバイダーの設定とコールバックエンコードヘルパーを `src/Shop/Integrations/Accounts.hs` に置き、`src/App.hs` から配線します。OAuth2 とシークレットストアのモジュールはコアパッケージから提供されるため、同意ルートを組み込むだけならプロバイダーインテグレーションパッケージは必要ありません。

接続済み、失敗、接続解除の結果を表す `InternalTransport` コマンドをまず追加し、アプリケーションが登録するサービスに入れます。トークンを公開せずに接続状態を表示するクエリも必要です。これらは新しいアカウント接続機能であり、Cart と Stock はアプリケーションの開始スライスのままです。

## プロバイダー互換性を確立する

コアは PKCE を使う設定可能な authorization-code フローを提供しますが、会計プロバイダーのプリセットは提供しません。`Provider` には `name`、`authorizeEndpoint`、`tokenEndpoint` があります。選んだプロバイダーが、実際のクライアント交換形式に対応することを確認します。フォームパラメーターには `client_id`、`client_secret`、PKCE verifier が含まれます。プロバイダー固有のスコープ、追加の認証パラメーター、API 操作には、独自の互換性作業が必要です。

起動時にプロバイダーのエンドポイントについて HTTPS とネットワークアドレスの制限を検証し、重複する名前を拒否します。`OAuth2.mkRedirectUri` でコールバック URI を作り、その `Result` を処理し、同じ URI をプロバイダーに登録します。サポートされる localhost 開発アドレスを除き、HTTPS が必要です。

## アカウント接続を配線する

これは**アプリケーションビルダーの部分**です。周囲のアプリケーションは、トランスポートとサービスをすでに登録していなければなりません。`identityServerUrl`、`accountProviderConfig`、`existingSecretStore` はアプリケーションが用意する値です。

```haskell
    |> Application.withAuth @() (\_ -> identityServerUrl)
    |> Application.withSecretStore @() (\_ -> existingSecretStore)
    |> Application.withOAuth2StateKey "SHOP_OAUTH_STATE_KEY"
    |> Application.withOAuth2Provider @() (\_ -> accountProviderConfig)
```

state-key 設定は、少なくとも 32 バイトのシークレットを含む環境変数を指定します。起動前に設定します。`withOAuth2StateKey` はプロバイダー登録より前でなければなりません。設定に依存する値では、`@()` ファクトリーを `Application.withConfig` で登録した設定型から受け取る関数に置き換えます。

`withSecretStore` と `withOAuth2Provider` は、ストアやプロバイダーレコードを直接ではなく、**ファクトリー関数**を受け取ります。起動作業が必要なストアは、ファクトリーからハンドルを返す前に起動設計を通して構築します。この API はファクトリーの結果として `Task` を受け取りません。

プロバイダー設定には、次の**レコード構築の断片**があります。

```haskell
OAuth2ProviderConfig
  { provider = selectedProvider
  , clientId = registeredClientId
  , clientSecret = registeredClientSecret
  , redirectUri = validatedCallbackUri
  , scopes = requestedScopes
  , onSuccess = encodeConnected
  , onFailure = encodeConnectionFailure
  , onDisconnect = encodeDisconnected
  , successRedirectUrl = connectedPage
  , failureRedirectUrl = failedPage
  }
```

`OAuth2ProviderConfig` は `Auth.OAuth2.Provider` に定義されています。Client ID、シークレット、リダイレクト URI、スコープには `Auth.OAuth2.Types` の型を使います。シークレットと検証済みリダイレクト URI にはスマートコンストラクターを使います。認証情報は[シークレット設定](/ja/build/configuration/)に保ちます。

## 3 つのルートを追う

| 意図したリクエスト | 起きること |
| --- | --- |
| `GET /connect/{provider}` | ユーザーを認証し、プロバイダーの同意へリダイレクトする |
| `GET /callback/{provider}?code=…&state=…` | 署名付き state を確認し、保存したトランザクションを消費し、code を交換する |
| `POST /disconnect/{provider}` | ユーザーを認証し、ローカルのトークン削除を試みる |

接続ルートは bearer ヘッダーを受け取り、ブラウザーリダイレクト用にクエリトークンへフォールバックします。可能ならヘッダーを優先し、トークンを含む URL がアプリケーションやプロキシのログに入らないようにします。コールバックは署名付き state と保存されたトランザクションを使い、プロバイダーのリダイレクトから JWT を要求しません。

state は 5 分後に期限切れになります。トランザクションはユーザーの識別情報と PKCE verifier をサーバー側に保持し、一度だけ消費されます。そのため交換に失敗した場合は、同じコールバックをリプレイせず、新しい接続を開始する必要があります。

## 同意をアプリケーションの結果に変える

交換に成功すると、`onSuccess` が認証済みユーザー ID と `TokenKey` を受け取る前にトークンが保存されます。各コールバックは `Integration.CommandPayload` 形式の JSON テキストを返します。登録済みのアプリケーションコマンドを `Integration.encodeCommand` で囲んで構築します。

`encodeConnected` は `Text -> TokenKey -> Text` を扱い、`encodeConnectionFailure` は `Text -> OAuth2Error -> Text` を扱い、`encodeDisconnected` は `Text -> Text` を扱います。コールバック境界がエンコードされたテキストなので、結果のコマンドは別々の型でもかまいません。生のトークンをコマンドのペイロードやイベントに入れないでください。接続コマンドにはアプリケーションの関連付けと適切な参照を記録させ、結果をクエリで公開します。

成功 URL に到達したことを、接続機能が動く証拠として扱わないでください。コールバックのコマンドディスパッチと、実際のプロバイダー API 操作を別々にテストします。交換前のエラーや、`code` のない同意拒否リダイレクトは、必ずしも `onFailure` を呼びません。現在の Web コールバックは `code` と `state` の両方を期待します。

## 認証情報の寿命を計画する

デフォルトのシークレットストアはメモリ上にあります。接続が再起動後も残ると約束する前に、永続的なシークレットストレージを実装して提供します。現在のアプリケーションはトランザクションストアもメモリ上に作ります。同意中に再起動するとトランザクションを失い、複数インスタンスでは意図的なコールバックルーティングか別のトランザクションストアインテグレーションが必要です。

`TokenRefresh.withValidToken` はアダプター作者向けの明示的なヘルパーです。保存されたトークンを読み、指定されたアクションを実行し、呼び出し元の unauthorized 判定で特定したエラーの場合に更新します。更新したトークンを保存し、アクションを 1 回再試行します。`expiresInSeconds` から積極的に更新をスケジュールすることはありません。キーごとの更新ロックはプロセス内だけです。

トークンがない、refresh token がない、更新に失敗した場合は、再接続の結果が必要です。アカウントの接続解除は現在、ローカル削除を試みますが、削除エラーを無視し、プロバイダーの revoke エンドポイントを呼びません。プロダクトが必要とするなら、削除を検証しプロバイダーの revoke を実装します。「接続解除」は、リモートで revoke された証拠ではありません。

## 接続フローをローカルで実行する

結果コマンドとアカウント設定を登録したら、`mug-shop` から `neo build` と `neo test` を実行します。開発用のクライアント認証情報と state key を付け、プロバイダーに登録した localhost コールバックを使って `neo run` を起動します。同意を進め、接続クエリを調べます。別にプロバイダー API の呼び出しをテストします。リダイレクトページに到達しただけでは、API アクセスは確立しません。

## 演習：同意が中断された

エージェントに、接続、改ざんまたはリプレイされた state、同意拒否、同意中の再起動、更新失敗、シークレットストアが失敗する接続解除を実演させます。それぞれの場合に、アカウントを接続する人が何を見るかを説明します。

制御したルートと更新の確認を、プロジェクトのテストスイートに保ちます。特定の会計プロバイダーを認定するものではありません。そのプロバイダーのサンドボックス検証を別に記録し、実際の[プロバイダーアダプター](/ja/connect/custom-integrations/)を構築します。

<details>
<summary>フレームワークソースの注記</summary>

- [アプリケーション配線](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [プロバイダー設定](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Provider.hs)
- [OAuth2 の型と URI 検証](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Types.hs)
- [クライアント交換形式](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Client.hs)
- [ルートのライフサイクル](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Routes.hs)
- [HTTP ルートの配線](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [シークレットストアのインターフェース](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/SecretStore.hs)
- [更新ヘルパー](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/TokenRefresh.hs)
- [ルートのテスト](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/RoutesSpec.hs)
- [更新のテスト](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/TokenRefreshSpec.hs)

</details>
