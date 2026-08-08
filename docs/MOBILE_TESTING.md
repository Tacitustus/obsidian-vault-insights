English | [日本語](./MOBILE_TESTING.ja.md)

---

# Mobile Environment (iOS / Android) Test Checklist

This plugin has `isDesktopOnly: false` and promises full support for mobile Obsidian.
To verify that mobile-specific constraints (CORS, lack of Node APIs, background limits) are met, manually execute the following checklist.

## 1. Installation & Initial Startup

- [ ] Plugin installs and enables cleanly in the Obsidian mobile app on iOS / Android.
  - _Verification Point_: If code depending on Node.js built-in modules (`fs`, `crypto`) remains, enabling will throw an error.
- [ ] Vault ID is successfully generated upon initialization and saved to `data.json`.
  - _Verification Point_: Ensure `crypto.randomUUID()` works properly inside the WebView context.

## 2. Free Features (Local Operation)

- [ ] Events (clicks, edits, link creations) are correctly captured and aggregated.
- [ ] Opening the in-Obsidian dashboard (`Vault Insights` view) displays cleanly without broken layouts.
  - _Verification Point_: CSS responsiveness behaves correctly on narrow screens.
- [ ] Search and sorting functionality inside the dashboard functions as expected.
- [ ] Running manual JSON export invokes the native OS file save/share dialog and exports the JSON file.

## 3. Premium Features (Authentication & Deployment)

- [ ] Tapping "Connect with GitHub" in plugin settings initiates Device Flow authentication.
- [ ] "Copy Code" button functions properly and copies user code to clipboard.
- [ ] **External Browser Launch & Return**: Tapping "Open GitHub" cleanly launches the native system browser (iOS Safari / Android Chrome) as a separate window/app.
  - _Verification Point_: Avoid GitHub opening inside the WebView and trapping the user. Validate fallback behaviors (`_system`, etc.) on real iOS/Android devices.
- [ ] Returning to Obsidian after completing browser authentication acquires the access token without polling timeouts (testing mobile background wake delay).
- [ ] Tapping manual dashboard deploy/update after successful auth completes deployment cleanly.

## 4. Automatic Sync (Background Processing)

- [ ] **On-Demand Sync at Startup**: Force-closing the app and re-launching triggers sync (push to GitHub).
- [ ] **Background Idle Operation**: Leaving the app open in background triggers interval sync (e.g., 5 mins) or handles OS process suspension gracefully without crashing.
  - _Verification Point_: Resilience against mobile OS process suspension.

---

> 📝 Perform this manual testing checklist prior to major releases or changes involving native web APIs (Web Crypto API, external integrations).
