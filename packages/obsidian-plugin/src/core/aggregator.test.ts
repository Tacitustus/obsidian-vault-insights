/**
 * aggregator.test.ts — aggregateEvents の単体テスト
 *
 * Obsidian APIに依存しない純粋関数のテスト。
 * openCount, editCount, lastOpened の集計が正しいことを検証する。
 */
import { describe, it, expect } from "vitest";
import { aggregateEvents, generateNoteId } from "./aggregator";
import type { NoteEvent } from "@vault-insights/shared";

// ---------------------------------------------------------------------------
// ヘルパー: テスト用イベントを簡潔に生成する
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<NoteEvent> & { noteId: string }): NoteEvent {
  return {
    notePath: overrides.notePath ?? `path/to/${overrides.noteId}.md`,
    type: overrides.type ?? "open",
    timestamp: overrides.timestamp ?? Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テストケース
// ---------------------------------------------------------------------------

describe("aggregateEvents", () => {
  it("空の配列を渡すと空配列を返す", () => {
    const result = aggregateEvents([]);
    expect(result).toEqual([]);
  });

  it("1つのノートの open イベント3回 → openCount=3", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-a", type: "open", timestamp: 1000 }),
      makeEvent({ noteId: "note-a", type: "open", timestamp: 2000 }),
      makeEvent({ noteId: "note-a", type: "open", timestamp: 3000 }),
    ];

    const result = aggregateEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.openCount).toBe(3);
    expect(result[0]!.editCount).toBe(0);
  });

  it("1つのノートの edit イベント4回 → editCount=4", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-b", type: "edit", timestamp: 1000 }),
      makeEvent({ noteId: "note-b", type: "edit", timestamp: 2000 }),
      makeEvent({ noteId: "note-b", type: "edit", timestamp: 3000 }),
      makeEvent({ noteId: "note-b", type: "edit", timestamp: 4000 }),
    ];

    const result = aggregateEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.editCount).toBe(4);
    expect(result[0]!.openCount).toBe(0);
  });

  it("open と edit が混在 → それぞれ正しくカウントされる", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-c", type: "open", timestamp: 1000 }),
      makeEvent({ noteId: "note-c", type: "edit", timestamp: 1500 }),
      makeEvent({ noteId: "note-c", type: "open", timestamp: 2000 }),
      makeEvent({ noteId: "note-c", type: "edit", timestamp: 2500 }),
      makeEvent({ noteId: "note-c", type: "edit", timestamp: 3000 }),
    ];

    const result = aggregateEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.openCount).toBe(2);
    expect(result[0]!.editCount).toBe(3);
  });

  it("lastOpened は最も新しい open イベントのタイムスタンプになる", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-d", type: "open", timestamp: 5000 }),
      makeEvent({ noteId: "note-d", type: "open", timestamp: 1000 }),
      makeEvent({ noteId: "note-d", type: "open", timestamp: 9000 }),
      makeEvent({ noteId: "note-d", type: "edit", timestamp: 10000 }), // edit は lastOpened に影響しない
      makeEvent({ noteId: "note-d", type: "open", timestamp: 3000 }),
    ];

    const result = aggregateEvents(events);
    expect(result[0]!.lastOpened).toBe(9000);
  });

  it("open イベントがないノート → lastOpened=0", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-e", type: "edit", timestamp: 5000 }),
      makeEvent({ noteId: "note-e", type: "edit", timestamp: 8000 }),
    ];

    const result = aggregateEvents(events);
    expect(result[0]!.lastOpened).toBe(0);
  });

  it("firstSeen は最も古いイベントのタイムスタンプになる", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-f", type: "open", timestamp: 3000 }),
      makeEvent({ noteId: "note-f", type: "edit", timestamp: 1000 }),
      makeEvent({ noteId: "note-f", type: "open", timestamp: 5000 }),
    ];

    const result = aggregateEvents(events);
    expect(result[0]!.firstSeen).toBe(1000);
  });

  it("複数ノートのイベントが混在 → ノートごとに正しく集計される", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "alpha", type: "open", timestamp: 1000 }),
      makeEvent({ noteId: "beta", type: "open", timestamp: 1100 }),
      makeEvent({ noteId: "alpha", type: "edit", timestamp: 2000 }),
      makeEvent({ noteId: "beta", type: "edit", timestamp: 2100 }),
      makeEvent({ noteId: "alpha", type: "open", timestamp: 3000 }),
      makeEvent({ noteId: "beta", type: "open", timestamp: 3100 }),
      makeEvent({ noteId: "beta", type: "edit", timestamp: 4000 }),
    ];

    const result = aggregateEvents(events);
    expect(result).toHaveLength(2);

    const alpha = result.find((a) => a.noteId === "alpha")!;
    const beta = result.find((a) => a.noteId === "beta")!;

    expect(alpha.openCount).toBe(2);
    expect(alpha.editCount).toBe(1);
    expect(alpha.lastOpened).toBe(3000);

    expect(beta.openCount).toBe(2);
    expect(beta.editCount).toBe(2);
    expect(beta.lastOpened).toBe(3100);
  });

  it("linkCreated イベント → outgoingLinks にカウントされる", () => {
    const events: NoteEvent[] = [
      makeEvent({ noteId: "note-g", type: "linkCreated", timestamp: 1000 }),
      makeEvent({ noteId: "note-g", type: "linkCreated", timestamp: 2000 }),
      makeEvent({ noteId: "note-g", type: "open", timestamp: 3000 }),
    ];

    const result = aggregateEvents(events);
    expect(result[0]!.outgoingLinks).toBe(2);
    expect(result[0]!.openCount).toBe(1);
  });
});

describe("generateNoteId", () => {
  it("同じパスに対して常に同じIDを返す（決定論的）", () => {
    const id1 = generateNoteId("folder/my-note.md");
    const id2 = generateNoteId("folder/my-note.md");
    expect(id1).toBe(id2);
  });

  it("異なるパスに対して異なるIDを返す", () => {
    const id1 = generateNoteId("folder/note-a.md");
    const id2 = generateNoteId("folder/note-b.md");
    expect(id1).not.toBe(id2);
  });
});
