English | [日本語](./README.ja.md)

---

# Obsidian Vault Insights

An analytics plugin for Obsidian to visualize your vault activity across note views, edits, link structures, and tag usage.

<!-- TODO: Insert screenshot here -->

![Dashboard Screenshot Placeholder](https://via.placeholder.com/800x450?text=Dashboard+Screenshot)

## ✨ Feature Comparison (Free vs. Premium)

| Feature                                 | Free Version       | Premium Version       |
| --------------------------------------- | ------------------ | --------------------- |
| Click / Edit / Link / Tag aggregation   | ✅                 | ✅                    |
| In-Obsidian Dashboard                   | ✅ Full features   | ✅                    |
| Manual JSON Export                      | ✅                 | ✅                    |
| GitHub Device Flow One-Click Auth       | ❌                 | ✅                    |
| Auto-Deployment (including Pages setup) | ❌                 | ✅                    |
| Automated Background Push & Sync        | ❌                 | ✅                    |
| Web Dashboard (External Hosting)        | ❌ (Self-hostable) | ✅ Pre-built & hosted |
| Multi-Vault Consolidated View           | ❌                 | ✅                    |

_Note: Free users can still build and host custom dashboards using exported JSON files. Premium provides **seamless automation and a fully polished UX**._

## 📦 Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings > Community plugins > Browse
2. Search for `Vault Insights` and click Install
3. Enable the plugin

### Beta Installation via BRAT

1. Install and enable the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. Open BRAT settings and select `Add Beta plugin`.
3. Enter repository URL `Takimoto/obsidian-vault-insights` and submit.

## 🚀 Getting Started (How to Use)

### 1. In-Obsidian Dashboard (Free & Premium)
After enabling the plugin, you can view your vault insights directly within Obsidian:
- Press `Ctrl/Cmd + P` to open the Command Palette.
- Search for and run **`Vault Insights: Open Dashboard`**.

### 2. Web Dashboard (Premium)
With a Premium license, you can deploy a standalone Web Dashboard to your GitHub account:
1. Go to Obsidian Settings > Vault Insights.
2. Enter your Premium License Key and authenticate with GitHub (Click "Login to GitHub").
3. Click the **"Deploy Web Dashboard"** button in the settings.
4. The plugin will create a new repository (default: `vault-insights-dashboard`) on your GitHub account and automatically enable GitHub Pages. 
   *(⚠️ Important: Please use a new, empty repository name. You only need to create one repository; all your vaults on the same account will be consolidated and managed in this single repository.)*
5. Your dashboard will be accessible at:
   👉 `https://<your-github-username>.github.io/vault-insights-dashboard/`
   *(Note: It may take 1-2 minutes for GitHub Pages to build the site for the first time)*

Once deployed, the plugin will automatically sync your latest vault activity to this repository in the background, keeping your Web Dashboard up to date!

## 💎 Premium Edition (Bring Your Own Deployment)

With Premium, a dedicated Web Dashboard is automatically deployed directly to **your own GitHub account** (Bring Your Own Deployment), accessible from any browser anywhere.
No data is ever sent to developer-managed servers — all your data remains 100% under your ownership and control.

**[Purchase Premium License (Gumroad / Lemon Squeezy link)](<>)**

## Supported Environments & Limitations

This plugin works on Desktop (Windows / Mac / Linux) and Mobile (iOS / Android), but **automated background sync (Premium)** operating boundaries vary by OS platform.

| Feature                              | Desktop                            | Mobile (iOS / Android)                           |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------ |
| Event collection & Dashboard display | ✅ Fully Supported                 | ✅ Fully Supported                               |
| Manual Deploy / JSON Export          | ✅ Fully Supported                 | ✅ Fully Supported                               |
| Automated Background Sync            | ⚠️ Works while Obsidian is running | ⚠️ Primarily relies on on-demand sync at startup |

- **Common Sync Behavior**: As a serverless, local-first plugin, **syncing (background push to GitHub) does not occur while Obsidian is completely closed.**
- **Mobile OS Limitations**: Due to aggressive power management on mobile operating systems (iOS / Android), scheduled background timers may be suspended by the OS. Interval background sync is best-effort on mobile; **on-demand sync upon app launch (foreground return)** serves as the primary sync mechanism.

## 🔒 Privacy Policy

Your vault data belongs to you.

- **Collected Metadata**: Relative note paths (can be hashed in settings), view/edit counts, tag names, link counts (only metadata written to exported JSON). Note **content is NEVER collected**.
- **Data Destinations**: The only external destination is **the GitHub repository specified by you**. Data is NEVER sent to developer or third-party servers.
- **Privacy Mode**: Enabling "Privacy Mode" in settings replaces file paths with hashed IDs in calculations.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) ([Japanese version](./CONTRIBUTING.ja.md)) before submitting a Pull Request.
Report bugs or propose features on GitHub Issues.

## 💖 Support & Sponsorship

If Vault Insights helps you stay productive, consider supporting the project!

- [GitHub Sponsors](https://github.com/sponsors/Takimoto)
- [Ko-fi](https://ko-fi.com/takimoto)

## Developer License Key Generation

(Instructions for contributors working on plugin development)

```bash
# 1. Generate new keypair (First time only)
npx tsx scripts/generate-license.ts --generate-keys
# -> Set generated private key to local env var VAULT_INSIGHTS_PRIVATE_KEY
# -> Hardcode generated public key into packages/shared/src/license.ts

# 2. Generate self (unlimited) license key
npx tsx scripts/generate-license.ts --issued-to "developer@example.com" --plan "premium"
# -> Paste outputted Base64 string into Obsidian plugin Settings (Premium License Key)
```
