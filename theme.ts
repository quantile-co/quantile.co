import { colorsTuple, createTheme, virtualColor } from "@mantine/core";

const fontFamily =
  '"Outfit Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const theme = createTheme({
  autoContrast: true,
  colors: {
    black: colorsTuple("#09090b"),
    primary: virtualColor({
      name: "primary",
      dark: "white",
      light: "black",
    }),
    white: colorsTuple("#fafafa"),
  },
  fontFamily,
  headings: { fontFamily },
  primaryColor: "primary",
});
