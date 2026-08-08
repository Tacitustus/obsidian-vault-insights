English | [日本語](./CONTRIBUTING.ja.md)

---

# Contributing to Vault Insights (日本語版)

Vault Insights へのコントリビュートをご検討いただき、ありがとうございます！
このリポジトリは、以下の設計思想とルールに基づいて開発されています。PR（Pull Request）を作成する際は、必ずご一読ください。

## 1. プロジェクトの基本方針（サーバーレス・開発費用ゼロ）

本プロジェクトは「開発費用0円・サーバーレス」で運用する個人開発OSSです。
開発者が管理するバックエンドサーバー（API, DB, 認証サーバーなど）を新たに構築・依存するような機能追加は受け付けていません。

- **通信・ホスティング**: GitHub Pages / GitHub REST API など、ユーザー自身のリポジトリ・インフラ上で完結する設計を採用しています。
- **決済**: 既存のSaaS（Gumroad / Lemon Squeezy 等）に完全委任し、サーバーサイドでの検証ロジックを持ちません。

## 2. デスクトップ＆モバイル（両OS）対応必須

本プラグインは `isDesktopOnly: false` であり、**デスクトップ版とモバイル版（iOS/Android WebView環境）の両方で動作すること**が絶対の要件です。

- ❌ `fs`, `path`, `child_process` などの Node.js 組み込みモジュールの直接利用
- ❌ ブラウザの生の `fetch`（モバイルでの CORS 問題を避けるため）
- ✅ 通信には必ず Obsidian の `requestUrl()` API を使用してください。
- ✅ ファイル保存・永続化には `plugin.saveData()` / `loadData()` を使用してください。
- モバイルで動作しない機能を追加する場合は、機能を削るのではなく「モバイルではUI上で制約事項として明示する」アプローチを取ってください。

## 3. モノレポ構造と技術スタック

本リポジトリは `pnpm workspaces` を用いたモノレポ構成です。

- **`packages/obsidian-plugin`**: Obsidian プラグイン本体（TypeScript, esbuild）。起動時間に直結するため、過度な依存ライブラリの追加（特に React など）は禁止です。
- **`packages/web-dashboard-template`**: Webダッシュボードの静的アセット（React, Vite, Tailwind）。ビルド成果物はプラグイン側に埋め込まれます。
- **`packages/shared`**: 両者で共有する型定義（Zodスキーマ）。

## 4. プライバシーとセキュリティ（厳守）

- **データ送信**: ユーザーのノート内容やクリック履歴などを、プラグイン開発者側に送信するコードは絶対に含めないでください。
- **シークレット管理**: GitHub トークンなどは Vault 内のローカル設定に保存されます。ソースコード内にトークンや Client Secret をハードコードしないでください。

## 5. 有料機能のバイパス禁止

- 有料（Premium）機能のライセンス検証は、完全なオフライン（Ed25519 署名検証）で行われます。
- 開発者自身がテスト・利用する場合であっても、コード内に `if (isDeveloper) return true;` のような特別扱い（バイパス）を仕込むことは禁止です。必ず正規の検証パスを通過するようにしてください。

## 6. PR（Pull Request）提出時のチェックリスト

PR を提出する際は、以下の項目を満たしているか確認してください。

- [ ] **TypeCheck / Lint が通っているか**: `pnpm -r typecheck` を実行し、エラーがないこと。
- [ ] **ビルドが通るか**: `packages/obsidian-plugin` および `packages/web-dashboard-template` のビルドが成功すること。
- [ ] **モバイルで動作するか**: 追加した機能が Node.js API や `fetch` に依存しておらず、モバイル環境でクラッシュしないこと。
- [ ] **単一の関心事か**: 1つの PR に複数の無関係な機能追加やリファクタリングを含めないでください（1 PR = 1 Feature / Fix）。
- [ ] **Conventional Commits**: コミットメッセージに `feat:`, `fix:`, `chore:` などのプレフィックスを使用しているか。

以上をご確認の上、素晴らしいアイデアをお待ちしております！
