/**
 * settings-tab.ts — プラグイン設定タブ
 *
 * BLUEPRINT.md §3: 「プライバシーモード」トグルを提供する。
 * プライバシーモードONの場合、notePath を記録しない（noteId ハッシュのみで集計）。
 */
import { type App, PluginSettingTab, Setting, Notice, Platform } from "obsidian";
import type VaultInsightsPlugin from "./main";
import { isPremiumUser } from "./premium/license";
import { verifyLicense } from "@vault-insights/shared";
import { GITHUB_CLIENT_ID } from "./premium/constants";
import {
  ConsentModal,
  DeviceAuthModal,
  startDeviceFlow,
  pollForToken,
} from "./premium/github-device-auth";
import { DeployOrchestrator } from "./premium/deploy-orchestrator";
import { createVaultSnapshot } from "./core/snapshot-builder";
import { aggregateEvents } from "./core/aggregator";

export class VaultInsightsSettingTab extends PluginSettingTab {
  private readonly plugin: VaultInsightsPlugin;

  constructor(app: App, plugin: VaultInsightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Vault Insights 設定" });

    // ─── プライバシーモード ─────────────────────────
    new Setting(containerEl)
      .setName("プライバシーモード")
      .setDesc(
        "有効にすると、ノートのファイルパス（notePath）を記録しません。" +
          "ノートの識別にはハッシュ化されたID（noteId）のみが使用されます。" +
          "GitHub等に公開リポジトリとしてスナップショットをpushする場合、" +
          "プライバシーモードを有効にすることを推奨します。",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.getSettings().privacyMode).onChange(async (value) => {
          await this.plugin.updateSettings({ privacyMode: value });
        }),
      );

    // ─── ヴォールトエイリアス ─────────────────────────
    new Setting(containerEl)
      .setName("ヴォールト名（エイリアス）")
      .setDesc(
        "スナップショットやダッシュボードで表示されるヴォールト名です。" +
          "複数ヴォールトを区別するために設定してください（例: 「仕事用」「個人用」）。",
      )
      .addText((text) =>
        text
          .setPlaceholder("例: 仕事用")
          .setValue(this.plugin.getSettings().vaultAlias)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ vaultAlias: value });
          }),
      );

    // ─── ライセンス (License) ─────────────────
    containerEl.createEl("h2", { text: "Premium ライセンス" });

    let licenseStatusEl: HTMLElement;

    new Setting(containerEl)
      .setName("ライセンスキー")
      .setDesc("WebダッシュボードなどのPremium機能を利用するためのキーを入力してください。")
      .addTextArea((text) => {
        text.inputEl.rows = 3;
        text.inputEl.style.width = "100%";
        text.setValue(this.plugin.getSettings().licenseKey).onChange(async (value) => {
          await this.plugin.updateSettings({ licenseKey: value });
          const result = verifyLicense(value);

          if (result.valid) {
            licenseStatusEl.setText("✅ ライセンスが有効です");
            licenseStatusEl.style.color = "var(--text-success)";
            new Notice("Vault Insights: ライセンスが有効です。Premium機能が解放されました。");
            this.display(); // Premium UIを描画するため再ロード
          } else {
            licenseStatusEl.setText(`❌ 無効なライセンス: ${result.error}`);
            licenseStatusEl.style.color = "var(--text-error)";
          }
        });
      });

    licenseStatusEl = containerEl.createEl("div", {
      text: "",
      attr: { style: "font-weight: bold; margin-bottom: 20px; font-size: 0.9em;" },
    });

    const currentLicense = this.plugin.getSettings().licenseKey;
    if (currentLicense) {
      const initResult = verifyLicense(currentLicense);
      if (initResult.valid) {
        licenseStatusEl.setText("✅ ライセンスが有効です");
        licenseStatusEl.style.color = "var(--text-success)";
      } else {
        licenseStatusEl.setText(`❌ 無効なライセンス: ${initResult.error}`);
        licenseStatusEl.style.color = "var(--text-error)";
      }
    }

    // ─── Web版セットアップ (Premium) ─────────────────
    const premiumUnlocked = isPremiumUser(currentLicense);

    containerEl.createEl("h2", { text: "Webダッシュボード連携 (Premium)" });

    if (!premiumUnlocked) {
      containerEl.createEl("p", {
        text: "この機能を利用するには有効なライセンスキーが必要です。",
        cls: "mod-warning",
        attr: { style: "color: var(--text-muted); font-style: italic;" },
      });
      return; // ライセンスがなければ以下のUIを描画しない
    }

    containerEl.createEl("p", {
      text: "GitHub Pagesを用いて、自動更新されるWebダッシュボードをホストします。",
    });

    new Setting(containerEl)
      .setName("GitHub リポジトリ名")
      .setDesc("Webダッシュボードを展開するリポジトリ名です。")
      .addText((text) =>
        text
          .setPlaceholder("vault-insights-dashboard")
          .setValue(this.plugin.getSettings().githubRepoName)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ githubRepoName: value });
          }),
      );

    const hasToken = !!this.plugin.getSettings().githubToken;

    const deploySetting = new Setting(containerEl)
      .setName(hasToken ? "GitHub 連携済み" : "GitHub と連携する")
      .setDesc(
        hasToken
          ? "連携済みです。リポジトリにダッシュボードを展開します。"
          : "Device Flow を使って認証し、Webダッシュボードを自動展開します。",
      );

    if (!hasToken) {
      deploySetting.addButton((btn) =>
        btn
          .setButtonText("連携して展開を開始")
          .setCta()
          .onClick(() => {
            new ConsentModal(this.app, () => {
              this.startDeviceAuthFlow();
            }).open();
          }),
      );
    } else {
      deploySetting
        .addButton((btn) =>
          btn
            .setButtonText("ダッシュボードを展開/更新")
            .setCta()
            .onClick(() => {
              this.runDeployOrchestrator();
            }),
        )
        .addButton((btn) =>
          btn.setButtonText("連携解除").onClick(async () => {
            await this.plugin.updateSettings({ githubToken: undefined });
            this.plugin.syncScheduler.stop();
            this.display(); // 再描画
          }),
        );

      // ─── 自動同期 (Sync) ─────────────────
      containerEl.createEl("h4", { text: "自動同期 (Auto Sync)" });

      containerEl.createEl("p", {
        text: "※ Obsidianを閉じている間は同期されません。モバイルではさらにこの制約が強くなります。",
        cls: "mod-warning",
        attr: { style: "color: var(--text-muted); font-size: 0.9em; margin-bottom: 15px;" },
      });

      new Setting(containerEl)
        .setName("バックグラウンド同期")
        .setDesc("定期的にスナップショットをGitHubへ自動プッシュします。")
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.getSettings().syncEnabled).onChange(async (value) => {
            await this.plugin.updateSettings({ syncEnabled: value });
            if (value) {
              this.plugin.syncScheduler.start();
            } else {
              this.plugin.syncScheduler.stop();
            }
            this.display();
          }),
        );

      if (this.plugin.getSettings().syncEnabled) {
        new Setting(containerEl)
          .setName("同期間隔 (分)")
          .setDesc("最短5分から設定可能。")
          .addText((text) => {
            text.inputEl.type = "number";
            text.inputEl.min = "5";
            text
              .setValue(String(this.plugin.getSettings().syncIntervalMinutes))
              .onChange(async (value) => {
                const minutes = Math.max(5, parseInt(value, 10) || 30);
                await this.plugin.updateSettings({ syncIntervalMinutes: minutes });
                this.plugin.syncScheduler.start(); // 再起動して新しい間隔を適用
              });
          });

        const store = this.plugin.getStore();
        const lastSync = store.getLastSyncTime();
        const failures = store.getConsecutiveSyncFailures();

        let lastSyncText = "未実行";
        if (lastSync) {
          lastSyncText = new Date(lastSync).toLocaleString();
          if (failures > 0) {
            lastSyncText += ` (連続失敗: ${failures}回)`;
          }
        }

        let nextSyncText = "未定";
        if (failures >= 3) {
          nextSyncText = "失敗回数上限のため停止中";
        } else if (Platform.isMobileApp) {
          nextSyncText = "次回アプリ起動時に同期されます";
        } else {
          const intervalMs = this.plugin.getSettings().syncIntervalMinutes * 60 * 1000;
          const nextSyncTime = (lastSync || Date.now()) + intervalMs;
          nextSyncText = new Date(nextSyncTime).toLocaleString();
        }

        new Setting(containerEl).setName("最終同期日時").setDesc(lastSyncText);

        new Setting(containerEl).setName("次回同期予定").setDesc(nextSyncText);

        if (failures >= 3) {
          new Setting(containerEl)
            .setName("同期再開")
            .setDesc("エラーカウントをリセットし、自動同期を再開します。")
            .addButton((btn) =>
              btn
                .setButtonText("リセット")
                .setCta()
                .onClick(async () => {
                  await store.resetSyncFailures();
                  this.plugin.syncScheduler.start();
                  this.display();
                }),
            );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 連携・デプロイ処理
  // ---------------------------------------------------------------------------

  private async startDeviceAuthFlow() {
    try {
      new Notice("Vault Insights: 認証を開始しています...");
      const authInfo = await startDeviceFlow(GITHUB_CLIENT_ID);

      const modal = new DeviceAuthModal(
        this.app,
        authInfo.user_code,
        authInfo.verification_uri,
        async (token) => {
          await this.plugin.updateSettings({ githubToken: token });
          new Notice("Vault Insights: GitHub 認証に成功しました！");
          this.display(); // 設定タブを再描画

          // そのままデプロイへ進む
          this.runDeployOrchestrator();
        },
        () => {
          new Notice("Vault Insights: 認証がキャンセルされました。");
        },
      );

      modal.open();

      // 非同期でトークンをポーリング
      const token = await pollForToken(
        GITHUB_CLIENT_ID,
        authInfo.device_code,
        authInfo.interval,
        Platform.isMobileApp,
      );

      modal.complete(token);
    } catch (error: any) {
      console.error(error);
      new Notice(`Vault Insights: 認証エラーが発生しました - ${error.message}`);
    }
  }

  private async runDeployOrchestrator() {
    const settings = this.plugin.getSettings();
    if (!settings.githubToken) {
      new Notice("Vault Insights: GitHubトークンがありません。先に連携してください。");
      return;
    }

    try {
      // 現在のデータを集計してスナップショットを作成
      const events = this.plugin.getEvents();
      const notes = aggregateEvents([...events]);
      const snapshot = createVaultSnapshot(settings.vaultId, notes);

      const orchestrator = new DeployOrchestrator(settings.githubToken);
      const label = settings.vaultAlias || this.app.vault.getName();
      await orchestrator.runDeployment(
        settings.githubRepoName || "vault-insights-dashboard",
        snapshot,
        label,
      );
    } catch (error: any) {
      console.error(error);
      new Notice(`Vault Insights: デプロイ準備に失敗しました - ${error.message}`);
    }
  }
}
