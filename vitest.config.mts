import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": dirname } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "app/**/*.test.{ts,tsx}",
            "components/**/*.test.{ts,tsx}",
            "lib/**/*.test.{ts,tsx}",
          ],
          exclude: [
            "**/*.integration.test.{ts,tsx}",
            "**/*.browser.test.{ts,tsx}",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["app/**/*.integration.test.{ts,tsx}"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        optimizeDeps: { include: ["react-dom/server", "react-email"] },
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
      {
        extends: true,
        resolve: {
          alias: {
            "next/image": path.join(dirname, "lib/browser/test.tsx"),
          },
        },
        optimizeDeps: {
          include: [
            "@mantine/hooks",
            "@tabler/icons-react",
            "fathom-client",
            "next/navigation",
            "react-dom/client",
          ],
        },
        test: {
          name: "browser",
          include: [
            "app/**/*.browser.test.tsx",
            "components/**/*.browser.test.tsx",
          ],
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
