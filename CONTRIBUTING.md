English | [日本語](./CONTRIBUTING.ja.md)

---

# Contributing to Vault Insights

Thank you for considering contributing to Vault Insights!
This repository is developed following specific architectural principles and guidelines. Please review this document thoroughly before opening a Pull Request (PR).

## 1. Core Project Philosophy (Serverless & Zero Maintenance Cost)

This project is an open-source personal project operated under a **$0 infrastructure & serverless** model.
We do not accept contributions that introduce or depend on developer-hosted backend servers (such as custom APIs, databases, or authentication servers).

- **Communication & Hosting**: All functionality relies on user-owned infrastructure (GitHub Pages, GitHub REST API, etc.).
- **Payments**: Delegated entirely to existing SaaS providers (Gumroad, Lemon Squeezy, Ko-fi, etc.) without custom server-side validation infrastructure.

## 2. Desktop & Mobile Cross-Platform Requirement

This plugin specifies `isDesktopOnly: false` in `manifest.json`. **Flawless operation on both Desktop and Mobile (iOS / Android WebView environments) is mandatory**.

- ❌ Direct imports of Node.js built-in modules (`fs`, `path`, `child_process`).
- ❌ Raw browser `fetch` (to avoid CORS issues in mobile WebViews).
- ✅ Always use Obsidian's `requestUrl()` API for network requests.
- ✅ Always use `plugin.saveData()` / `loadData()` for state persistence.
- If a feature is constrained on mobile platforms, clearly explain the limitation in the UI rather than dropping the feature entirely or causing crashes.

## 3. Monorepo Structure & Tech Stack

This repository uses a `pnpm workspaces` monorepo configuration:

- **`packages/obsidian-plugin`**: Obsidian plugin codebase (TypeScript, esbuild). Keep dependencies minimal (avoid heavy frameworks like React in the core plugin) to protect startup performance.
- **`packages/web-dashboard-template`**: Web dashboard static template (React, Vite, TailwindCSS). Build artifacts are embedded into the plugin at build time.
- **`packages/shared`**: Shared type definitions and schemas (Zod schemas).

## 4. Privacy & Security Rules (Strict)

- **Data Privacy**: Never include code that transmits user note contents or activity analytics to developer-managed endpoints.
- **Secret Management**: User secrets (e.g. GitHub tokens) are stored locally in the vault settings. Never hardcode tokens or Client Secrets into the codebase.

## 5. Paid Feature Bypasses Strictly Prohibited

- License verification for Premium features is performed purely offline (Ed25519 signature verification).
- Even for developer testing or personal use, adding backdoor bypasses like `if (isDeveloper) return true;` is strictly forbidden. All access must pass through official verification code paths.

## 6. Pull Request Submission Checklist

Please ensure your PR satisfies the following before submission:

- [ ] **TypeCheck & Linting**: `pnpm -r typecheck` and `pnpm -r lint` pass cleanly with no errors.
- [ ] **Build Verification**: Builds for `packages/obsidian-plugin` and `packages/web-dashboard-template` complete successfully.
- [ ] **Mobile Compatibility**: New code does not depend on Node.js APIs or raw `fetch`, ensuring zero mobile crashes.
- [ ] **Single Concern**: Keep PRs focused (1 PR = 1 Feature or Bugfix). Avoid bundling unrelated refactoring.
- [ ] **Conventional Commits**: Use commit prefixes such as `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

Thank you for helping make Vault Insights better!
