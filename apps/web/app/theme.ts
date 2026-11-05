"use client";

// Keep virtualColor's non-enumerable light/dark data out of RSC prop serialization.
import {
  Anchor,
  Button,
  colorsTuple,
  createTheme,
  Input,
  Pagination,
  virtualColor,
} from "@mantine/core";
import controls from "./controls.module.css";

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
    Anchor: Anchor.extend({ defaultProps: { underline: "never" } }),
    Button: Button.extend({
      defaultProps: { radius: "xl" },
      classNames: { root: controls.button },
    }),
    Input: Input.extend({
      defaultProps: { radius: "md" },
      classNames: { input: controls.input },
    }),
    Pagination: Pagination.extend({
      defaultProps: { size: "lg" },
      classNames: { control: controls.pagination },
    }),
  },
});
