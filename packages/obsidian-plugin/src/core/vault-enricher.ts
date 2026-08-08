import { App, normalizePath } from "obsidian";
import type { NoteAggregate } from "@vault-insights/shared";
import { generateNoteId } from "./aggregator";

/**
 * Obsidian APIを利用して、Vault内のすべてのMarkdownファイルを走査し、
 * イベントログベースの NoteAggregate とマージする。
 *
 * これにより以下の問題が解決される:
 * 1. 一度も開かれていないノートがスナップショットに含まれない問題
 * 2. 未オープンのノートからタグが抽出されない問題
 * 3. プライバシーモードが過去にONだったことで(Hidden)になる問題の修復
 */
export function enrichAggregatesWithVaultFiles(
  app: App,
  baseAggregates: NoteAggregate[],
  privacyMode: boolean,
): NoteAggregate[] {
  // 1. 既存のイベントベース集計結果をMap化 (noteId -> NoteAggregate)
  const aggregateMap = new Map<string, NoteAggregate>();
  for (const agg of baseAggregates) {
    aggregateMap.set(agg.noteId, { ...agg }); // コピーを作成
  }

  // 2. Vault内の全Markdownファイルを取得
  const allFiles = app.vault.getMarkdownFiles();

  // 3. 全ファイルに対して情報を更新・補完
  const enrichedAggregates: NoteAggregate[] = [];

  for (const file of allFiles) {
    const vaultPath = normalizePath(file.path);
    const noteId = generateNoteId(vaultPath);
    const stat = file.stat;

    // プライバシーモード: trueなら空、falseなら実際のパス
    const finalNotePath = privacyMode ? "" : vaultPath;

    let agg = aggregateMap.get(noteId);
    if (!agg) {
      // イベントログに全く存在しない（未オープン）ノートの場合
      agg = {
        noteId,
        notePath: finalNotePath,
        openCount: 0,
        editCount: 0,
        lastOpened: 0,
        firstSeen: stat.ctime,
        tags: [],
        outgoingLinks: 0,
        incomingLinks: 0,
      };
    } else {
      // 既存のイベントがある場合でも、notePathを現在のprivacyModeに従って上書きする（(Hidden)問題の解決）
      agg.notePath = finalNotePath;
      
      // firstSeenが異常な場合、ファイルのctimeで補完
      if (agg.firstSeen === 0 || agg.firstSeen > stat.ctime) {
        agg.firstSeen = stat.ctime;
      }
      
      // マップから削除（後で残ったものを処理するため）
      aggregateMap.delete(noteId);
    }

    // --- メタデータの抽出 (タグとリンク) ---
    const cache = app.metadataCache.getFileCache(file);
    if (cache) {
      // Tags
      const tags = new Set<string>();
      if (cache.tags) {
        for (const t of cache.tags) {
          // # を除去して統一
          tags.add(t.tag.replace(/^#/, ""));
        }
      }
      if (cache.frontmatter && cache.frontmatter.tags) {
        const fmTags = cache.frontmatter.tags;
        if (Array.isArray(fmTags)) {
          fmTags.forEach((t) => tags.add(String(t).replace(/^#/, "")));
        } else if (typeof fmTags === "string") {
          fmTags.split(",").forEach((t) => tags.add(t.trim().replace(/^#/, "")));
        }
      }
      agg.tags = Array.from(tags);

      // Links
      if (cache.links) {
        // VaultInsightsの従来のイベントログベースのoutgoingLinksは「linkCreated」イベントに基づくが、
        // キャッシュを使うことでより正確な現在時点のリンク数を取得できる。
        agg.outgoingLinks = cache.links.length;
      }
    }

    enrichedAggregates.push(agg);
  }

  // 4. イベントログには存在するが、現在Vaultには存在しないファイル（削除されたノートなど）
  //    現状は残しておく（履歴として価値があるため）。ただしnotePathの再計算はできないのでそのまま。
  for (const [_, agg] of aggregateMap) {
    if (privacyMode) {
      agg.notePath = "";
    }
    enrichedAggregates.push(agg);
  }

  return enrichedAggregates;
}
