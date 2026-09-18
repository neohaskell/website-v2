---
title: 識別できるリビジョンをデプロイする
description: NeoHaskell の実行ファイルをビルド・監視し、プローブを設定し、新しいリビジョンを確認します。
sidebar:
  order: 2
---
<!-- translation-source-sha256: f4e8162eabb9115e8838e9a1afd3ac78aa2cc8dde8a4ef4d56d736825aec86af -->

リリースが成功するのは、デプロイコマンドが終了したときではなく、意図したリビジョンが正しい振る舞いを提供したときです。イベントソーシングされたサービスでは、リードモデルが履歴に追いつくまで、新しいプロセスにトラフィックを送らないようにします。同じルールは、予約ビュー、書類キュー、練習用プロジェクトのカートサマリーにも適用されます。

NeoHaskell は実行可能なアプリケーションと HTTP プローブエンドポイントを提供します。プロセス監視、トラフィックルーティング、シークレット、永続ストレージ、再起動ポリシーはホスティング環境が提供します。現在の CLI に `neo deploy` コマンドはありません。

## 同じアプリケーションをホスト向けに準備する

`neo.json`、`src/Shop/Cart/`、`src/Shop/Stock/`、テストを含む `mug-shop` プロジェクトで続けます。受け入れた変更が再起動後も残ると約束する前に、[永続化](/ja/operate/persistence/)を完了します。最初の `SimpleEventStore` 設定は意図的にメモリ上です。

具体的な方法の 1 つは、アプリケーションを実行するアカウントに Neo CLI、Nix、Git をインストールした Linux ホストを使うことです。**自分のアプリケーション**のテスト済みリビジョンを配置し、フレームワークの pin と lock ファイルを残し、そのホストまたは一致するビルドホストでビルドします。分離したステージングデータベースに対して以下の確認を実行する前に、[永続化](/ja/operate/persistence/)で説明するステージング用 `DB_*` 環境値を提供します。

```sh
neo --ci build
neo --ci test
```

テストコマンドは実際のアプリケーション状態を作り、自分でサーバーを起動します。本番データベースに対して、または別のプロセスがポート 8080 を使用している間に実行しないでください。ステージングの確認が通ってから、本番データベースを設定します。

アプリケーションディレクトリから、対話的な出力なしでサーバーを起動します。

```sh
neo --ci run
```

小規模なホスト型デプロイでは、この起動コマンドとプロジェクトディレクトリを作業ディレクトリとしてプロセス監視を設定します。以下は `/opt/mug-shop` にインストールしたアプリケーション用の**systemd ユニットテンプレート**です。Neo のパスは、サービスアカウントで `command -v neo` を実行した出力に置き換え、そのアカウントの Nix と Git の実行ファイルを `PATH` に含めます。

```ini
[Unit]
Description=Mug shop application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mug-shop
WorkingDirectory=/opt/mug-shop
EnvironmentFile=/etc/mug-shop.env
Environment=PATH=/home/mug-shop/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/local/bin/neo --ci run
Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
```

アカウントには、プロジェクトと生成されたビルドディレクトリへのアクセスが必要です。下のフィールドを使い、ホストの保護された設定メカニズムで `/etc/mug-shop.env` を作成します。適応したユニットを `/etc/systemd/system/mug-shop.service` に保存し、ホストの管理者アカウントで次を実行します。

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now mug-shop
sudo journalctl -u mug-shop -f
```

この起動経路は、再起動時も CLI を通して照合とビルドを行います。そのためツールチェーンが必要で、ネットワークアクセスも必要になることがあります。事前にビルドされた最小ランタイムイメージではありません。リビジョンと依存関係を固定し、トラフィックを受け入れる前にビルドし、停止・再起動の動作をテストします。より専門的なパッケージングはデプロイの選択です。CLI はすぐ使えるアプリケーションコンテナーやクラウド環境を生成しません。

## ランタイムリソースを提供する

リビジョンを起動する前に、次を確立します。

- [永続化](/ja/operate/persistence/)で配線した `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`DB_POOL_SIZE`、`DB_SSL_MODE`、`DB_SSL_ROOT_CERT` と、到達可能なデータベース。
- ローカル Blob ストアを使う場合は、永続的なアップロードボリューム。
- デプロイのシークレット機構から提供するプロバイダー認証情報と認証設定。
- トランスポートに実際に渡す HTTP ポート。
- ログとスモークテスト結果と一緒に、リリースシステムが記録するリビジョン識別子。

設定の宣言だけでなく配線も調べます。宣言されたポートフィールドは、アプリケーションがそれを使ってサーバーを設定しない限り効果がありません。

## 起動、ライブネス、レディネスを分ける

標準のアプリケーション・Web 配線では、次のようになります。

| リクエスト | 意味 | 通常の応答 |
| --- | --- | --- |
| `GET /health` | HTTP プロセスが応答している | `200` |
| `GET /ready` | 登録済みのクエリプロジェクションが追いついた | 準備完了時は `200`、再構築中または失敗時は `503` |

ヘルスチェックは決済プロバイダーが動くことを証明しません。レディネスはすべてのビジネスワークフローを認定しません。カスタム配線でこれらのルートを変更・省略することもあります。実際のリビジョンを確認します。

Kubernetes では、これは**プローブの説明用断片**であり、完全なデプロイマニフェストではありません。

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 12
  timeoutSeconds: 2
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
  timeoutSeconds: 2
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
  timeoutSeconds: 2
```

起動予算の例は `5 × 12 = 60` 秒です。上限付きのプロセス・データベース初期化に合わせます。履歴クエリのリプレイはライブ購読登録後に実行され、HTTP バインドを遅らせてはいけません。リプレイと重なったライブイベントが処理されるまで、readiness は `503` のままです。起動プローブで、定常状態のライブネスポリシーが初期化を繰り返し停止するのを防ぎます。

## 意図的にトラフィックを受け入れる

1. ユーザートラフィックを送らずにリビジョンを起動します。
2. `/health` を観測し、その後 `/ready` が `200` を返すまで待ちます。
3. **新しいリビジョンの識別情報**に対して代表的なスモークテストを実行します。
4. トラフィックを受け入れ、失敗、レイテンシー、ビジネス結果を監視します。

共有 ingress が古いリビジョンへ到達することはあります。成功した応答だけでは、新しいリビジョンが動いている証明になりません。

`mug-shop` では、Cart を作成し、許可された数量を追加し、Cart と Stock のクエリ結果を観測し、数量 0 が拒否されることを確認します。[HTTP とフロントエンド](/ja/build/http-and-frontend/)のリクエストの形を新しいリビジョンに対して再利用します。外部の結果は、そのインテグレーションを実装している場合だけ、制御したプロバイダー環境で確認します。組み込みプローブが確立する事実は、より限定されたものです。このガイドは、クラウド、決済、AI のエンドツーエンドのデプロイを提供・認定しません。

ポート 8080 のローカルインスタンスでは、次を実行します。

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

## 現在の運用上の制限を考慮する

Postgres クライアントは上限付きプールを使います。`LISTEN/NOTIFY` のリスナー接続には、直接でセッションを維持する接続が必要です。トランザクションモードの PgBouncer を通してルーティングしないでください。プール済み・直接エンドポイントの分割対応と Neon の scale-to-zero 対応は、[issue #857](https://github.com/neohaskell/NeoHaskell/issues/857)で追跡しています。

アクティブな再構築中の SIGTERM キャンセルとチェックポイントのフラッシュは、[issue #662](https://github.com/neohaskell/NeoHaskell/issues/662)で追跡中です。リプレイを待つため終了猶予を無期限に延ばさないでください。ステージングで中断と再起動を練習し、レディネス契約でトラフィックを制御します。

次は[観測するもの](/ja/operate/observability/)を学び、[復旧](/ja/operate/recovery/)を練習します。
