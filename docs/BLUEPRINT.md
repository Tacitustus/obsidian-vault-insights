English | [日本語](./BLUEPRINT.ja.md)

---

# BLUEPRINT.md — Obsidian Vault Insights Specification & Architecture Blueprint

## 1. Vision

An analytics plugin for Obsidian that visualizes vault usage metrics (note views, edit frequencies, link topology, and tag usage).

- **Free Version**: Runs fully inside Obsidian.
- **Premium Version (Bring Your Own Deployment)**: Automatically deploys a polished Web Dashboard to the user's own GitHub account, accessible from any browser across devices and vaults.

**Non-Goals**: Real-time collaborative editing, team features, or developer-operated cloud backends.

## 2. System Architecture

**Platform Policy**: This plugin explicitly targets **both Desktop (Electron/Node) and Mobile (iOS/Android WebView)** (`isDesktopOnly: false`).
Design constraints:

- Network requests use Obsidian's `requestUrl()` API (never raw `fetch`).
- Persistence via `plugin.saveData()/loadData()` only (vault JSON).
- `web-dashboard-template` assets are **pre-built and embedded into `obsidian-plugin` at developer build / CI time**. Node/Vite build steps are never executed at runtime on mobile devices.

```
┌──────────────────────────────────────────────┐
│ Obsidian Plugin                              │
│  (Desktop: Electron/Node / Mobile: WebView)  │
│  - Collect local events (open/edit/link/tag) │
│  - Compute aggregates & snapshots (JSON)     │
│  - In-Obsidian Dashboard (Free)              │
│  - [Premium] GitHub Device Flow Auth         │
│  - [Premium] GitHub Contents API Push        │
└──────────────────────┬───────────────────────┘
                       │ Commit & push JSON snapshots
                       ▼
┌──────────────────────────────────────────────┐
│ User's Own GitHub Repository                 │
│  - /vaults/<vaultId>/snapshot.json           │
│  - /vaults/index.json (Multi-vault index)    │
│  - Deployed static web-dashboard-template    │
└──────────────────────┬───────────────────────┘
                       │ GitHub Pages / Cloudflare Pages
                       ▼
┌──────────────────────────────────────────────┐
│ Static Web Dashboard (React + TS + Tailwind)  │
│  - Fetches JSON snapshots at runtime         │
│  - Interactive charts, filters, & vault switch│
└──────────────────────────────────────────────┘
```

The core architecture principle: **Zero developer-hosted infrastructure or backend servers.**

## 2.1 Developer Premium Usage

Developers using Premium features do not use bypass code paths. Developer licenses are generated locally using `scripts/generate-license.ts` and pasted into standard setting fields (see AGENTS.md Section 6).

## 3. Data Models (`packages/shared` Zod Schemas)

```ts
type NoteEvent = {
  noteId: string; // Hashed relative path (optional privacy mode)
  notePath: string; // Display path
  type: "open" | "edit" | "linkCreated";
  timestamp: number; // Unix epoch (ms)
};

type NoteAggregate = {
  noteId: string;
  notePath: string;
  openCount: number;
  editCount: number;
  lastOpened: number;
  firstSeen: number;
  tags: string[];
  outgoingLinks: number;
  incomingLinks: number;
};

type VaultSnapshot = {
  schemaVersion: 1;
  vaultId: string; // User-configured alias
  generatedAt: number;
  notes: NoteAggregate[];
  totals: {
    noteCount: number;
    totalOpens: number;
    totalEdits: number;
  };
};

type VaultIndex = {
  schemaVersion: 1;
  vaults: { vaultId: string; snapshotPath: string; label: string }[];
};
```

## 4. Feature Matrix (Free vs Premium)

| Feature                                  | Free                 | Premium      |
| ---------------------------------------- | -------------------- | ------------ |
| Aggregation (clicks, edits, links, tags) | ✅                   | ✅           |
| In-Obsidian Dashboard                    | ✅ Full              | ✅           |
| Manual JSON Export                       | ✅                   | ✅           |
| GitHub Device Flow Auth                  | ❌                   | ✅           |
| Auto-Deployment (Pages setup)            | ❌                   | ✅           |
| Background Auto-Push                     | ❌                   | ✅           |
| Hosted Web Dashboard Template            | ❌ (Manual hostable) | ✅ Pre-built |
| Multi-Vault View                         | ❌                   | ✅           |

**Platform Compatibility Table**

| Feature                             | Desktop             | Mobile                                        |
| ----------------------------------- | ------------------- | --------------------------------------------- |
| Event Collection & In-App Dashboard | ✅                  | ✅                                            |
| Manual JSON Export                  | ✅                  | ✅ (Native share/save dialog)                 |
| GitHub Device Flow Auth             | ✅                  | ✅ (Browser launch + return hook)             |
| Auto-Deployment                     | ✅                  | ✅                                            |
| Automated Background Push           | ✅ (While app runs) | ⚠️ (On-demand primary, subject to OS suspend) |

## 5. BYO Setup Flow (GitHub Device Flow)

1. Plugin invokes `POST https://github.com/login/device/code` via `requestUrl()`.
2. Modal presents user verification code and copy button.
3. User opens browser and approves app.
4. Plugin polls `POST https://github.com/login/oauth/access_token` via `requestUrl()`.
5. Access token stored locally in vault settings.
6. Automatic deployment creates repository, pushes pre-built dashboard assets, enables GitHub Pages, and pushes initial snapshot.

## 6. Automated Sync Limitations

- Sync executes **only while Obsidian is active**.
- On mobile devices, process suspension makes interval background timers best-effort; **on-demand sync upon app launch** serves as the primary sync driver.

## 7. Multi-Vault Support

- Multiple vaults push snapshots to `/vaults/<vaultId>/snapshot.json` in the same target GitHub repository.
- Web Dashboard reads `/vaults/index.json` to present vault switching controls.

## 8. License Verification (Offline Signature)

- License keys are cryptographically signed using Ed25519.
- Verification occurs 100% offline within the plugin.

## 9. Sponsorship & Support

- GitHub Sponsors & Ko-fi links in settings UI and plugin manifest `fundingUrl`.

## 10. Implementation Milestones (Phase 0 to Phase 9)

Refer to `PROMPTS.md` for detailed milestone phase breakdowns.
