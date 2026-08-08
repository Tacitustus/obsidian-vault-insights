/**
 * local-store.ts — plugin.saveData()/loadData() のラッパー
 *
 * NoteEvent のイベントログと VaultSnapshot キャッシュを永続化する。
 * AGENTS.md §0.5: 永続化は plugin.saveData()/loadData() のみ使用。
 * Node fs は使わない。
 */
import type { NoteEvent, VaultSnapshot } from "@vault-insights/shared";

/**
 * 簡易的なUUID生成（Fallback用）
 * この値はVaultの識別子として用いるのみであり、セキュリティ用途ではないため
 * crypto.randomUUID() が使用できない環境では暗号論的強度を持たない Math.random() にフォールバックする。
 */
function generateVaultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore
    }
  }
  // フォールバック: UUID v4ライクな文字列を Math.random() で生成
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** イベントログの最大保持件数。超過したら古いものから間引く */
const MAX_EVENT_LOG_SIZE = 10_000;

// ---------------------------------------------------------------------------
// 設定型
// ---------------------------------------------------------------------------

export interface VaultInsightsSettings {
  /** プライバシーモード: true の場合 notePath を記録しない (BLUEPRINT.md §3) */
  privacyMode: boolean;
  /** ヴォールトのエイリアス名 (表示名・ラベル) */
  vaultAlias: string;
  /** 一意の不変ヴォールトID (Phase 7) */
  vaultId: string;
  /** Premium License Key (Phase 8) */
  licenseKey: string;
  /** GitHub Access Token (Phase 5) */
  githubToken?: string;
  /** GitHub Repository Name for deployment (Phase 5) */
  githubRepoName: string;
  /** 自動同期を有効にするか (Phase 6) */
  syncEnabled: boolean;
  /** 同期する間隔（分単位、デフォルト30、最小5）(Phase 6) */
  syncIntervalMinutes: number;
  /** 表示言語: system, en, ja */
  language: string;
}

export const DEFAULT_SETTINGS: VaultInsightsSettings = {
  privacyMode: false,
  vaultAlias: "",
  vaultId: "", // 初期ロード時に自動生成される
  licenseKey: "",
  githubToken: undefined,
  githubRepoName: "vault-insights-dashboard",
  syncEnabled: false,
  syncIntervalMinutes: 30,
  language: "system",
};

// ---------------------------------------------------------------------------
// 永続化データ構造
// ---------------------------------------------------------------------------

export interface PluginData {
  settings: VaultInsightsSettings;
  eventLog: NoteEvent[];
  lastSnapshot: VaultSnapshot | null;
  lastSyncTime: number | null;
  consecutiveSyncFailures: number;
}

const DEFAULT_PLUGIN_DATA: PluginData = {
  settings: { ...DEFAULT_SETTINGS },
  eventLog: [],
  lastSnapshot: null,
  lastSyncTime: null,
  consecutiveSyncFailures: 0,
};

// ---------------------------------------------------------------------------
// SaveData / LoadData の抽象インターフェース
// ---------------------------------------------------------------------------

/**
 * Obsidian Plugin の saveData/loadData に相当するインターフェース。
 * テスト時にモックに差し替えられるようにする。
 */
export interface DataPersistence {
  loadData(): Promise<unknown>;
  saveData(data: unknown): Promise<void>;
}

// ---------------------------------------------------------------------------
// LocalStore
// ---------------------------------------------------------------------------

/**
 * プラグインデータの永続化マネージャ。
 * イベントログは一定件数を超えたら古いものから間引く。
 */
export class LocalStore {
  private data: PluginData = { ...DEFAULT_PLUGIN_DATA };
  private readonly persistence: DataPersistence;
  private dirty = false;

  constructor(persistence: DataPersistence) {
    this.persistence = persistence;
  }

  // ---------------------------------------------------------------------------
  // ライフサイクル
  // ---------------------------------------------------------------------------

  /** プラグイン起動時にデータを読み込む */
  async load(): Promise<void> {
    const raw = await this.persistence.loadData();
    if (raw && typeof raw === "object") {
      const loaded = raw as Partial<PluginData>;

      const mergedSettings = { ...DEFAULT_SETTINGS, ...loaded.settings };
      // 既存データに vaultId がない場合は自動生成する (UUIDv4)
      if (!mergedSettings.vaultId) {
        mergedSettings.vaultId = generateVaultId();
        this.dirty = true;
      }

      this.data = {
        settings: mergedSettings,
        eventLog: Array.isArray(loaded.eventLog) ? loaded.eventLog : [],
        lastSnapshot: loaded.lastSnapshot ?? null,
        lastSyncTime: loaded.lastSyncTime ?? null,
        consecutiveSyncFailures: loaded.consecutiveSyncFailures ?? 0,
      };
    } else {
      // 新規インストール時
      this.data.settings.vaultId = crypto.randomUUID();
      this.dirty = true;
    }

    // もしロード直後に dirty になっていれば保存する (初回等)
    if (this.dirty) {
      await this.save();
    }
  }

  /** 変更があればディスクに書き込む */
  async save(): Promise<void> {
    if (!this.dirty) return;
    await this.persistence.saveData(this.data);
    this.dirty = false;
  }

  /** 強制的にディスクに書き込む */
  async forceSave(): Promise<void> {
    this.dirty = true;
    await this.save();
  }

  // ---------------------------------------------------------------------------
  // 設定
  // ---------------------------------------------------------------------------

  getSettings(): VaultInsightsSettings {
    return { ...this.data.settings };
  }

  async updateSettings(partial: Partial<VaultInsightsSettings>): Promise<void> {
    this.data.settings = { ...this.data.settings, ...partial };
    this.dirty = true;
    await this.save();
  }

  // ---------------------------------------------------------------------------
  // イベントログ
  // ---------------------------------------------------------------------------

  /** イベントを追加する。MAX_EVENT_LOG_SIZE を超えたら古いものから削除 */
  addEvent(event: NoteEvent): void {
    this.data.eventLog.push(event);

    // 間引き: 最大件数を超えたら古いものを先頭から削除
    if (this.data.eventLog.length > MAX_EVENT_LOG_SIZE) {
      const excess = this.data.eventLog.length - MAX_EVENT_LOG_SIZE;
      this.data.eventLog.splice(0, excess);
    }

    this.dirty = true;
  }

  /** 現在のイベントログを取得する（読み取り専用コピー） */
  getEvents(): readonly NoteEvent[] {
    return this.data.eventLog;
  }

  /** イベントログの件数を取得する */
  getEventCount(): number {
    return this.data.eventLog.length;
  }

  // ---------------------------------------------------------------------------
  // スナップショットキャッシュ
  // ---------------------------------------------------------------------------

  /** 直近のスナップショットをキャッシュに保存する */
  async setSnapshot(snapshot: VaultSnapshot): Promise<void> {
    this.data.lastSnapshot = snapshot;
    this.dirty = true;
    await this.save();
  }

  /** キャッシュされたスナップショットを取得する */
  getSnapshot(): VaultSnapshot | null {
    return this.data.lastSnapshot;
  }

  // ---------------------------------------------------------------------------
  // Sync Status
  // ---------------------------------------------------------------------------

  getLastSyncTime(): number | null {
    return this.data.lastSyncTime;
  }

  getConsecutiveSyncFailures(): number {
    return this.data.consecutiveSyncFailures;
  }

  async recordSyncSuccess(): Promise<void> {
    this.data.lastSyncTime = Date.now();
    this.data.consecutiveSyncFailures = 0;
    this.dirty = true;
    await this.save();
  }

  async recordSyncFailure(): Promise<void> {
    this.data.consecutiveSyncFailures += 1;
    this.dirty = true;
    await this.save();
  }

  async resetSyncFailures(): Promise<void> {
    this.data.consecutiveSyncFailures = 0;
    this.dirty = true;
    await this.save();
  }
}
