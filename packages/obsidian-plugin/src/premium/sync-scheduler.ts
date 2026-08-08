import { Notice, Platform } from "obsidian";
import type VaultInsightsPlugin from "../main";
import { DeployOrchestrator } from "./deploy-orchestrator";
import { createVaultSnapshot } from "../core/snapshot-builder";
import { aggregateEvents } from "../core/aggregator";
import { isPremiumUser } from "./license";

export class SyncScheduler {
  private plugin: VaultInsightsPlugin;
  private intervalId: number | null = null;
  private isSyncing = false;

  constructor(plugin: VaultInsightsPlugin) {
    this.plugin = plugin;
  }

  start() {
    if (!isPremiumUser()) return;

    this.stop(); // Clear any existing intervals

    const settings = this.plugin.getSettings();
    if (!settings.syncEnabled || !settings.githubToken) {
      return;
    }

    const intervalMinutes = Math.max(5, settings.syncIntervalMinutes || 30);

    // モバイル環境特有の挙動
    if (Platform.isMobileApp) {
      // モバイルはOSによるサスペンドがあるため、起動時のオンデマンド同期を優先する
      this.runSync(true); // 起動時同期
      // 念のためインターバルも登録するが、アテにしすぎない
      this.intervalId = window.setInterval(
        () => {
          this.runSync(false);
        },
        intervalMinutes * 60 * 1000,
      );
    } else {
      // デスクトップ環境
      this.intervalId = window.setInterval(
        () => {
          this.runSync(false);
        },
        intervalMinutes * 60 * 1000,
      );
    }

    // プラグイン側に intervalId を登録してアンロード時に自動クリーンアップさせる
    if (this.intervalId !== null) {
      this.plugin.registerInterval(this.intervalId);
    }
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runSync(isStartup: boolean = false): Promise<void> {
    if (this.isSyncing) return;

    const store = this.plugin.getStore();
    const failures = store.getConsecutiveSyncFailures();

    if (failures >= 3) {
      // 連続失敗が3回に達した場合は一時停止
      this.stop();
      new Notice(
        "Vault Insights: 自動同期が連続して3回失敗したため、一時停止しました。設定から再開するか、手動で展開を試してください。",
      );
      return;
    }

    const settings = this.plugin.getSettings();
    if (!settings.syncEnabled || !settings.githubToken) {
      return;
    }

    this.isSyncing = true;

    try {
      if (isStartup) {
        console.log("Vault Insights: Starting on-demand sync (Mobile App Startup)");
      } else {
        console.log("Vault Insights: Starting scheduled sync");
      }

      // Generate snapshot
      const events = this.plugin.getEvents();
      const notes = aggregateEvents([...events]);
      const snapshot = createVaultSnapshot(settings.vaultId, notes);

      // Run lightweight push
      const orchestrator = new DeployOrchestrator(settings.githubToken);
      const label = settings.vaultAlias || this.plugin.app.vault.getName();
      await orchestrator.pushSnapshotOnly(
        settings.githubRepoName || "vault-insights-dashboard",
        snapshot,
        label,
      );

      // Record success
      await store.recordSyncSuccess();
    } catch (error: any) {
      console.error("Vault Insights Sync Error:", error);
      await store.recordSyncFailure();
    } finally {
      this.isSyncing = false;
    }
  }

  // 終了時のベストエフォートPush
  async onUnload(): Promise<void> {
    const settings = this.plugin.getSettings();
    const store = this.plugin.getStore();
    if (!settings.syncEnabled || !settings.githubToken) return;
    if (store.getConsecutiveSyncFailures() >= 3) return;

    try {
      console.log("Vault Insights: Attempting final sync on unload...");
      const events = this.plugin.getEvents();
      const notes = aggregateEvents([...events]);
      const snapshot = createVaultSnapshot(settings.vaultId, notes);

      const orchestrator = new DeployOrchestrator(settings.githubToken);
      // await しても環境によってはプロセス終了で中断される
      const label = settings.vaultAlias || this.plugin.app.vault.getName();
      await orchestrator.pushSnapshotOnly(
        settings.githubRepoName || "vault-insights-dashboard",
        snapshot,
        label,
      );
      console.log("Vault Insights: Final sync successful.");
    } catch (error) {
      console.error("Vault Insights: Final sync failed.", error);
    }
  }
}
