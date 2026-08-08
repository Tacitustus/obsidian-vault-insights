/**
 * aggregator.ts — NoteEvent から NoteAggregate を計算する純粋関数群
 *
 * Obsidian APIに一切依存しないため、Vitestでの単体テストが容易。
 * AGENTS.md §3: ビジネスロジック（集計処理など）から直接APIを呼ばない。
 */
import type { NoteEvent, NoteAggregate } from "@vault-insights/shared";

// ---------------------------------------------------------------------------
// noteId 生成ユーティリティ（純粋関数）
// ---------------------------------------------------------------------------

/**
 * vault内相対パスから決定論的なnoteIdを生成する。
 * Node.js crypto は使えない（AGENTS.md §0.5）ため、軽量なFNV-1aハッシュを使用。
 */
export function generateNoteId(vaultPath: string): string {
  // FNV-1a 32bit ハッシュ
  let hash = 0x811c9dc5;
  for (let i = 0; i < vaultPath.length; i++) {
    hash ^= vaultPath.charCodeAt(i);
    // Math.imul は ES2015+ でデスクトップ・モバイル両対応
    hash = Math.imul(hash, 0x01000193);
  }
  // 符号なし32bitに変換して36進数文字列化
  return (hash >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// イベント集計
// ---------------------------------------------------------------------------

/**
 * NoteEvent 配列から NoteAggregate 配列を生成する。
 *
 * - openCount / editCount: 対応するイベント種別のカウント
 * - lastOpened: 最後の "open" イベントのタイムスタンプ（なければ 0）
 * - firstSeen: 最も古いイベントのタイムスタンプ
 * - outgoingLinks: "linkCreated" イベントのカウント
 * - tags / incomingLinks: この関数では算出できないため、デフォルト値を設定
 *   （後続フェーズで vault メタデータから補完する）
 */
export function aggregateEvents(events: NoteEvent[]): NoteAggregate[] {
  if (events.length === 0) return [];

  // noteId ごとにイベントをグループ化
  const grouped = new Map<
    string,
    {
      notePath: string;
      opens: number;
      edits: number;
      linkCreated: number;
      lastOpened: number;
      firstSeen: number;
    }
  >();

  for (const event of events) {
    let entry = grouped.get(event.noteId);
    if (!entry) {
      entry = {
        notePath: event.notePath,
        opens: 0,
        edits: 0,
        linkCreated: 0,
        lastOpened: 0,
        firstSeen: event.timestamp,
      };
      grouped.set(event.noteId, entry);
    }

    // notePath は最新のイベントのものを使用（リネーム対応）
    if (event.notePath) {
      entry.notePath = event.notePath;
    }

    switch (event.type) {
      case "open":
        entry.opens++;
        if (event.timestamp > entry.lastOpened) {
          entry.lastOpened = event.timestamp;
        }
        break;
      case "edit":
        entry.edits++;
        break;
      case "linkCreated":
        entry.linkCreated++;
        break;
    }

    if (event.timestamp < entry.firstSeen) {
      entry.firstSeen = event.timestamp;
    }
  }

  const aggregates: NoteAggregate[] = [];
  for (const [noteId, data] of grouped) {
    aggregates.push({
      noteId,
      notePath: data.notePath,
      openCount: data.opens,
      editCount: data.edits,
      lastOpened: data.lastOpened,
      firstSeen: data.firstSeen,
      tags: [], // vault メタデータから後続フェーズで補完
      outgoingLinks: data.linkCreated,
      incomingLinks: 0, // 相互参照解析で後続フェーズで補完
    });
  }

  return aggregates;
}


