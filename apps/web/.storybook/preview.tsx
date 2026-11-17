import "@fontsource-variable/outfit";
import "../app/globals.css";
import { type MantineColorScheme, MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/nextjs-vite";
import { theme } from "../app/theme";

const preview: Preview = {
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description:
        "Initial display theme (the real theme control remains interactive)",
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark", "auto"],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile: { name: "Mobile", styles: { width: "390px", height: "844px" } },
        desktop: {
          name: "Desktop",
          styles: { width: "1440px", height: "900px" },
        },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const colorScheme = context.globals.theme as MantineColorScheme;
      return (
        <MantineProvider
          key={colorScheme}
          theme={theme}
          defaultColorScheme={colorScheme}
          colorSchemeManager={{
            get: () => colorScheme,
            set: () => {},
            subscribe: () => {},
            unsubscribe: () => {},
            clear: () => {},
          }}
        >
          <Story />
        </MantineProvider>
      );
    },
  ],
};
export default preview;
