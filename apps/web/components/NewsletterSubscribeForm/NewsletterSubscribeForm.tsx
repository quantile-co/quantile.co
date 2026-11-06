"use client";

import {
  ActionIcon,
  Box,
  Button,
  type ButtonProps,
  TextInput,
  type TextInputProps,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import classes from "./NewsletterSubscribeForm.module.css";

export function NewsletterSubscribeForm({
  layout = "stacked",
  inputSize = "md",
  buttonProps,
}: {
  layout?: "stacked" | "inline" | "compact";
  inputSize?: TextInputProps["size"];
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
        placeholder="Email address..."
        size={inputSize}
        rightSectionWidth={
          layout === "compact" ? (buttonProps?.children ? 104 : 44) : undefined
        }
        rightSection={
          layout === "compact" ? (
            buttonProps?.children ? (
              <Button
                type="submit"
                variant="transparent"
                color="secondary"
                size="xs"
                radius="sm"
                fz="sm"
                px={8}
                className={classes.submitIcon}
                classNames={{ section: classes.submitSection }}
                rightSection={<IconArrowRight size={14} aria-hidden="true" />}
              >
                {buttonProps.children}
              </Button>
            ) : (
              <ActionIcon
                type="submit"
                aria-label="Subscribe"
                variant="transparent"
                color="secondary"
                radius="sm"
                size={32}
                className={classes.submitIcon}
              >
                <IconArrowRight size={18} aria-hidden="true" />
              </ActionIcon>
            )
          ) : undefined
        }
      />
      {layout !== "compact" && (
        <Button
          variant="default"
          size="md"
          radius="xl"
          {...buttonProps}
          type="submit"
        >
          {buttonProps?.children ?? "Subscribe"}
        </Button>
      )}
    </Box>
  );
}
