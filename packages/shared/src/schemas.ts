/**
 * BLUEPRINT.md 3章 データモデル — Zodスキーマ定義
 *
 * このファイルがJSONエクスポート形式の Single Source of Truth。
 * TypeScript型は z.infer<> で推論し、手書きの型定義と乖離しないことを保証する。
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// NoteEvent — 個別のユーザー操作イベント
// ---------------------------------------------------------------------------

export const NoteEventSchema = z.object({
  /** vault内相対パスのハッシュ（プライバシー配慮でファイル名を伏せる用途） */
  noteId: z.string(),
  /** 表示用パス（プライバシーモードON時は空文字列になる） */
  notePath: z.string(),
  /** イベント種別 */
  type: z.enum(["open", "edit", "linkCreated"]),
  /** unix epoch (ms) */
  timestamp: z.number(),
});

export type NoteEvent = z.infer<typeof NoteEventSchema>;

// ---------------------------------------------------------------------------
// NoteAggregate — ノート単位の集計結果
// ---------------------------------------------------------------------------

export const NoteAggregateSchema = z.object({
  noteId: z.string(),
  notePath: z.string(),
  openCount: z.number().int().nonnegative(),
  editCount: z.number().int().nonnegative(),
  /** 最後に開いた日時 (unix epoch ms)。一度も開かれていなければ 0 */
  lastOpened: z.number(),
  /** 最初に観測された日時 (unix epoch ms) */
  firstSeen: z.number(),
  tags: z.array(z.string()),
  outgoingLinks: z.number().int().nonnegative(),
  incomingLinks: z.number().int().nonnegative(),
});

export type NoteAggregate = z.infer<typeof NoteAggregateSchema>;

// ---------------------------------------------------------------------------
// VaultSnapshot — ヴォールト全体のスナップショット
// ---------------------------------------------------------------------------

export const TotalsSchema = z.object({
  noteCount: z.number().int().nonnegative(),
  totalOpens: z.number().int().nonnegative(),
  totalEdits: z.number().int().nonnegative(),
});

export type Totals = z.infer<typeof TotalsSchema>;

export const VaultSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  /** ユーザーが設定するヴォールトエイリアス（例: "仕事用", "個人用"） */
  vaultId: z.string(),
  /** 生成日時 (unix epoch ms) */
  generatedAt: z.number(),
  notes: z.array(NoteAggregateSchema),
  totals: TotalsSchema,
});

export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;

// ---------------------------------------------------------------------------
// VaultIndex — 複数ヴォールトの一覧（Webダッシュボード用）
// ---------------------------------------------------------------------------

export const VaultIndexEntrySchema = z.object({
  vaultId: z.string(),
  snapshotPath: z.string(),
  label: z.string(),
});

export type VaultIndexEntry = z.infer<typeof VaultIndexEntrySchema>;

export const VaultIndexSchema = z.object({
  schemaVersion: z.literal(1),
  vaults: z.array(VaultIndexEntrySchema),
});

export type VaultIndex = z.infer<typeof VaultIndexSchema>;

// ---------------------------------------------------------------------------
// 検証・マイグレーション用関数
// ---------------------------------------------------------------------------

/**
 * 未知のJSONデータをパースし、現在のVaultSnapshotスキーマに合致するか検証する。
 *
 * 【スキーマの後方互換性・マイグレーション方針】
 * 将来 schemaVersion: 2 が導入された場合、ここで生JSONの `schemaVersion` を判定し、
 * 古いバージョンであればv2の形式にアップグレード（マイグレーション）してから
 * v2のZodスキーマでパースする設計とする。
 * 
 * 例:
 * if (rawData && typeof rawData === "object" && rawData.schemaVersion === 1) {
 *   rawData = migrateV1toV2(rawData);
 * }
 * return VaultSnapshotSchema_v2.safeParse(rawData);
 */
export function validateSnapshot(data: unknown) {
  return VaultSnapshotSchema.safeParse(data);
}
