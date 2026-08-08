import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/core/**"],
    },
  },
  resolve: {
    alias: {
      // テスト実行時に @vault-insights/shared をソースから直接解決する
      "@vault-insights/shared": "../shared/src/index.ts",
    },
  },
});
