import { describe, it, expect } from "vitest";
import { createVaultSnapshot } from "./snapshot-builder";
import type { NoteAggregate } from "@vault-insights/shared";

function makeNote(overrides: Partial<NoteAggregate>): NoteAggregate {
  return {
    noteId: "x",
    notePath: "test.md",
    openCount: 0,
    editCount: 0,
    lastOpened: 0,
    firstSeen: 0,
    tags: [],
    outgoingLinks: 0,
    incomingLinks: 0,
    ...overrides,
  };
}

describe("createVaultSnapshot", () => {
  it("totals が notes の集計値と一致する", () => {
    const notes = [
      makeNote({ noteId: "x", openCount: 1, editCount: 1 }),
      makeNote({ noteId: "y", openCount: 2, editCount: 0 }),
    ];

    const snapshot = createVaultSnapshot("test-vault", notes);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.vaultId).toBe("test-vault");
    expect(snapshot.totals.noteCount).toBe(2);
    expect(snapshot.totals.totalOpens).toBe(3);
    expect(snapshot.totals.totalEdits).toBe(1);
  });
});
