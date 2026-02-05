import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: [
      ..."**/{node_modules,dist,build,out,.next}/**".split(","),
      "**/e2e/**",
      "**/*.spec.*",
    ],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}", "src/**/?(*.)+(test|spec).{ts,tsx}"],
  },
});
