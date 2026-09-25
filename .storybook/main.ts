import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal(config) {
    config.build = config.build ?? {};
    config.build.chunkSizeWarningLimit = 1_500;
    config.build.rolldownOptions = {
      ...config.build.rolldownOptions,
      onLog(level, log, handler) {
        if (
          log.code === "MODULE_LEVEL_DIRECTIVE" &&
          log.message.includes("use client")
        ) {
          return;
        }
        handler(level, log);
      },
    };
    return config;
  },
};

export default config;
