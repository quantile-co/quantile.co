import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
if (!executablePath) {
  throw new Error(
    "Enter the Devenv shell to use the pinned Playwright browser.",
  );
}
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright({
    launchOptions: {
      executablePath,
    },
  }),
  instances: [{ browser: "chromium" as const }],
});

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
            "nix/*.test.ts",
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
          browser: browser(),
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
          browser: browser(),
        },
      },
    ],
  },
});
