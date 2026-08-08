/**
 * vault-events.ts — Obsidian APIイベントの購読アダプタ
 *
 * Obsidian の workspace/vault イベントを購読し NoteEvent を生成する。
 * Obsidian API への直接依存はこのファイルに閉じ込める（AGENTS.md §3）。
 *
 * AGENTS.md §0.5:
 *   - Node組み込みモジュール (fs, path 等) は使用しない
 *   - ファイルパスの正規化は Obsidian の normalizePath() を使用
 */
import { type App, type TFile, type EventRef, normalizePath } from "obsidian";
import type { NoteEvent } from "@vault-insights/shared";
import { generateNoteId } from "../core/aggregator";

/** イベント発生時のコールバック型 */
export type OnNoteEvent = (event: NoteEvent) => void;

/**
 * VaultEventCollector — Obsidian のワークスペース/ヴォールトイベントを購読し、
 * NoteEvent として外部に通知するアダプタ。
 */
export class VaultEventCollector {
  private readonly app: App;
  private readonly onEvent: OnNoteEvent;
  private readonly privacyMode: () => boolean;
  private eventRefs: EventRef[] = [];

  /**
   * @param app - Obsidian App インスタンス
   * @param onEvent - イベント発生時のコールバック
   * @param privacyMode - プライバシーモードが有効か否かを返す関数
   *                      （設定変更にリアルタイムで追従するために関数で受け取る）
   */
  constructor(app: App, onEvent: OnNoteEvent, privacyMode: () => boolean) {
    this.app = app;
    this.onEvent = onEvent;
    this.privacyMode = privacyMode;
  }

  /**
   * イベント購読を開始する。
   * プラグインの onload() で呼び出すこと。
   */
  start(): void {
    // ファイルが開かれたとき → "open" イベント
    const fileOpenRef = this.app.workspace.on("file-open", (file) => {
      if (!file || !this.isMarkdown(file)) return;
      this.emit(file, "open");
    });
    this.eventRefs.push(fileOpenRef);

    // ファイルが変更されたとき → "edit" イベント
    const modifyRef = this.app.vault.on("modify", (file) => {
      if (!this.isMarkdownFile(file)) return;
      this.emit(file as TFile, "edit");
    });
    this.eventRefs.push(modifyRef);
  }

  /**
   * イベント購読を停止する。
   * プラグインの onunload() で呼び出すこと。
   */
  stop(): void {
    for (const ref of this.eventRefs) {
      this.app.workspace.offref(ref);
    }
    this.eventRefs = [];
  }

  // ---------------------------------------------------------------------------
  // private
  // ---------------------------------------------------------------------------

  /** Markdownファイルかどうかを判定する */
  private isMarkdown(file: TFile): boolean {
    return file.extension === "md";
  }

  /** AbstractFile が TFile（Markdownファイル）かどうかを判定する */
  private isMarkdownFile(file: { path: string; name?: string }): boolean {
    return file.path.endsWith(".md");
  }

  /** NoteEvent を生成してコールバックに通知する */
  private emit(file: TFile, type: NoteEvent["type"]): void {
    const vaultPath = normalizePath(file.path);
    const noteId = generateNoteId(vaultPath);

    // プライバシーモードが有効な場合、notePath を記録しない
    const notePath = this.privacyMode() ? "" : vaultPath;

    const event: NoteEvent = {
      noteId,
      notePath,
      type,
      timestamp: Date.now(),
    };

    this.onEvent(event);
  }
}
