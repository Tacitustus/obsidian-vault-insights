# BLUEPRINT.md — Obsidian Vault Insights（仮称）設計仕様書

## 1. ビジョン

Obsidianの利用状況（ノートの閲覧・更新頻度、リンク構造、タグ活用など）を横断的に可視化する
分析プラグイン。無料版はObsidian内で完結。有料版（BYOプレミアム）はユーザー自身のGitHub上に
自動デプロイされる、作り込まれたWebダッシュボードで、複数デバイス・複数ヴォールトを横断して
いつでもブラウザから閲覧できる。

**非ゴール**: リアルタイム同時編集、チームコラボレーション、開発者運営のクラウドサービス。
これらは将来的に需要が見えた場合のみ再検討する。

## 2. 全体アーキテクチャ

**プラットフォーム方針**: 本プラグインはデスクトップ（Electron/Node環境）と
モバイル（iOS/Android、Node.js API非搭載のWebView環境）の**両方で動作する**ことを前提とする
（`isDesktopOnly: false`）。そのため以下の設計制約が全体を貫く。

- ネットワーク通信は Obsidian の `requestUrl()` を使用（生の`fetch`は不使用）
- 永続化は `plugin.saveData()/loadData()` のみ（vault内JSON。Node `fs` は使わない）
- `web-dashboard-template` のビルド（Vite実行）は**開発者のビルド時 or CI上でのみ行い**、
  ビルド成果物（静的HTML/JS/CSS一式）を `obsidian-plugin` パッケージに**埋め込みアセットとして
  同梱**する。モバイル端末上でVite/Node ビルドを実行することはできないため。

```
┌─────────────────────────────┐
│ Obsidian Plugin                       │
│  (Desktop: Electron/Node / Mobile: WebView)│
│  - ローカルイベント収集 (open/edit/link/tag) │
│  - 集計・スナップショット生成 (JSON)        │
│  - Obsidian内ダッシュボード (無料)         │
│  - [Premium] GitHub Device Flow 認証     │
│    (requestUrl経由、両OS対応)             │
│  - [Premium] GitHub Contents API でpush  │
│    (同梱済みビルド済みアセットをpush、       │
│     実行時ビルドは行わない)                 │
└───────────────┬───────────────┘
                │ 定期的にJSONをcommit & push
                ▼
┌─────────────────────────────┐
│ ユーザー自身のGitHubリポジトリ            │
│  - /vaults/<vaultId>/snapshot.json       │
│  - /vaults/index.json (マルチヴォールト一覧)│
│  - web-dashboard-template を元にした静的サイト │
└───────────────┬───────────────┘
                │ GitHub Pages / Cloudflare Pages
                ▼
┌─────────────────────────────┐
│ 静的Webダッシュボード (React+TS+Tailwind)   │
│  - ビルド時ではなく実行時にJSONをfetchして描画  │
│  - グラフ・フィルタ・検索・複数ヴォールト切替     │
└─────────────────────────────┘
```

開発者（プラグイン作者）が保有・運用するサーバーはどこにも存在しない点が設計上の核。

## 2.1 開発者自身の無料Premium利用

開発者自身がPremium機能を使う場合も、専用のバイパスコードは実装しない。
`scripts/generate-license.ts`（Phase 8で実装、秘密鍵は開発者ローカルのみ保持）で
自分用の署名付きライセンスキーを1つ生成し、一般ユーザーと全く同じ設定画面・検証パスに
貼り付けて使う。実装上は一般購入者と区別されない（AGENTS.md 6章参照）。

## 3. データモデル（`packages/shared` にZodスキーマとして実装）

```ts
type NoteEvent = {
  noteId: string;       // vault内相対パスのハッシュ（プライバシー配慮でファイル名は極力伏せる設定も可）
  notePath: string;     // 表示用（設定でOFFにできる = プライバシーモード）
  type: "open" | "edit" | "linkCreated";
  timestamp: number;    // unix epoch (ms)
};

type NoteAggregate = {
  noteId: string;
  notePath: string;
  openCount: number;
  editCount: number;
  lastOpened: number;
  firstSeen: number;
  tags: string[];
  outgoingLinks: number;
  incomingLinks: number;
};

type VaultSnapshot = {
  schemaVersion: 1;
  vaultId: string;       // ユーザーが設定するエイリアス（例: "仕事用", "個人用"）
  generatedAt: number;
  notes: NoteAggregate[];
  totals: {
    noteCount: number;
    totalOpens: number;
    totalEdits: number;
  };
};

type VaultIndex = {
  schemaVersion: 1;
  vaults: { vaultId: string; snapshotPath: string; label: string }[];
};
```

- `notePath` を出さない「プライバシーモード」をデフォルトで提供し、
  公開リポジトリにpushする際のリスクをユーザーが選べるようにする（重要な差別化ポイントにもなる）。
- スナップショットは**フルダンプの上書き**方式（差分同期は複雑さに見合わないため見送り）。

## 4. 無料 / 有料 機能境界

| 機能 | 無料 | 有料 |
|---|---|---|
| クリック/編集/リンク/タグの集計 | ✅ | ✅ |
| Obsidian内ダッシュボード | ✅ フル機能 | ✅ |
| JSON手動エクスポート | ✅ | ✅ |
| GitHub Device Flow ワンクリック認証 | ❌ | ✅ |
| 自動デプロイ（Pages設定含む） | ❌ | ✅ |
| 定期自動push（バックグラウンド同期） | ❌ | ✅ |
| Web版ダッシュボードテンプレート | ❌（手動で自分でホストは可能） | ✅ 作り込み版 |
| 複数ヴォールト統合ビュー | ❌ | ✅ |

無料版でも「JSONを手動エクスポートしてWebに置く」ことは技術的に誰でも可能な状態を維持する
（オープン性を損なわないため）。有料版が買うのは**自動化と作り込まれたUX**であり、
機能そのものの独占ではない。

**プラットフォーム対応表**

| 機能 | デスクトップ | モバイル |
|---|---|---|
| イベント収集・Obsidian内ダッシュボード | ✅ | ✅ |
| JSON手動エクスポート | ✅ | ✅（OS標準の共有/保存ダイアログ経由） |
| GitHub Device Flow 認証 | ✅ | ✅（外部ブラウザ起動＋復帰待ち） |
| 自動デプロイ | ✅ | ✅ |
| 定期自動push | ✅（アプリ起動中） | △（アプリ起動中のみ、OSサスペンドの影響を強く受ける） |

「モバイルは全機能が動くが、バックグラウンド同期の信頼性はデスクトップより低い」という
非対称性を、購入ページ・README・設定画面いずれにも明記すること。

## 5. BYOセットアップフロー（GitHub Device Flow）

サーバーを介さずにOAuth的な認証を行うため、**GitHub OAuth Appの Device Flow** を採用する。

1. 開発者は無料でGitHub OAuth Appを1つ登録する（Client IDのみ必要、Client Secret不要な
   Device Flow対応の設定にする）。
2. プラグインが `requestUrl()` 経由で `POST https://github.com/login/device/code` を叩き、
   ユーザーコードと認証URLを取得（`requestUrl`を使うためデスクトップ・モバイル両対応かつ
   CORSの問題も発生しない）。
3. ユーザーに「このコードをブラウザで入力してください」とモーダル表示し、コードを
   ワンタップでクリップボードにコピーできるボタンを設置する。
   - デスクトップ: `window.open(verification_uri)` で既定ブラウザを起動
   - モバイル: `Platform.isMobileApp` を判定し、`window.open` またはObsidian推奨の
     外部リンクオープン手段（OS標準のブラウザ起動）を使う。モバイルOSではアプリ切り替え後に
     Obsidianへ戻ってくるまでのタイムラグがあるため、ポーリング間隔・タイムアウトは
     デスクトップより余裕を持たせる（例: 最大10分待機）。
4. プラグインはポーリングで `requestUrl()` 経由で
   `POST https://github.com/login/oauth/access_token` を叩き、
   ユーザーが承認したらアクセストークンを取得。
5. トークンはObsidianのvault内ローカルにのみ保存（AGENTS.md 5章の通り明示同意を取る）。
6. トークン取得後、以下を自動実行:
   - 新規リポジトリ作成 (`obsidian-vault-insights-web` など固定名)
   - `web-dashboard-template` の**ビルド済み静的ファイル一式（obsidian-pluginに事前同梱済みの
     アセット）** をpush。モバイル・デスクトップ問わず、この時点でViteビルドは実行しない。
   - GitHub Pages を有効化（Contents API + Pages API）
   - 初回スナップショットをpush

この方式なら開発者側のサーバーコストはゼロ、かつユーザー体験としては「ワンクリック認証」を
デスクトップ・モバイルの両方で実現できる。

## 6. 「定期自動同期」の実装と限界（正直に明記する）

- Obsidianプラグインは常駐プロセスではないため、**Obsidianが起動している間のみ**
  タイマー（例: 30分間隔、設定可能）でスナップショットをpush する。
- 「Obsidianを閉じていても裏で同期される」ことは、サーバーを持たない以上実現不可能。
  これはBYO方式の本質的なトレードオフであり、機能説明・README・購入ページで
  **誤解を招かないよう明記すること**（誇大広告によるレビュー炎上を避けるため重要）。
- 補助的に「Obsidian終了時に最終スナップショットをpushする」フックも入れ、
  実用上の鮮度をできるだけ担保する。

**モバイル固有の追加制約**: モバイルOS（iOS/Android）はバックグラウンドで動くアプリの
プロセスを容赦なくサスペンド／終了させるため、`registerInterval` のタイマーは
**Obsidianアプリが実際にフォアグラウンドで開かれている間しか信頼できない**。
デスクトップ以上に「開いている間だけ同期される」実態が強くなる。
そのため:
- モバイルでは同期間隔の期待値をUI上で下げて説明する
  （例: 「モバイルではアプリを開いたタイミングで同期されます」という文言に変える）
- `Platform.isMobileApp` の場合、アプリ起動時（`onload`）とバックグラウンド遷移前
  （可能な範囲でのイベントフック）に同期を試みる「オンデマンド同期」を主軸にし、
  インターバルタイマーへの依存を下げる設計にする。

## 7. 複数ヴォールト統合表示

- 各ヴォールトのプラグインインスタンスが同じGitHubリポジトリの異なるパス
  (`/vaults/<vaultId>/snapshot.json`) にpushする設計とする。
- Webダッシュボードは `/vaults/index.json` を読み、ヴォールト切り替えUI（タブ or セレクタ）を
  描画する。
- 同じリポジトリに複数ヴォールトからpushする際のコンフリクトを避けるため、
  各ヴォールトは自分のパス以外を書き換えないこと（GitHub Contents APIの単一ファイルPUTで対応）。

## 8. ライセンス（課金）設計 — サーバーレスでの実現方法

決済・ライセンス発行は既存SaaSに完全委任し、検証はオフラインの署名検証で行う。

1. 開発者はGumroad または Lemon Squeezy でプレミアムライセンスを販売する
   （決済・インボイス・返金対応を丸投げできる。開発費・運用コスト0円）。
2. 購入完了時にGumroad/Lemon Squeezy側の自動配信機能で、
   **開発者が事前に生成した署名付きライセンスキー**を購入者に発行する
   （ed25519等の公開鍵暗号でライセンスキーに署名。秘密鍵は開発者のローカルのみで保持し、
   リポジトリには絶対に含めない）。
3. プラグインには公開鍵のみを埋め込み、ユーザーが設定画面にライセンスキーを貼り付けたら
   **オフラインで署名検証**する。サーバーへの問い合わせは一切発生しない。
4. これにより「ライセンスサーバー」を持つ必要がなく、完全にサーバーレスな課金判定が実現できる。

このライセンスキー生成（署名付きキーの発行）は**開発者手動 or 簡易ローカルスクリプトで行う**
運用とし、初期フェーズでは自動化しない（購入者数が少ない段階では過剰投資のため）。

## 9. 寄付導線

- 無料版の設定タブ最下部とREADMEに GitHub Sponsors / Ko-fi / Buy Me a Coffee リンクを設置。
- `manifest.json` の `fundingUrl` フィールドを活用し、Obsidianコミュニティディレクトリの
  プラグイン詳細ページにも寄付ボタンが表示されるようにする。

## 10. フェーズ分け（マイルストーン）

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 0 | リポジトリ scaffold・CI基盤 | これから |
| Phase 1 | 無料版: イベント収集エンジン | これから |
| Phase 2 | 無料版: Obsidian内ダッシュボード | これから |
| Phase 3 | JSONエクスポート・スキーマ確定 | これから |
| Phase 4 | web-dashboard-template（React+TS+Tailwind） | これから |
| Phase 5 | GitHub Device Flow 認証＋自動デプロイ | これから |
| Phase 6 | 定期自動push（バックグラウンド同期） | これから |
| Phase 7 | 複数ヴォールト統合表示 | これから |
| Phase 8 | ライセンス検証（オフライン署名） | これから |
| Phase 9 | コミュニティディレクトリ申請・寄付導線・公開 | これから |

各フェーズは独立してAntigravityに投げられる粒度に分割している（詳細は `PROMPTS.md` 参照）。
