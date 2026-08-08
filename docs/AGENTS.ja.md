English | [日本語](./AGENTS.ja.md)

---

# AGENTS.md (日本語版)

このファイルはAIコーディングエージェント（Antigravity等）がこのリポジトリで作業する際に
常に遵守すべき開発規約です。実装を始める前に必ず `BLUEPRINT.md` と本ファイルを読み込み、
矛盾する指示がユーザーから来た場合は本ファイルの制約を優先し、理由を提示した上で確認を取ってください。

## 0. プロジェクトの性質（最重要）

- これは **開発費用0円・サーバーレス** で運用する個人開発OSSプロジェクトです。
- 「サーバーレス」とは「自分で運用するバックエンドサーバーを一切持たない」ことを意味します。
  - ❌ 独自API/DB/認証サーバーの新規構築
  - ✅ GitHub Pages / Cloudflare Pages などの静的ホスティング（ユーザー自身のアカウント上）
  - ✅ GitHub REST API / GitHub Actions（ユーザー自身のリポジトリ上で動くもの）
  - ✅ 決済・ライセンス配布はGumroad / Lemon Squeezy / Ko-fi等の**既存SaaSに完全委任**し、
    自前の決済サーバーやWebhookサーバーは作らない
- 迷った場合は「これは誰のインフラ・誰のコストで動くか」を自問し、開発者側のランニングコストが
  発生する設計を採用しないでください。

## 0.5. プラットフォーム方針（デスクトップ・モバイル横断）

- 本プラグインは `manifest.json` の `isDesktopOnly: false` とし、**デスクトップ版・モバイル版
  （iOS/Android）の両方で動作すること**を必須要件とする。
- モバイル環境ではNode.js/Electron APIが一切使えない。以下を厳守すること。
  - ❌ `fs`, `path`, `child_process` など Node組み込みモジュールの直接import
  - ❌ ブラウザの生の `fetch`（モバイルのWebView環境でCORS等の問題を起こしやすい）
  - ✅ ネットワーク通信は必ず Obsidian の `requestUrl()` API を使う
    （デスクトップ・モバイル両対応、CORS回避済み）
  - ✅ 永続化は `plugin.saveData()` / `loadData()` のみ（vault内JSON、両OS対応）
  - ✅ ファイルビルド成果物（web-dashboard-templateの静的アセット）は**ビルド時に
    obsidian-pluginパッケージへ埋め込み**、実行時にNode/Viteでビルドしない
    （モバイルではビルドツールを実行できないため）
- UIはモバイルの狭い画面幅・タッチ操作を前提に確認すること。設定タブ・ダッシュボードビューは
  レスポンシブに崩れないようにする。
- `Platform`（Obsidian API）を使い、`Platform.isMobileApp` で分岐が必要な箇所
  （外部ブラウザを開く処理、クリップボード操作など）は明示的に分岐し、コメントで理由を書く。
- 「モバイルでは動作しない／制限される機能」がある場合は機能を黙って落とすのではなく、
  UI上でその旨を明示する（例: バックグラウンド自動同期の制限、BLUEPRINT.md参照）。

## 1. リポジトリ構成（pnpm workspaces monorepo）

```
.
├── packages/
│   ├── obsidian-plugin/        # Obsidianプラグイン本体 (TypeScript, esbuild)
│   ├── web-dashboard-template/ # BYOデプロイされるWebダッシュボード (React + TS + Tailwind, Vite)
│   └── shared/                 # プラグインとダッシュボードで共有する型定義・スキーマ
├── docs/
│   ├── BLUEPRINT.md
│   └── AGENTS.md
├── .github/workflows/          # CI/CD (このリポジトリ自体のビルド・テスト・リリース用)
├── pnpm-workspace.yaml
└── turbo.json                  # ビルドタスクの依存関係管理（任意、必要になったら導入）
```

- `obsidian-plugin` と `web-dashboard-template` は**明確に分離**すること。
  前者はElectron/Node環境で動くプラグイン、後者は静的サイトとしてユーザーのGitHub Pages等に
  デプロイされる完全に別実行環境のReactアプリです。この境界を混同しないこと。
- `shared` には両者が読み書きするJSONエクスポート形式の型定義（Zodスキーマ推奨）を置き、
  スキーマの単一の真実源（Single Source of Truth）とすること。

## 2. 技術スタックの固定方針

| 領域              | 採用技術                                   | 理由                                           |
| ----------------- | ------------------------------------------ | ---------------------------------------------- |
| プラグイン言語    | TypeScript (strict)                        | Obsidian公式サンプルに準拠                     |
| プラグインビルド  | esbuild                                    | Obsidian公式サンプルの標準構成、軽量・高速     |
| Webダッシュボード | React 18 + TypeScript + TailwindCSS + Vite | ユーザー指定                                   |
| バリデーション    | Zod                                        | JSONエクスポート形式の実行時検証に使う         |
| グラフ描画        | Recharts（軽量・依存少）                   | 過剰なライブラリは避ける                       |
| 状態管理          | React標準 (useState/useReducer/Context)    | 小規模アプリにReduxやZustandは過剰             |
| Lint/Format       | ESLint + Prettier                          | Obsidianプラグインコミュニティの慣例に合わせる |
| テスト            | Vitest                                     | Viteエコシステムと親和性が高い                 |
| CI                | GitHub Actions                             | 追加コストなし                                 |

新しく依存ライブラリを追加する前に「本当に必要か／esbuild成果物のバンドルサイズを
不必要に膨らませないか」を検討すること。Obsidianプラグインは起動時間に敏感なユーザーが多い。

**パッケージ間でのバンドルサイズ制約の違いに注意すること。**
`web-dashboard-template` と `obsidian-plugin` はバンドルサイズ制約のシビアさが異なる。
前者はユーザーのブラウザで一度読み込まれるだけの静的サイトのため、軽量なUIライブラリ
（例: `lucide-react` などtree-shaking可能なアイコンライブラリ）の追加は許容範囲が広い。
後者はObsidian起動時間に直結するため、依存追加には引き続き慎重を要する
（Reactを含め、原則として持ち込まない。0.5章参照）。
`web-dashboard-template` にライブラリを追加する場合も、named importでtree-shakingが
効く書き方に統一し、バレルインポート（全量import）は避けること。

## 3. コーディング規約

- `tsconfig.json` は `strict: true` を必須とする。`any` の使用は原則禁止。
  どうしても必要な場合は理由をコメントで明記すること。
- 関数・コンポーネントは単一責任を意識し、1ファイル300行を超えたら分割を検討する。
- Obsidian Plugin APIへの依存箇所（`app.vault`, `app.workspace` など）は
  `packages/obsidian-plugin/src/obsidian-adapters/` 配下に薄いラッパーとして隔離し、
  ビジネスロジック（集計処理など）から直接APIを呼ばない。これによりユニットテストが容易になる。
- Reactコンポーネントは Presentational / Container を意識して分離する。
  データ取得・変換ロジックをコンポーネント内に直書きしない（`hooks/` に切り出す）。
- 命名は英語、コメントは日本語可（このプロジェクトの主要メンテナが日本語話者のため）。
- マジックナンバー・マジック文字列は `constants.ts` に集約する。

## 4. コミット・ブランチ規約

- Conventional Commits に従う（`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`）。
- `main` ブランチへの直接pushは禁止。作業は `feature/xxx` ブランチで行い、PRを作成する想定で
  コミットを整理すること（実際のPR運用は人間が行うが、エージェントはコミット粒度を意識すること）。
- 1コミット1関心事。大きな機能追加は複数コミットに分割する。

## 5. セキュリティ・プライバシー方針（厳守）

- ユーザーのクリック履歴・ノート内容は**プラグイン開発者のサーバーに一切送信しない**。
  外部送信先はユーザー自身が指定したGitHubリポジトリのみ。
- GitHub Personal Access Token（PAT）やOAuthトークンは、
  Obsidianの `plugin.saveData()`（vault内の暗号化されないJSON）に保存されるため、
  設定画面に必ず「このトークンはあなたのvault内にローカル保存されます」という明示的な注意書きを
  実装すること。
- リポジトリのコード・READMEに実際のトークン、Client Secretを**絶対にハードコードしない**。
  `.env.example` を用意し、実値は `.env`（`.gitignore`対象）に置く。
- 公開リポジトリにpushする前に、CIでシークレット漏洩検知（`gitleaks` 等）を回すこと。

## 6. ライセンス（有料機能）実装方針

- 有料機能のゲーティングは**オフライン検証**で行う（詳細はBLUEPRINT.md参照）。
  外部ライセンスサーバーへの問い合わせは行わない。
- 「無料版はコミュニティディレクトリ単体で完結した価値があること」を必須要件とする。
  有料機能を無効化しても、無料版の主要機能（ローカル分析・Obsidian内ダッシュボード）は
  フル機能で動作し続けなければならない。Obsidianの開発者ポリシーに抵触する実装
  （コミュニティ版内で機能を人質にする設計）をしないこと。
- **開発者自身がPremium機能を無料で使う場合も、`scripts/generate-license.ts` で
  自分用のライセンスキーを署名生成し、一般ユーザーと同じ検証パスを通すこと。**
  `if (isDeveloper) return true` のような特別扱いのコードパス（バックドア）は
  **絶対に実装しないこと**。理由:
  - 配布物（main.js）はコード解析可能なため、バイパス条件はリバースエンジニアリングで
    容易に発見され、有料ユーザーとの公平性が崩れる
  - 検証ロジックの分岐が増えることでバグ・攻撃面が増える
  - 署名検証のみのシンプルな一本道であることが、セキュリティレビューのしやすさに直結する

## 7. CI/CDで最低限担保すること

- Push/PR時: lint, typecheck, unit test, build が全てグリーンであること。
- `obsidian-plugin`: `manifest.json` のバージョンとGitHub Releaseタグの整合性チェック。
- `web-dashboard-template`: ビルド成果物がVite標準出力で問題なく生成されることの確認
  （実際のデプロイはユーザー環境で行われるため、このリポジトリのCIでは「ビルドが壊れていないか」の
  検証のみを行い、デプロイそのものはしない）。

## 8. エージェントが自律判断してはいけないこと

- 有料/無料の機能境界の変更
- 新しい外部SaaS（決済・認証等）の追加
- プライバシーに関わるデータ送信先の追加
- 依存ライブラリで月額コストが発生するもの・サーバーが必要なものの導入

これらはユーザーへの確認を必須とする。
