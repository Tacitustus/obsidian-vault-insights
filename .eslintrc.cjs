// @ts-check

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      // AGENTS.md §0.5 — モバイル互換性の静的チェック
      // Node組み込みモジュールと生のfetchの使用を禁止する
      files: ["packages/obsidian-plugin/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "fs",
                message:
                  "Node 'fs' はモバイル環境で使用不可。Obsidian Vault API を使用してください。",
              },
              {
                name: "node:fs",
                message:
                  "Node 'fs' はモバイル環境で使用不可。Obsidian Vault API を使用してください。",
              },
              {
                name: "fs/promises",
                message:
                  "Node 'fs/promises' はモバイル環境で使用不可。Obsidian Vault API を使用してください。",
              },
              {
                name: "node:fs/promises",
                message:
                  "Node 'fs/promises' はモバイル環境で使用不可。Obsidian Vault API を使用してください。",
              },
              {
                name: "path",
                message:
                  "Node 'path' はモバイル環境で使用不可。Obsidian API の normalizePath() を使用してください。",
              },
              {
                name: "node:path",
                message:
                  "Node 'path' はモバイル環境で使用不可。Obsidian API の normalizePath() を使用してください。",
              },
              {
                name: "child_process",
                message:
                  "Node 'child_process' はモバイル環境で使用不可。",
              },
              {
                name: "node:child_process",
                message:
                  "Node 'child_process' はモバイル環境で使用不可。",
              },
              {
                name: "os",
                message:
                  "Node 'os' はモバイル環境で使用不可。",
              },
              {
                name: "node:os",
                message:
                  "Node 'os' はモバイル環境で使用不可。",
              },
              {
                name: "crypto",
                message:
                  "Node 'crypto' はモバイル環境で使用不可。Web Crypto API または Obsidian API を使用してください。",
              },
              {
                name: "node:crypto",
                message:
                  "Node 'crypto' はモバイル環境で使用不可。Web Crypto API または Obsidian API を使用してください。",
              },
            ],
            patterns: [
              {
                group: ["fs/*", "node:fs/*"],
                message:
                  "Node 'fs' はモバイル環境で使用不可。Obsidian Vault API を使用してください。",
              },
            ],
          },
        ],
        "no-restricted-globals": [
          "error",
          {
            name: "fetch",
            message:
              "生の fetch はモバイル環境でCORS問題を起こす可能性あり。Obsidian の requestUrl() を使用してください（AGENTS.md §0.5）。",
          },
        ],
      },
    },
  ],
};
