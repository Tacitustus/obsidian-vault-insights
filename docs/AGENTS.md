English | [日本語](./AGENTS.ja.md)

---

# AGENTS.md

This file defines the guidelines that AI coding agents (such as Antigravity) must strictly obey when working on this repository. Before starting implementation work, read `BLUEPRINT.md` and this file. If instructions from the user conflict with constraints in this file, prioritize this file, provide reasons, and confirm with the user.

## 0. Project Nature (Most Important)

- This is a **$0 infrastructure / serverless** personal open-source project.
- "Serverless" means **zero developer-managed backend servers**.
  - ❌ Creating custom backend APIs, databases, or authentication servers.
  - ✅ Static hosting like GitHub Pages / Cloudflare Pages (on the user's own account).
  - ✅ GitHub REST API / GitHub Actions (running on the user's own repository).
  - ✅ Payments & license distribution delegated completely to **existing SaaS platforms** (Gumroad, Lemon Squeezy, Ko-fi, etc.) without custom payment backend or webhook servers.
- When in doubt, ask "whose infrastructure and cost will run this?", and never adopt designs that introduce recurring operational costs for the developer.

## 0.5. Platform Policy (Desktop & Mobile Cross-Platform)

- This plugin sets `manifest.json` `isDesktopOnly: false` and **must work seamlessly on both Desktop and Mobile (iOS / Android)**.
- Mobile environments cannot use Node.js or Electron APIs. Strictly follow:
  - ❌ Direct imports of Node.js modules like `fs`, `path`, `child_process`.
  - ❌ Raw browser `fetch` (causes CORS issues in mobile WebViews).
  - ✅ Network calls must use Obsidian's `requestUrl()` API (cross-platform, CORS-bypassed).
  - ✅ Persistence via `plugin.saveData()` / `loadData()` only (vault JSON).
  - ✅ Pre-build `web-dashboard-template` assets and **embed static assets into `obsidian-plugin` during development build / CI**. Do not execute Vite/Node builds at runtime on mobile.
- Test UI assuming narrow screen widths and touch interactions on mobile.
- Use `Platform.isMobileApp` (Obsidian API) when branching for mobile-specific logic (e.g. opening external browser, clipboard ops), with clear comment rationale.
- Clearly document mobile limitations in UI rather than silently disabling functionality.

## 1. Repository Structure (pnpm workspaces monorepo)

```
.
├── packages/
│   ├── obsidian-plugin/        # Main Obsidian plugin (TypeScript, esbuild)
│   ├── web-dashboard-template/ # Web dashboard template deployed BYO (React + TS + Tailwind, Vite)
│   └── shared/                 # Shared types and schemas (Zod)
├── docs/
│   ├── BLUEPRINT.md
│   └── AGENTS.md
├── .github/workflows/          # CI/CD workflows
├── pnpm-workspace.yaml
└── turbo.json                  # Task orchestration
```

- Maintain strict separation between `obsidian-plugin` and `web-dashboard-template`.
- Store shared JSON export schema in `shared` (Zod schemas) as the Single Source of Truth.

## 2. Tech Stack Policy

| Domain            | Technology                                    | Rationale                                      |
| ----------------- | --------------------------------------------- | ---------------------------------------------- |
| Plugin Language   | TypeScript (strict)                           | Official Obsidian sample standard              |
| Plugin Build      | esbuild                                       | Official Obsidian standard, lightweight & fast |
| Web Dashboard     | React 18 + TS + TailwindCSS + Vite            | User specified                                 |
| Schema Validation | Zod                                           | Runtime validation of JSON export payloads     |
| Charting          | Recharts                                      | Lightweight, minimal overhead                  |
| State Management  | React Built-ins (useState/useReducer/Context) | Redux/Zustand overhead is unnecessary          |
| Lint / Format     | ESLint + Prettier                             | Community standard                             |
| Testing           | Vitest                                        | Fits Vite ecosystem cleanly                    |
| CI                | GitHub Actions                                | Zero cost                                      |

**Note on bundle size constraints:** `web-dashboard-template` is loaded once in the user's browser, whereas `obsidian-plugin` directly impacts Obsidian startup time. Keep plugin dependencies strictly lean.

## 3. Coding Standards

- `tsconfig.json` must enforce `strict: true`. Avoid `any`.
- Keep functions and components modular (split files exceeding ~300 lines).
- Wrap Obsidian Plugin API dependencies (`app.vault`, `app.workspace`) in thin adapters under `packages/obsidian-plugin/src/obsidian-adapters/` to facilitate unit testing.
- Consolidate magic numbers and strings into `constants.ts`.

## 4. Commit & Branch Conventions

- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- 1 commit per logical concern.

## 5. Security & Privacy Rules (Strict)

- User note contents and activity logs are **never transmitted to developer servers**.
- Secrets (e.g. GitHub tokens) are saved locally via Obsidian's `plugin.saveData()`. Always include explicit user notices in settings.
- Never hardcode tokens or Client Secrets into repository code.

## 6. License Verification Policy (Premium)

- Premium license verification is performed **offline** via Ed25519 signature checks.
- Free functionality must remain 100% valuable and complete locally without hostages.
- Developers using Premium for testing must generate signed developer keys via `scripts/generate-license.ts` rather than embedding bypass backdoors like `if (isDeveloper) return true`.

## 7. CI/CD Requirements

- All pushes/PRs must pass lint, typecheck, unit tests, and build checks cleanly.

## 8. Prohibited Autonomous Decisions

AI agents must seek explicit user confirmation before:

- Altering feature boundaries between Free and Premium.
- Introducing new external paid SaaS integrations.
- Modifying data transmission destinations.
- Adding dependencies that require paid servers or recurring costs.
