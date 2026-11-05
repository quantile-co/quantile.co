"use client";

import { Box, Button, type ButtonProps, TextInput } from "@mantine/core";
import classes from "./NewsletterSubscribeForm.module.css";

export function NewsletterSubscribeForm({
  layout = "stacked",
  buttonProps,
}: {
  layout?: "stacked" | "inline";
  buttonProps?: Pick<ButtonProps, "children" | "variant" | "size" | "radius">;
}) {
  return (
    <Box
      component="form"
      aria-label="Newsletter subscription"
      onSubmit={(event) => event.preventDefault()}
      className={classes.form}
      data-layout={layout}
    >
      <TextInput
        aria-label="Email address"
        type="email"
        required
        name="email"
        autoComplete="email"
        placeholder="Your email address"
        size="md"
      />
      <Button size="md" radius="xl" {...buttonProps} type="submit">
        {buttonProps?.children ?? "Subscribe"}
      </Button>
    </Box>
  );
}
