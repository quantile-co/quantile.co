import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["app/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
          exclude: ["**/*.integration.test.{ts,tsx}"],
        },
      },
      ...(["local", "preview"] as const).map((target) => ({
        test: {
          name: `integration-${target}`,
          environment: "node",
          include: ["app/**/*.integration.test.{ts,tsx}"],
          env: { INTEGRATION_TARGET: target },
          fileParallelism: false,
        },
      })),
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
