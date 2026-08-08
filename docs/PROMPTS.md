# PROMPTS.md — Antigravity実行プロンプト集

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
8. .github/workflows/ci.yml に、モバイル互換性の静的チェックとして
   `packages/obsidian-plugin` 配下で Node組み込みモジュール（fs, path, child_process等）や
   グローバル `fetch` の直接importを検出するESLintルール（`no-restricted-imports` /
   `no-restricted-globals`）を追加し、CIで機械的に弾けるようにする（AGENTS.md 0.5章）。

AGENTS.md 2章の技術スタック表から逸脱しないこと。
完了後、作成したファイル一覧と、各CIジョブが何を検証するかを簡潔に報告してください。
```

---

## Phase 1: 無料版 — イベント収集エンジン

```
docs/AGENTS.md と docs/BLUEPRINT.md（特に3章データモデル）を参照してください。

packages/shared に BLUEPRINT.md 3章のデータモデル（NoteEvent, NoteAggregate, VaultSnapshot,
VaultIndex）をZodスキーマとして実装し、対応するTypeScript型をZodから推論する形で export
してください（z.infer を使う）。

packages/obsidian-plugin に以下を実装してください。

1. src/obsidian-adapters/vault-events.ts
   - Obsidianの `workspace.on("file-open", ...)` や `vault.on("modify", ...)` を購読し、
     NoteEvent を生成するアダプタ。Obsidian APIへの直接依存はこのファイルに閉じ込める。
2. src/core/aggregator.ts
   - NoteEvent の配列（またはストリーム）から NoteAggregate を計算する純粋関数群。
     Obsidian APIに依存しないため、Vitestで単体テスト可能な設計にすること。
3. src/core/aggregator.test.ts
   - openCount, editCount, lastOpened の集計が正しいことを検証するテストを最低5ケース書く。
4. src/storage/local-store.ts
   - plugin.saveData() / loadData() をラップし、NoteEvent の永続化（イベントログ）と
     直近のVaultSnapshotキャッシュを保存する。イベントログは一定件数を超えたら
     古いものから間引く仕組みも入れる（無限に肥大化させない）。
5. プラグインの設定タブに「プライバシーモード」トグルを追加する
   （BLUEPRINT.md 3章: notePathを記録するか否か）。デフォルトはOFF（notePathを記録する）にし、
   設定画面で明確に説明文を出す。

完了後、`pnpm -r test` が通ることを確認し、テストカバレッジのサマリーを報告してください。
```

---

## Phase 2: 無料版 — Obsidian内ダッシュボード

```
docs/AGENTS.md と docs/BLUEPRINT.md を参照してください。Phase 1 の成果物（aggregator, local-store）
をベースに作業してください。

packages/obsidian-plugin に以下を実装してください。

1. src/views/dashboard-view.ts
   - Obsidianの ItemView を継承したカスタムビュー。左リボンアイコンとコマンドパレットから開けるようにする。
2. ダッシュボードの内容（Obsidian標準のDOM操作 or 軽量な描画で実装。Reactは持ち込まない
   — obsidian-plugin パッケージにReact依存を追加しないこと。AGENTS.md 2章のバンドルサイズ方針に従う）:
   - サマリーカード（総ノート数、総オープン数、総編集数）
   - 最多オープンノート トップ10（テーブル）
   - 未オープンノート一覧
   - タグ別集計（棒グラフ的な簡易表示。外部グラフライブラリは使わずCSSベースのバーで十分）
   - 検索ボックス（ノート名でフィルタ）・ソート切り替え
3. src/views/dashboard-view.test.ts
   - 描画ロジックのうち、DOM操作に依存しない部分（ソート・フィルタのロジック）を
     core/ 側に切り出してユニットテストする。

「無料版単体で完結した価値」を強く意識し、UXの手を抜かないこと（BLUEPRINT.md 4章の方針）。

完了後、スクリーンショット相当の説明（どの要素がどこに配置されるか）をテキストで報告してください。
```

---

## Phase 3: JSONエクスポート・スキーマ確定

```
docs/BLUEPRINT.md 3章を参照してください。

packages/obsidian-plugin に以下を実装してください。

1. src/core/snapshot-builder.ts
   - NoteAggregate配列からVaultSnapshot（BLUEPRINT.md 3章の形式、schemaVersion: 1）を
     生成する純粋関数。
2. コマンドパレットに「Vault Insights: Export snapshot as JSON」コマンドを追加し、
   vault内に `vault-insights-export.json` として書き出す（`app.vault.create`/`modify` を使い、
   OSのネイティブファイルダイアログには依存しない。この方式ならデスクトップ・モバイル両方で
   同じコードパスで動作する）。
3. packages/shared にエクスポートしたJSONを検証する validateSnapshot() 関数を実装し、
   obsidian-plugin と web-dashboard-template の両方から import して使う（AGENTS.md 1章の
   Single Source of Truth方針）。

このフェーズはPremium機能実装の土台になるため、スキーマの後方互換性
（将来 schemaVersion: 2 が来た場合の移行方針）についてコメントで方針を残してください。
```

---

## Phase 4: Web Dashboard Template（React + TS + Tailwind）

```
docs/BLUEPRINT.md 2章・7章を参照してください。packages/web-dashboard-template で作業してください。

これは静的サイトとしてユーザーのGitHub Pagesにデプロイされる想定のReactアプリです。
ビルド時ではなく**実行時に** `/vaults/index.json` と各 `/vaults/<vaultId>/snapshot.json` を
fetchしてレンダリングしてください（ビルド時埋め込みにすると自動同期の意味がなくなるため重要）。

実装内容:

1. TailwindCSSのセットアップ（デザインは frontend-design 的な、テンプレっぽくない意匠を意識。
   ダークモード対応、ダッシュボードらしい情報密度の高いレイアウト）。
2. src/hooks/useVaultData.ts — index.json とsnapshot.jsonのfetch・キャッシュ・エラーハンドリング。
3. src/components/ 以下に:
   - VaultSwitcher（複数ヴォールト切り替えタブ）
   - SummaryCards
   - TopNotesTable（ソート・ページネーション付き）
   - TagBreakdownChart（Rechartsで棒グラフ or 円グラフ）
   - ActivityHeatmap（GitHub風の年間ヒートマップ、日別オープン数を可視化）
   - SearchAndFilter（ノート名・タグでのフィルタ、期間フィルタ）
4. データが存在しない/取得失敗時のエンプティステート・エラーステートを丁寧に作る
   （BYOデプロイ直後は index.json が空の可能性があるため）。
5. レスポンシブ対応（スマホからも確認できるように）。

Recharts、packages/shared に加え、`lucide-react`（アイコン用途、named importでtree-shaking
必須、バレルインポート禁止）の利用を許可する。それ以外の重量級ライブラリ（UIキットなど）は
導入しないこと。ビルド後の成果物サイズを意識する（AGENTS.md 2章「パッケージ間でのバンドル
サイズ制約の違い」参照。この制約はweb-dashboard-templateには`obsidian-plugin`ほど厳格には
適用されないが、無制限ではないので、追加するライブラリは都度最小限にとどめること）。

なお、このダッシュボード自体はユーザーのブラウザ（PC/スマホ問わず）から閲覧される
静的サイトであり、Obsidianプラグイン本体とは実行環境が異なる。レスポンシブ対応（項目5）が
モバイルブラウザからの閲覧を担保する部分であり、Obsidianプラグインのモバイル対応
（AGENTS.md 0.5章）とは区別して考えること。

加えて、以下のビルド連携スクリプトを追加してください（Phase 5の埋め込み配布に必要）。

6. scripts/embed-dashboard-assets.mjs をルートに作成する。
   - `pnpm --filter web-dashboard-template build` の成果物（dist/以下）を、
     `packages/obsidian-plugin/src/premium/embedded-dashboard/` 配下に
     ファイル名→内容（base64 or UTF-8文字列）のマップとしてTypeScriptファイル
     （`dashboard-assets.generated.ts`）に書き出す。
   - このファイルは自動生成物なので `.gitignore` に含めるか、CIで生成する方針にする
     （どちらが適切かは判断してコメントで理由を残す）。
   - .github/workflows/ci.yml に、obsidian-pluginのビルド前に
     `web-dashboard-template` のビルド → `embed-dashboard-assets.mjs` 実行、を挟むステップを追加する。

これにより、モバイル端末上でVite/Node ビルドを一切実行せずに、
事前ビルド済みのダッシュボード一式をプラグインが配布・pushできるようになる
（BLUEPRINT.md 2章の制約）。

完了後、`pnpm --filter web-dashboard-template build` が通ることを確認し、
主要コンポーネントの一覧と役割を報告してください。
```

---

## Phase 5: GitHub Device Flow 認証 ＋ 自動デプロイ（Premium）

```
docs/BLUEPRINT.md 5章を必ず参照してください。これはPremium機能です。

packages/obsidian-plugin に以下を実装してください。

1. src/premium/github-device-auth.ts
   - GitHub Device Flow（`/login/device/code` → ユーザーコード表示 → ポーリングで
     `/login/oauth/access_token`）を実装。**すべてのHTTP通信は `requestUrl()` を使用し、
     生の`fetch`は使わない**（デスクトップ・モバイル両対応、AGENTS.md 0.5章）。
     Client Secretを一切使わないフローであることをコメントで明記する。
   - ユーザーコード表示モーダルに「コピー」ボタンを設置し、`navigator.clipboard.writeText`
     （両OSで動作）で認証コードをコピーできるようにする。
   - 認証URLを開く処理は `Platform.isMobileApp` で分岐し、モバイルでは外部ブラウザ起動後に
     Obsidianへ復帰するまでのタイムラグを考慮してポーリングのタイムアウトを
     デスクトップより長め（例: 最大10分）に設定する（BLUEPRINT.md 5章）。
2. src/premium/deploy-orchestrator.ts
   - 取得したトークンを使い、GitHub REST API（`requestUrl()`経由）で以下を自動実行:
     a. リポジトリ作成（既存なら再利用）
     b. Phase 4で生成した `dashboard-assets.generated.ts`（埋め込み済みビルド成果物）を
        Contents APIでpush。**この時点でVite/Node ビルドは一切実行しない**
        （モバイルで実行不可能なため。BLUEPRINT.md 2章）。
     c. GitHub Pages の有効化（Pages API, sourceを配信ブランチに設定）
     d. 初回スナップショット（Phase 3のsnapshot-builder出力）をpush
   - 各ステップの失敗をユーザーに分かりやすくフィードバックするエラーハンドリングを入れる
     （特にAPIレート制限、権限不足のケース）。
3. 設定タブに「Web版セットアップ」セクションを追加し、上記フローをワンクリックで開始できる
   UIを実装する（進捗ステップ表示: 認証中→リポジトリ作成中→デプロイ中→完了）。
   モバイルの狭い画面幅でも進捗ステップが視認できるレイアウトにする。
4. トークンの保存場所とリスクについて、AGENTS.md 5章の通りユーザーに明示同意させるモーダルを
   フロー開始前に表示する。

このフェーズはPremium限定機能なので、Phase 8で実装するライセンス検証と後で接続する前提で、
現時点では isPremiumUser() というスタブ関数（常にtrueを返す）越しに呼び出す設計にしておいてください。
```

---

## Phase 6: 定期自動push（バックグラウンド同期）

```
docs/BLUEPRINT.md 6章（限界の明記を含む）を参照してください。Premium機能です。

packages/obsidian-plugin に以下を実装してください。

1. src/premium/sync-scheduler.ts
   - Obsidianの `registerInterval` を使い、設定可能な間隔（デフォルト30分、最短5分）で
     snapshot-builder → deploy-orchestratorのpush処理を自動実行する。
   - Obsidian終了時（`onunload`）にも最終pushを試みる（ベストエフォート、失敗しても
     プラグインのアンロード自体はブロックしない）。
   - `Platform.isMobileApp` の場合は、インターバルタイマーへの依存を下げ、
     「アプリ起動時（`onload`）に同期」を主軸にした**オンデマンド同期**を優先する設計にする
     （BLUEPRINT.md 6章「モバイル固有の追加制約」を参照。OSにプロセスをサスペンドされるため
     インターバルタイマーが信頼できない）。
2. 設定タブに同期間隔の設定UIと、「最終同期日時」「次回同期予定」の表示を追加する。
   モバイルでは「次回同期予定」の代わりに「次回アプリ起動時に同期されます」といった、
   実態に即した文言に出し分ける。
3. 連続失敗（例: トークン失効、ネットワーク不通）が3回続いたら自動同期を一時停止し、
   ユーザーに通知（Notice）を出す設計にする（無限リトライでAPIを叩き続けない）。
4. README または設定画面の説明文に、BLUEPRINT.md 6章の限界
   （「Obsidianを閉じている間は同期されません。モバイルではさらにこの制約が強くなります」）を
   明記すること。誇大な表現を避ける。
```

---

## Phase 7: 複数ヴォールト統合表示

```
docs/BLUEPRINT.md 7章を参照してください。Premium機能です。

1. packages/obsidian-plugin: 設定タブで「このヴォールトの表示名（vaultId/label）」を
   ユーザーが設定できるようにし、deploy-orchestratorがpushする際に
   `/vaults/<vaultId>/snapshot.json` へ書き込み、`/vaults/index.json` を
   （他ヴォールトのエントリを壊さないよう read-modify-write で）更新するようにする。
2. packages/web-dashboard-template: Phase 4のVaultSwitcherが実データ（複数ヴォールト）で
   正しく切り替わることを確認し、必要ならUIを調整する。全ヴォールト横断のサマリービュー
   （合計ノート数、ヴォールト別の活動比較グラフ）も追加する。

複数のObsidianインスタンスから同時にpushされた場合のコンフリクト対策として、
Contents APIのSHA指定による楽観ロック（409エラー時は最新SHAを取得してリトライ）を
実装すること。
```

---

## Phase 8: ライセンス検証（オフライン署名）

```
docs/BLUEPRINT.md 8章を必ず参照してください。

1. packages/shared に license.ts を作成し、ed25519署名の検証ロジックを実装する
   （`@noble/ed25519` など**純粋なJS実装で、モバイルのWebView環境でも動作するライブラリ**を
   使用する。Node組み込み `crypto` はモバイルで使えないため不可、AGENTS.md 0.5章）。
   公開鍵はビルド時に埋め込む定数として実装する（秘密鍵はリポジトリに一切含めない、
   AGENTS.md 5章）。
2. ライセンスキーのフォーマットを定義する（例: base64エンコードされた
   `{payload: {issuedTo?, issuedAt, plan: "premium"}, signature}` 構造）。
3. packages/obsidian-plugin の設定タブにライセンスキー入力欄を追加し、
   保存時にオフライン検証を行い、成功したら isPremiumUser() を実際の検証結果に差し替える
   （Phase 5のスタブを置き換える）。この検証パスは一般ユーザー・開発者本人を問わず**完全に同一**
   であること（AGENTS.md 6章、開発者専用バイパスの禁止）。
4. 検証失敗時のエラーメッセージを分かりやすくする（キー形式不正／署名不一致を区別する）。
5. scripts/generate-license.ts を作成する（開発者がローカルで手動実行し、
   購入者向け・開発者自身向け問わずライセンスキーを生成するための簡易CLIスクリプト。
   リポジトリには含めるが、秘密鍵は環境変数から読む形にし、CIでは絶対に実行しない）。
   `--issued-to`, `--plan`, `--expires-at`（省略可）を引数に取れるようにし、
   開発者自身が無期限のPremiumキーを自分用に生成できることをREADMEコメントで明記する。

このフェーズの実装がAGENTS.md 6章「無料版は有料機能を無効化してもフル機能で動作し続ける」
「開発者自身の利用も一般ユーザーと同じ検証パスを通す」という制約を満たしているか、
最後に自己チェックして報告してください。
```

---

## Phase 9: 公開準備（ドキュメント・寄付導線・CI/CDリリース）

```
docs/BLUEPRINT.md 9〜10章を参照してください。

1. manifest.json に fundingUrl（GitHub Sponsors, Ko-fi）を設定する。
2. README.md を完成させる:
   - 機能一覧（無料/Premium表をBLUEPRINT.md 4章のまま転記）
   - スクリーンショット差し込み用のプレースホルダ
   - インストール方法（コミュニティディレクトリ版 / BRAT経由の開発版）
   - Premiumの購入方法・BYOデプロイの仕組みの説明（BLUEPRINT.md 6章の限界も含めて誠実に書く）
   - プライバシーポリシー（どのデータがどこに送られるか、送られないか）
3. .github/workflows/release.yml を作成する:
   - `main` へのタグpush (`v*`) をトリガーに、manifest.jsonのversionとの整合性を検証し、
     obsidian-plugin のビルド成果物（main.js, manifest.json, styles.css）を
     GitHub Releaseのアセットとして自動アップロードする
     （Obsidianコミュニティディレクトリ申請に必要な形式に準拠させる）。
4. CONTRIBUTING.md を作成し、AGENTS.md の要点（規約・PRチェックリスト）を
   人間のコントリビューター向けに要約する。

最後に、obsidian-releases リポジトリへのコミュニティプラグイン申請に必要な
チェックリスト（公式ドキュメント基準、`isDesktopOnly: false` を掲げる場合のモバイル動作検証
要件を含む）を洗い出し、不足している項目があれば報告してください。
```

---

## Phase 10: モバイル実機/シミュレータでの動作確認（追加フェーズ）

```
docs/AGENTS.md 0.5章、docs/BLUEPRINT.md 2.1章・5〜6章の「モバイル固有の追加制約」を
参照してください。

このフェーズはコード生成というより検証観点の洗い出しです。以下を実施してください。

1. これまでのPhase 0〜9の実装のうち、モバイル環境（iOS/Android のObsidianアプリ）で
   動作しない、または挙動が変わる可能性のある箇所を洗い出し、リストアップする
   （requestUrl以外の通信、plugin.saveData以外の永続化、Platform分岐漏れなど）。
2. 手動テストチェックリスト（docs/MOBILE_TESTING.md）を作成する。最低限含める項目:
   - モバイルでのプラグインインストール・有効化
   - Obsidian内ダッシュボードの表示崩れ確認（狭い画面幅）
   - Device Flow認証（外部ブラウザ起動→Obsidian復帰）の成功確認
   - 自動デプロイの成功確認
   - オンデマンド同期（アプリ起動時）の動作確認、バックグラウンド放置後の挙動確認
   - JSON手動エクスポートの動作確認
3. README.mdの「対応環境」セクションに、デスクトップ・モバイルそれぞれの動作保証範囲
   （特に自動同期の信頼性の差）を明記する。

コード変更が必要な箇所が見つかった場合は、該当Phaseの番号を明示した上で修正案を報告し、
実際の修正は別途指示があるまで行わないでください。
```
