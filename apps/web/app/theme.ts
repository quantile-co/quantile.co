"use client";

// Keep virtualColor's non-enumerable light/dark data out of RSC prop serialization.
import { Button, colorsTuple, createTheme, virtualColor } from "@mantine/core";
import classes from "./theme.module.css";

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
    secondaryLight: colorsTuple("#52525b"),
    secondaryDark: colorsTuple("#a1a1aa"),
    secondary: virtualColor({
      name: "secondary",
      dark: "secondaryDark",
      light: "secondaryLight",
    }),
  },
  fontFamily,
  headings: { fontFamily },
  primaryColor: "primary",
  components: {
    Button: Button.extend({
      defaultProps: { radius: "xl" },
      classNames: { root: classes.button },
    }),
  },
});
