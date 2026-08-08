import { Modal, App, Setting, requestUrl, Notice, Platform } from "obsidian";

/**
 * GitHub Device Flow Authentication
 *
 * このフローは Client Secret を一切使用しません。
 * モバイル・デスクトップ両方でセキュアに動作する OAuth アプローチです。
 *
 * すべての通信は Obsidian の requestUrl を使用し、生の fetch は使用しません（AGENTS.md 0.5）。
 */

interface DeviceFlowStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export async function startDeviceFlow(clientId: string): Promise<DeviceFlowStartResponse> {
  const response = await requestUrl({
    url: "https://github.com/login/device/code",
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: "repo", // We need 'repo' scope to create repositories and push code
    }),
  });

  if (response.status !== 200) {
    throw new Error(`Failed to start device flow: ${response.status}`);
  }

  return response.json as DeviceFlowStartResponse;
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  intervalSeconds: number,
  isMobile: boolean,
): Promise<string> {
  const timeoutMs = (isMobile ? 10 : 5) * 60 * 1000; // Mobile gets 10 mins due to external browser switching
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await requestUrl({
      url: "https://github.com/login/oauth/access_token",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = response.json;

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === "authorization_pending") {
      // Keep polling
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    } else if (data.error === "slow_down") {
      // Increase interval
      intervalSeconds += 5;
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    } else {
      throw new Error(`Auth error: ${data.error_description || data.error}`);
    }
  }

  throw new Error("Authentication timed out.");
}

export class DeviceAuthModal extends Modal {
  private userCode: string;
  private verificationUri: string;
  private onComplete: (token: string) => void;
  private onCancel: () => void;
  private isPolling = true;

  constructor(
    app: App,
    userCode: string,
    verificationUri: string,
    onComplete: (token: string) => void,
    onCancel: () => void,
  ) {
    super(app);
    this.userCode = userCode;
    this.verificationUri = verificationUri;
    this.onComplete = onComplete;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl, titleEl } = this;

    titleEl.setText("GitHub Authentication");

    contentEl.createEl("p", {
      text: "Please copy the code below and enter it in the browser to authorize Vault Insights.",
    });

    const codeBox = contentEl.createEl("div", {
      cls: "github-auth-code-box",
      attr: {
        style:
          "display: flex; align-items: center; justify-content: space-between; background: var(--background-secondary); padding: 10px; border-radius: 8px; margin: 15px 0;",
      },
    });

    codeBox.createEl("h1", {
      text: this.userCode,
      attr: { style: "margin: 0; font-family: monospace; letter-spacing: 2px;" },
    });

    const copyBtn = codeBox.createEl("button", { text: "Copy" });
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(this.userCode);
      new Notice("Code copied to clipboard!");
    };

    contentEl.createEl("p", {
      text: "Waiting for authorization... This modal will close automatically.",
    });

    const openBtn = contentEl.createEl("button", { text: "Open GitHub", cls: "mod-cta" });
    openBtn.onclick = () => {
      if (Platform.isMobileApp) {
        // モバイルでは外部ブラウザで確実に開くため、複数の候補をフォールバックさせる
        // 動作実績や推奨環境は端末(iOS/Android)やWebViewのバージョンに依存するため、
        // 失敗時は次善の策を試行する
        try {
          // 候補1: Capacitor/Cordova系で外部ブラウザ起動を強制する一般的な指定
          window.open(this.verificationUri, "_system");
        } catch (e1) {
          try {
            // 候補2: 新規タブ指定
            window.open(this.verificationUri, "_blank");
          } catch (e2) {
            // 候補3: 通常起動
            window.open(this.verificationUri);
          }
        }
      } else {
        // デスクトップ版は通常通りシステム標準ブラウザで開く
        window.open(this.verificationUri);
      }
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    if (this.isPolling) {
      this.isPolling = false;
      this.onCancel();
    }
  }

  complete(token: string) {
    this.isPolling = false;
    this.onComplete(token);
    this.close();
  }
}

export class ConsentModal extends Modal {
  private onAccept: () => void;

  constructor(app: App, onAccept: () => void) {
    super(app);
    this.onAccept = onAccept;
  }

  onOpen() {
    const { contentEl, titleEl } = this;

    titleEl.setText("GitHub 連携について");

    contentEl.createEl("p", {
      text: "Webダッシュボードを自動展開するため、GitHubと連携します。",
    });

    contentEl.createEl("p", {
      text: "【重要】このトークンはあなたのvault内にローカル保存されます (data.json)。Vault Insights が外部サーバーにトークンを送信することは絶対にありません。",
      cls: "mod-warning",
      attr: { style: "font-weight: bold; color: var(--text-error); margin: 15px 0;" },
    });

    new Setting(contentEl)
      .addButton((btn) => btn.setButtonText("キャンセル").onClick(() => this.close()))
      .addButton((btn) =>
        btn
          .setButtonText("同意して認証を始める")
          .setCta()
          .onClick(() => {
            this.onAccept();
            this.close();
          }),
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
