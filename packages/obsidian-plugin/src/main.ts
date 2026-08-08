import { Plugin, Notice } from "obsidian";
import { type NoteEvent, validateSnapshot } from "@vault-insights/shared";
import { VaultEventCollector } from "./obsidian-adapters/vault-events";
import { LocalStore, type VaultInsightsSettings } from "./storage/local-store";
import { VaultInsightsSettingTab } from "./settings-tab";
import { createVaultSnapshot } from "./core/snapshot-builder";
import { aggregateEvents } from "./core/aggregator";
import { enrichAggregatesWithVaultFiles } from "./core/vault-enricher";
import { SyncScheduler } from "./premium/sync-scheduler";

/**
 * Vault Insights プラグイン メインエントリーポイント
 *
 * AGENTS.md §0.5: Node組み込みモジュール (fs, path, child_process等) は使用禁止。
 * ネットワーク通信は requestUrl() を、永続化は saveData()/loadData() を使用すること。
 */
export default class VaultInsightsPlugin extends Plugin {
  private store!: LocalStore;
  private eventCollector!: VaultEventCollector;
  public syncScheduler!: SyncScheduler;

  async onload(): Promise<void> {
    // ストアの初期化
    this.store = new LocalStore(this);
    await this.store.load();

    // イベント収集の初期化
    this.eventCollector = new VaultEventCollector(
      this.app,
      (event: NoteEvent) => this.handleEvent(event),
      () => this.store.getSettings().privacyMode,
    );
    this.eventCollector.start();

    // 設定タブの登録
    this.addSettingTab(new VaultInsightsSettingTab(this.app, this));

    // Dashboard View の登録
    this.registerView(
      "vault-insights-dashboard",
      (leaf) => new (require("./views/dashboard-view").DashboardView)(leaf, this),
    );

    // リボンアイコンの追加
    this.addRibbonIcon("bar-chart-2", "Vault Insights", () => {
      this.activateDashboardView();
    });

    // コマンドパレットへの追加
    this.addCommand({
      id: "open-vault-insights-dashboard",
      name: "Open Dashboard",
      callback: () => {
        this.activateDashboardView();
      },
    });

    // ダッシュボードの登録などの後にコマンドパレットへの追加
    this.addCommand({
      id: "export-vault-insights-json",
      name: "Export snapshot as JSON",
      callback: () => {
        this.exportSnapshotAsJson();
      },
    });

    // 定期的にイベントログを保存する（5分間隔）
    this.registerInterval(
      window.setInterval(
        () => {
          void this.store.save();
        },
        5 * 60 * 1000,
      ),
    );

    // Sync Scheduler の初期化
    this.syncScheduler = new SyncScheduler(this);
    this.syncScheduler.start();

    console.log("Vault Insights: loaded");
  }

  async onunload(): Promise<void> {
    // 最終同期 (ベストエフォート)
    if (this.syncScheduler) {
      void this.syncScheduler.onUnload();
    }

    // イベント購読の停止
    this.eventCollector.stop();

    // 最終保存
    await this.store.forceSave();

    console.log("Vault Insights: unloaded");
  }

  // ---------------------------------------------------------------------------
  // View アクティベーション
  // ---------------------------------------------------------------------------

  async activateDashboardView() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType("vault-insights-dashboard")[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: "vault-insights-dashboard", active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  // ---------------------------------------------------------------------------
  // データアクセス（DashboardView 用）
  // ---------------------------------------------------------------------------

  getEvents(): readonly NoteEvent[] {
    return this.store.getEvents();
  }

  getStore(): LocalStore {
    return this.store;
  }

  // ---------------------------------------------------------------------------
  // 設定アクセス（settings-tab.ts から使用）
  // ---------------------------------------------------------------------------

  getSettings(): VaultInsightsSettings {
    return this.store.getSettings();
  }

  async updateSettings(partial: Partial<VaultInsightsSettings>): Promise<void> {
    await this.store.updateSettings(partial);
  }

  // ---------------------------------------------------------------------------
  // private
  // ---------------------------------------------------------------------------

  private handleEvent(event: NoteEvent): void {
    this.store.addEvent(event);
  }

  // ---------------------------------------------------------------------------
  // エクスポート処理
  // ---------------------------------------------------------------------------

  private async exportSnapshotAsJson(): Promise<void> {
    try {
      // 1. データの生成
      const events = this.store.getEvents();
      const baseNotes = aggregateEvents([...events]);
      const settings = this.store.getSettings();
      const enrichedNotes = enrichAggregatesWithVaultFiles(this.app, baseNotes, settings.privacyMode);
      const snapshot = createVaultSnapshot(settings.vaultId, enrichedNotes);

      // 2. Zodスキーマによる検証
      const validation = validateSnapshot(snapshot);
      if (!validation.success) {
        new Notice("Vault Insights: スナップショットの検証に失敗しました。");
        console.error("Vault Insights Snapshot Validation Error:", validation.error);
        return;
      }

      // 3. JSON文字列化 (インデント付き)
      const jsonStr = JSON.stringify(validation.data, null, 2);
      const fileName = "vault-insights-export.json";

      // 4. ObsidianのVault APIを使って保存 (デスクトップ・モバイル両対応)
      const abstractFile = this.app.vault.getAbstractFileByPath(fileName);
      if (abstractFile) {
        // 既存のファイルを上書き
        // @ts-ignore TFile は AbstractFile を継承しているためキャストなしでも動くが型エラー回避のため
        await this.app.vault.modify(abstractFile as any, jsonStr);
        new Notice(`Vault Insights: ${fileName} を更新しました。`);
      } else {
        // 新規作成
        await this.app.vault.create(fileName, jsonStr);
        new Notice(`Vault Insights: ${fileName} を作成しました。`);
      }
    } catch (error) {
      console.error("Vault Insights Export Error:", error);
      new Notice("Vault Insights: エクスポート中にエラーが発生しました。");
    }
  }
}
