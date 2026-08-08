import { verifyLicense } from "@vault-insights/shared";

/**
 * ライセンスキーを検証し、Premium機能が利用可能か判定する。
 * AGENTS.md §6: 一般ユーザー・開発者を問わず、この同一の検証パスを通過しなければならない。
 * 開発者用のハードコードされたバイパスは存在しない。
 */
export function isPremiumUser(licenseKey?: string): boolean {
  if (!licenseKey) return false;
  const result = verifyLicense(licenseKey);
  return result.valid;
}
