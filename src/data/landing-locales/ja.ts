// translation-source-sha256: ac4a094b3f5dff03bfc42c2e2799fabe3cd0dccb5ebcfa882f071f85114fddd6
import type { LandingContent } from '../landing';

export const landingContent = {
	headline: ['ソフトウェアが何をするのかを知る。', 'なぜそう動いたのかを説明する。'],
	intro:
		'明示的な意思決定、意味のある履歴、そして人々が議論できるモデルを軸に構築します。NeoHaskellは、アプリケーションが変化してもルールを見える状態に保ちます。',
	primaryCta: {
		href: '/docs/',
	},
	secondaryCta: {
		href: '/start/a-shop-on-paper/',
	},
	auditability: {
		title: '現在の状態の背後にある事実を確認する。',
		body:
			'残高、予約状況、承認状態は要約です。NeoHaskellのアプリケーションフレームワークはイベントソーシングを利用します。受け入れられたドメインイベントが、状態を再構築する元となる履歴を形成します。明示的な訂正は、過去を黙って書き換える代わりに、新しい事実を追加できます。履歴が説明するのは、アプリケーションが記録すると選択したものだけです。理由、権限、証拠をどう扱うかは、設計上の決定として残ります。',
		cta: {
			href: '/start/history-and-change/',
		},
	},
	communication: {
		title: 'チームで議論できる1つのモデルを持つ。',
		body:
			'業務を理解している人々は、実装がコードの中に埋もれる前に、リクエスト、意思決定、受け入れられた事実、役立つビューについて議論できます。NeoHaskellはそれらの考えに対応する構造を提供し、Neo IDEのグラフはそれらをソースコードに結び付けます。このグラフは確認のためのものです。現在の同期はコードからモデルへの一方向で行われ、図だけで完全なアプリケーションが生成されるわけではありません。',
		cta: {
			href: '/getting-started/visual-ide/',
		},
	},
	design: {
		title: 'コードを書く前に重要な意思決定を見える状態にする。',
		body:
			'それぞれの振る舞いについて、何が開始のきっかけになるのか、受け入れるか拒否するルールは何か、残す価値のある事実は何か、次に必要となる情報は何かを明らかにします。イベントモデリングは、ドメインの専門家と開発者にこの対話のための具体的な構造を提供し、NeoHaskellはプログラム内でそれらの考えに対応する構造を提供します。モデルは問いを明らかにしますが、方針を決めるものではありません。',
		cta: {
			href: '/start/a-shop-on-paper/',
		},
	},
	safeChange: {
		title: '次の変更を、検証できるほど小さくする。',
		body:
			'1つのスライスは、リクエストから意思決定、受け入れられたイベント、ビューまで、1つの有用な振る舞いを追います。変更を受け入れる前に、通常の成功、拒否、境界ケースを確認してください。安定した契約は、システムの成長に伴うレビューを容易にします。一方で、共有イベントや既存の履歴には、今も意図的な調整が必要です。AIコーディングエージェントは実装の多くを書けますが、ルールが正しいかどうかを決めることはできません。コンパイラとテストは、実際に確認したケースについて証拠を提供します。',
		cta: {
			href: '/build/first-cart/',
		},
	},
	closing: {
		title: '説明できるルールを1つ決めるところから始める。',
		body:
			'NeoHaskellは、言語、アプリケーションフレームワーク、Neo CLI、Neo IDEをこのワークフローのもとにまとめます。考え方を読み、インストール不要のモデリング演習を試すか、プロジェクトを作成して最初のスライスを確認してください。',
		primaryCta: {
			href: '/start/fit-and-tradeoffs/',
		},
		secondaryCta: {
			href: '/getting-started/',
		},
	},
	ui: {
		brandName: 'NeoHaskell',
		pageLanguage: 'ja',
		skipLink: 'コンテンツへ移動',
		homeAriaLabel: 'NeoHaskellホーム',
		primaryNavigationLabel: '主要ナビゲーション',
		navigation: {
			docs: 'ドキュメント',
			build: 'ビルド',
			fitAndTradeoffs: '適合性とトレードオフ',
			github: 'GitHub',
		},
		languageSelector: {
			label: '言語',
			menuLabel: '言語を選択',
			options: {
				en: '英語',
				es: 'スペイン語',
				fr: 'フランス語',
				hy: 'アルメニア語',
				ja: '日本語',
				ru: 'ロシア語',
			},
		},
		cta: {
			headerCreateProject: 'プロジェクトを作成',
			heroPrimary: 'ドキュメントから始める',
			heroSecondary: 'インストールせずに試す',
			auditability: '履歴と変更について読む',
			communication: 'Neo IDEを詳しく見る',
			design: '小さなスライスをモデル化',
			safeChange: '最初の動くスライスを構築',
			closingPrimary: '適合性とトレードオフを確認',
			closingSecondary: 'プロジェクトを作成',
		},
		image: {
			alt: 'Neo IDEのグラフ。キャンバス上で、CreateCartリクエスト、記録された事実CartCreated、CartSummaryビューをつないだ最初のカート機能を示しています。',
			viewLarger: '拡大表示',
			caption: '最初のカート機能を示す実際のNeo IDE画面：リクエスト、記録された事実、サマリー。',
			fullResolution: 'フル解像度の画像を開く',
			fullResolutionAriaLabel: '新しいタブでフル解像度のNeo IDEスクリーンショットを開く',
		},
		proof: {
			caption: '保持された履歴の例',
			accountOpened: '口座開設',
			accountOpenedAmount: '+€100',
			cashWithdrawn: '現金引き出し',
			cashWithdrawnAmount: '-€30',
			currentBalance: '現在残高',
			currentBalanceAmount: '€70',
			currentStateDescription: '現在の状態は、記録された事実から導出されます。',
		},
		sharedModelTermsLabel: '共有モデル用語',
		sharedModelTerms: ['Request', 'Decision', 'Accepted fact', 'Useful view'],
		decisionItems: [
			{ label: '開始のきっかけ', value: 'Request' },
			{ label: '受け入れるか拒否するもの', value: 'ルール' },
			{ label: '保持する価値があるもの', value: '事実' },
			{ label: '次に必要なもの', value: '情報' },
		],
		checkListLabel: '変更を受け入れる前に確認するケース',
		checkList: ['通常の成功', '拒否', '境界ケース'],
		dialog: {
			title: 'Neo IDEの概要',
			description: 'アプリケーションの成長に合わせて、コマンド、イベント、クエリを1つのモデルとして見える状態に保ちます。',
			close: '閉じる',
			closeAriaLabel: '拡大したNeo IDE画像を閉じる',
		},
		footerNavigationLabel: 'フッターナビゲーション',
		footer: {
			docs: 'ドキュメント',
			build: 'ビルド',
			fitAndTradeoffs: '適合性とトレードオフ',
			contribute: 'コントリビュート',
			github: 'GitHub',
			discord: 'Discord',
		},
	},
} as const satisfies LandingContent;
