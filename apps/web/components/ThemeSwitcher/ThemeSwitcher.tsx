"use client";

import {
  type MantineColorScheme,
  useMantineColorScheme,
  VisuallyHidden,
} from "@mantine/core";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import { useId } from "react";
import classes from "./ThemeSwitcher.module.css";

const options = [
  { label: "System", value: "auto", icon: IconDeviceDesktop },
  { label: "Light", value: "light", icon: IconSun },
  { label: "Dark", value: "dark", icon: IconMoon },
] satisfies Array<{
  icon: typeof IconSun;
  label: string;
  value: MantineColorScheme;
}>;

export function ThemeSwitcher() {
  const id = useId();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <fieldset className={classes.root}>
      <VisuallyHidden component="legend">Select a display theme</VisuallyHidden>
      {options.map((option) => {
        const optionId = `${id}-${option.value}`;
        return (
          <span className={classes.option} key={option.value}>
            <input
              aria-label={option.label}
              checked={colorScheme === option.value}
              className={classes.input}
              id={optionId}
              name={`${id}-theme`}
              onChange={() => setColorScheme(option.value)}
              type="radio"
              value={option.value}
            />
            <label className={classes.label} htmlFor={optionId}>
              <option.icon aria-hidden="true" size={13} stroke={1.75} />
            </label>
          </span>
        );
      })}
    </fieldset>
  );
}
