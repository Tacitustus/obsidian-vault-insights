import { parseArgs } from "node:util";
import { ed25519 } from "@noble/curves/ed25519.js";
import { Buffer } from "node:buffer";

// コマンドライン引数の定義
const options = {
  "generate-keys": { type: "boolean" as const },
  "issued-to": { type: "string" as const },
  plan: { type: "string" as const, default: "premium" },
  "expires-at": { type: "string" as const },
};

const { values } = parseArgs({ options, strict: false });

if (values["generate-keys"]) {
  console.log("Generating new Ed25519 keypair...");
  const priv = require("crypto").randomBytes(32);
  const pub = ed25519.getPublicKey(priv);

  console.log("\n[Private Key] (Set this as VAULT_INSIGHTS_PRIVATE_KEY in your env)");
  console.log(Buffer.from(priv).toString("hex"));

  console.log("\n[Public Key] (Copy this to packages/shared/src/license.ts PUBLIC_KEY_HEX)");
  console.log(Buffer.from(pub).toString("hex"));

  console.log("\nStore your private key securely. NEVER commit it to the repository.");
  process.exit(0);
}

// ライセンス生成モード
const privateKeyHex = process.env.VAULT_INSIGHTS_PRIVATE_KEY;

if (!privateKeyHex) {
  console.error("Error: VAULT_INSIGHTS_PRIVATE_KEY environment variable is not set.");
  console.error("Run `npx tsx scripts/generate-license.ts --generate-keys` to create a keypair.");
  process.exit(1);
}

const payload = {
  issuedTo: values["issued-to"],
  issuedAt: Date.now(),
  plan: values["plan"],
  expiresAt: values["expires-at"] ? parseInt(values["expires-at"], 10) : undefined,
};

// Remove undefined fields to ensure clean JSON
if (!payload.issuedTo) delete payload.issuedTo;
if (!payload.expiresAt) delete payload.expiresAt;

const messageStr = JSON.stringify(payload);
const messageBytes = new TextEncoder().encode(messageStr);
const signatureBytes = ed25519.sign(messageBytes, privateKeyHex);
const signatureHex = Buffer.from(signatureBytes).toString("hex");

const licenseObj = {
  payload,
  signature: signatureHex,
};

const licenseJson = JSON.stringify(licenseObj);
const licenseBase64 = Buffer.from(licenseJson, "utf-8").toString("base64");

console.log("\n--- Generated License Key ---");
console.log(licenseBase64);
console.log("-----------------------------\n");
console.log("Payload:", payload);
