import "@fontsource-variable/outfit";
import "../app/globals.css";
import { MantineProvider } from "@mantine/core";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import { theme } from "../theme";

const viewports = {
  mobile: {
    name: "Mobile (390 × 844)",
    styles: { width: "390px", height: "844px" },
    type: "mobile",
  },
  tablet: {
    name: "Tablet (768 × 900)",
    styles: { width: "768px", height: "900px" },
    type: "tablet",
  },
  desktop: {
    name: "Desktop (1365 × 900)",
    styles: { width: "1365px", height: "900px" },
    type: "desktop",
  },
  wide: {
    name: "Wide (1920 × 1080)",
    styles: { width: "1920px", height: "1080px" },
    type: "desktop",
  },
};

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: { dark: "dark", light: "light" },
      defaultTheme: "light",
      attributeName: "data-mantine-color-scheme",
    }),
    (Story, context) => (
      <MantineProvider
        forceColorScheme={context.globals.theme === "dark" ? "dark" : "light"}
        theme={theme}
      >
        <Story />
      </MantineProvider>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    viewport: { options: viewports },
  },
};

export default preview;
