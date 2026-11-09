import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ThemeSwitcher } from "./ThemeSwitcher";

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  root?.unmount();
  container?.remove();
  localStorage.removeItem("mantine-color-scheme-value");
});

it("stays visible and supports pointer and keyboard theme selection", async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider defaultColorScheme="auto">
      <ThemeSwitcher />
    </MantineProvider>,
  );
  await vi.waitFor(() =>
    expect(container.querySelector("fieldset")).not.toBeNull(),
  );
  const control = container.querySelector("fieldset") as HTMLElement;
  expect(getComputedStyle(control).position).toBe("static");
  expect(getComputedStyle(control).opacity).toBe("1");
  expect(getComputedStyle(control).pointerEvents).toBe("auto");

  const dark = container.querySelector(
    'input[aria-label="Dark"]',
  ) as HTMLInputElement;
  const label = container.querySelector(
    `label[for="${dark.id}"]`,
  ) as HTMLLabelElement;
  await userEvent.click(label);
  await vi.waitFor(() => {
    expect(dark.checked).toBe(true);
    expect(document.documentElement.dataset.mantineColorScheme).toBe("dark");
  });

  dark.focus();
  await userEvent.keyboard("{ArrowLeft}");
  const light = container.querySelector(
    'input[aria-label="Light"]',
  ) as HTMLInputElement;
  await vi.waitFor(() => {
    expect(light.checked).toBe(true);
    expect(document.activeElement).toBe(light);
    expect(document.documentElement.dataset.mantineColorScheme).toBe("light");
  });
  await userEvent.keyboard("{ArrowLeft}");
  await vi.waitFor(() =>
    expect(
      (
        container.querySelector(
          'input[aria-label="System"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true),
  );
});
