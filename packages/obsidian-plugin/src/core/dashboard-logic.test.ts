import { describe, it, expect } from "vitest";
import {
  filterAndSortNotes,
  getTopOpenedNotes,
  getUnopenedNotes,
  getTagCounts,
} from "./dashboard-logic";
import type { NoteAggregate } from "@vault-insights/shared";

function createMockNote(overrides: Partial<NoteAggregate>): NoteAggregate {
  return {
    noteId: overrides.noteId ?? "test-id",
    notePath: overrides.notePath ?? "test.md",
    openCount: overrides.openCount ?? 0,
    editCount: overrides.editCount ?? 0,
    lastOpened: overrides.lastOpened ?? 0,
    firstSeen: overrides.firstSeen ?? 0,
    tags: overrides.tags ?? [],
    outgoingLinks: overrides.outgoingLinks ?? 0,
    incomingLinks: overrides.incomingLinks ?? 0,
  };
}

describe("Dashboard Logic", () => {
  const notes: NoteAggregate[] = [
    createMockNote({ notePath: "Project A.md", openCount: 10, editCount: 2 }),
    createMockNote({ notePath: "Project B.md", openCount: 5, editCount: 5 }),
    createMockNote({ notePath: "Daily/2026-08-01.md", openCount: 0, editCount: 1 }),
    createMockNote({ notePath: "Daily/2026-08-02.md", openCount: 0, editCount: 0 }),
    createMockNote({ notePath: "Meeting.md", openCount: 20, editCount: 0 }),
  ];

  describe("filterAndSortNotes", () => {
    it("searchQueryでノートパスを部分一致検索できる (大文字小文字区別なし)", () => {
      const result = filterAndSortNotes(
        notes,
        { searchQuery: "project" },
        "openCount",
        "desc"
      );
      expect(result).toHaveLength(2);
      expect(result[0]!.notePath).toBe("Project A.md");
      expect(result[1]!.notePath).toBe("Project B.md");
    });

    it("数値フィールドで正しくソートされる", () => {
      const result = filterAndSortNotes(notes, { searchQuery: "" }, "openCount", "asc");
      expect(result[0]!.openCount).toBe(0);
      expect(result[result.length - 1]!.openCount).toBe(20);
    });

    it("文字列フィールドで正しくソートされる", () => {
      const result = filterAndSortNotes(notes, { searchQuery: "" }, "notePath", "asc");
      expect(result[0]!.notePath).toBe("Daily/2026-08-01.md"); // D comes first
    });
  });

  describe("getTopOpenedNotes", () => {
    it("openCount が0より大きいものだけを降順で指定件数返す", () => {
      const result = getTopOpenedNotes(notes, 2);
      expect(result).toHaveLength(2);
      expect(result[0]!.notePath).toBe("Meeting.md");
      expect(result[1]!.notePath).toBe("Project A.md");
    });
  });

  describe("getUnopenedNotes", () => {
    it("openCount が0のノートだけを返す", () => {
      const result = getUnopenedNotes(notes);
      expect(result).toHaveLength(2);
      expect(result.map(n => n.notePath)).toContain("Daily/2026-08-01.md");
    });
  });

  describe("getTagCounts", () => {
    it("タグの出現回数を集計し、maxCountを含めて降順で返す", () => {
      const notesWithTags = [
        createMockNote({ tags: ["#dev", "#obsidian"] }),
        createMockNote({ tags: ["#dev", "#typescript"] }),
        createMockNote({ tags: ["#obsidian"] }),
        createMockNote({ tags: ["#dev"] }),
      ];

      const result = getTagCounts(notesWithTags);
      expect(result).toHaveLength(3);
      expect(result[0]!.tag).toBe("#dev");
      expect(result[0]!.count).toBe(3);
      expect(result[0]!.maxCount).toBe(3); // dev is max
      
      const obsidian = result.find(t => t.tag === "#obsidian")!;
      expect(obsidian.count).toBe(2);
      expect(obsidian.maxCount).toBe(3);
    });
  });
});
