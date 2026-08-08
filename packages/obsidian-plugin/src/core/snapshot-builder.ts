/**
 * snapshot-builder.ts
 *
 * NoteAggregate配列からVaultSnapshotを生成する純粋関数。
 */
import type { NoteAggregate, VaultSnapshot } from "@vault-insights/shared";

/**
 * NoteAggregate 配列から VaultSnapshot を生成する。
 *
 * 【スキーマの後方互換性について】
 * 現在は schemaVersion: 1 として生成する。将来のマイグレーションが発生した場合でも、
 * obsidian-plugin は常に最新のスキーマバージョンでスナップショットを「生成」し上書きするため、
 * 生成側での複雑なマイグレーションロジックは不要（読み込み側である validateSnapshot や
 * Webダッシュボード側でマイグレーションを担う）。
 */
export function createVaultSnapshot(vaultId: string, notes: NoteAggregate[]): VaultSnapshot {
  const totalOpens = notes.reduce((sum, n) => sum + n.openCount, 0);
  const totalEdits = notes.reduce((sum, n) => sum + n.editCount, 0);

  return {
    schemaVersion: 1,
    vaultId,
    generatedAt: Date.now(),
    notes,
    totals: {
      noteCount: notes.length,
      totalOpens,
      totalEdits,
    },
  };
}
