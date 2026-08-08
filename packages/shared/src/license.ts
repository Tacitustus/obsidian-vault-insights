import { ed25519 } from "@noble/curves/ed25519.js";
import { hexToBytes } from "@noble/hashes/utils.js";

// 開発者が後で差し替えるための仮の公開鍵（Hex文字列）
// 秘密鍵はリポジトリには含めず、環境変数やローカルの.env等から読み込ませます。
export const PUBLIC_KEY_HEX = "d21e8ca6c91d7e3a1580858c9b9dc4d5a1741ef3f3999eb5fe3b727ac42c5b6c";

export interface LicensePayload {
  issuedTo?: string;
  issuedAt: number;
  expiresAt?: number;
  plan: "premium";
}

export interface LicenseKey {
  payload: LicensePayload;
  signature: string; // Hex string of the signature
}

export interface VerificationResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: string;
}

/**
 * ライセンスキー文字列を検証する。
 * オフライン・モバイル環境でも動くように純粋なJS（@noble/curves）を使用。
 */
export function verifyLicense(licenseString: string): VerificationResult {
  try {
    // 1. Base64 decode
    // Node.jsとブラウザ(Obsidianモバイル)の両方で動作させるため、atobを使う。
    // Node.js 16+ や現代のブラウザには globalThis.atob が存在します。
    let decodedStr: string;
    try {
      // JSONはASCII/UTF-8の範囲内で扱える前提
      decodedStr = decodeURIComponent(escape(globalThis.atob(licenseString)));
    } catch {
      return { valid: false, error: "Invalid format: Not valid Base64" };
    }

    // 2. Parse JSON
    let licenseKey: LicenseKey;
    try {
      licenseKey = JSON.parse(decodedStr);
    } catch {
      return { valid: false, error: "Invalid format: Not a valid JSON license key" };
    }

    if (!licenseKey.payload || !licenseKey.signature) {
      return { valid: false, error: "Invalid format: Missing payload or signature" };
    }

    // 3. Verify Signature
    // ペイロードを決定的な文字列化（ここでは単純化のためそのままstringify）
    const messageStr = JSON.stringify(licenseKey.payload);
    const messageBytes = new TextEncoder().encode(messageStr);

    const isValidSig = ed25519.verify(
      hexToBytes(licenseKey.signature),
      messageBytes,
      hexToBytes(PUBLIC_KEY_HEX),
    );

    if (!isValidSig) {
      return { valid: false, error: "Invalid signature: Signature verification failed" };
    }

    // 4. Verify Expiry
    if (licenseKey.payload.expiresAt && Date.now() > licenseKey.payload.expiresAt) {
      return { valid: false, error: "License expired" };
    }

    // すべてOK
    return { valid: true, payload: licenseKey.payload };
  } catch (error) {
    return { valid: false, error: "Invalid format: Corrupted license string" };
  }
}
