/**
 * @vault-insights/shared
 *
 * プラグインとダッシュボードで共有する型定義・Zodスキーマ
 * BLUEPRINT.md 3章のデータモデルを Single Source of Truth として定義
 */
export {
  // Zodスキーマ
  NoteEventSchema,
  NoteAggregateSchema,
  VaultSnapshotSchema,
  VaultIndexSchema,
  VaultIndexEntrySchema,
  TotalsSchema,
  validateSnapshot,
} from "./schemas";

export * from "./license";

export type {
  // TypeScript型（z.inferで推論）
  NoteEvent,
  NoteAggregate,
  VaultSnapshot,
  VaultIndex,
  VaultIndexEntry,
  Totals,
} from "./schemas";
