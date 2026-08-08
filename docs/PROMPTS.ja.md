English | [日本語](./PROMPTS.ja.md)

---

# PROMPTS.md — Antigravity実行プロンプト集 (日本語版)

使い方: `AGENTS.md` と `BLUEPRINT.md` を先にプロジェクトルート（`docs/`推奨）に置いた上で、
各フェーズのプロンプトを**上から順に**、1フェーズずつAntigravityに投げてください。
一度に複数フェーズを投げると設計判断の一貫性が崩れやすいため非推奨です。

各プロンプトの冒頭にある「参照」は、Antigravityに読み込ませるべきファイルです。
Antigravityがファイルを自動探索しない場合は、プロンプト実行前に手動で当該ファイルを開いておいてください。

---

## Phase 0: リポジトリ scaffold・CI基盤

```
docs/AGENTS.md と docs/BLUEPRINT.md を読み込んだ上で作業してください。

以下の構成でpnpm workspaces monorepoをscaffoldしてください。

1. ルートに pnpm-workspace.yaml, tsconfig.base.json, .eslintrc.cjs, .prettierrc,
   .gitignore, .env.example を作成する。
2. packages/obsidian-plugin を Obsidianの公式サンプルプラグイン構成
   （esbuild.config.mjs, manifest.json, main.ts, styles.css）で初期化する。
   pluginId・pluginName は仮に "vault-insights" とする。
   manifest.json は `isDesktopOnly: false` に設定し、デスクトップ・モバイル両対応である
   ことを明示する（docs/AGENTS.md 0.5章参照）。以降の全フェーズで、Node組み込みAPI
   （fs, path, child_process等）や生の`fetch`を使わないことを徹底する。
3. packages/web-dashboard-template を Vite + React + TypeScript + TailwindCSS で初期化する。
4. packages/shared を作成し、tsupでビルドできるライブラリパッケージとして初期化する
   （中身はまだ空でよい）。
5. .github/workflows/ci.yml を作成し、以下を実行するようにする:
   - pnpm install (キャッシュ有効)
   - pnpm -r lint
   - pnpm -r typecheck
   - pnpm -r test
   - pnpm -r build
   - Node.jsは20系LTSを使用する。
6. .github/workflows/gitleaks.yml を作成し、pushとPR時にシークレット漏洩検知を行う
   （gitleaks-action を利用）。
7. README.md のひな形を作成する（プロジェクト概要、セットアップ手順、コントリビュート方法の
   見出しのみでよい。詳細は後続フェーズで埋める）。
```
