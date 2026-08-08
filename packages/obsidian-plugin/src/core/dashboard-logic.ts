import type { NoteAggregate } from "@vault-insights/shared";

export type SortField = "openCount" | "editCount" | "lastOpened" | "notePath";
export type SortOrder = "asc" | "desc";

export interface FilterOptions {
  searchQuery: string;
}

/**
 * ノートリストを検索クエリでフィルタし、指定のフィールド・順序でソートする純粋関数
 */
export function filterAndSortNotes(
  notes: NoteAggregate[],
  filter: FilterOptions,
  sortField: SortField,
  sortOrder: SortOrder,
): NoteAggregate[] {
  let result = [...notes];

  // フィルタ
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    result = result.filter((n) => n.notePath.toLowerCase().includes(query));
  }

  // ソート
  result.sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }
  });

  return result;
}

/**
 * オープン回数が多い順にトップN件を取得する
 */
export function getTopOpenedNotes(notes: NoteAggregate[], limit: number = 10): NoteAggregate[] {
  return [...notes]
    .filter((n) => n.openCount > 0)
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, limit);
}

/**
 * 一度も開かれていないノートを取得する（作成されただけのノートなど）
 */
export function getUnopenedNotes(notes: NoteAggregate[]): NoteAggregate[] {
  return notes.filter((n) => n.openCount === 0);
}

/**
 * タグの出現回数を集計し、降順にソートして返す
 */
export function getTagCounts(
  notes: NoteAggregate[],
): { tag: string; count: number; maxCount: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const result = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = result.length > 0 ? result[0]!.count : 1;

  return result.map((item) => ({
    ...item,
    maxCount, // CSSバーのパーセンテージ計算用
  }));
}
