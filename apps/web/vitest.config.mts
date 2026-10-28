import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
if (!executablePath) {
  throw new Error(
    "Enter the direnv shell to use the pinned Playwright browser.",
  );
}
const browser = () => ({
  enabled: true,
  headless: true,
  // Native scrollbars must participate in layout, just as in a real browser.
  provider: playwright({
    launchOptions: { executablePath, ignoreDefaultArgs: ["--hide-scrollbars"] },
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
            "*.test.ts",
          ],
          exclude: ["**/*.browser.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            "next/image": fileURLToPath(
              import.meta.resolve(
                "@quantile-co/quantile.co-testing/next-image",
              ),
            ),
          },
        },
        optimizeDeps: {
          include: [
            "@mantine/hooks",
            "@tabler/icons-react",
            "fathom-client",
            "next/navigation",
            "react-dom",
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
