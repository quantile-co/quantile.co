import { MantineProvider } from "@mantine/core";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ThemeSwitcher } from "./ThemeSwitcher";

let container: HTMLDivElement;
let root: Root;

async function renderControl() {
  container = document.createElement("div");
  container.style.setProperty("--site-page-padding", "20px");
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() =>
    root.render(
      <MantineProvider>
        <ThemeSwitcher />
      </MantineProvider>,
    ),
  );
  await vi.waitFor(() =>
    expect(container.querySelector("fieldset")).not.toBeNull(),
  );
  await userEvent.hover(document.body);
  return container.querySelector("fieldset") as HTMLElement;
}

afterEach(() => {
  root?.unmount();
  container?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Theme switcher", () => {
  it("reveals on a tap even when the page cannot scroll", async () => {
    const control = await renderControl();
    expect(getComputedStyle(control).position).toBe("fixed");
    expect(getComputedStyle(control).right).toBe("20px");
    expect(getComputedStyle(control).bottom).toBe("20px");
    expect(control.hasAttribute("data-visible")).toBe(false);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    flushSync(() =>
      window.dispatchEvent(
        new PointerEvent("pointerdown", { pointerType: "touch" }),
      ),
    );
    expect(control.hasAttribute("data-visible")).toBe(true);
    flushSync(() => vi.advanceTimersByTime(1000));
    expect(control.hasAttribute("data-visible")).toBe(false);
  });

  it("starts hidden, reveals on scroll, and hides one second after the last scroll", async () => {
    const control = await renderControl();
    expect(control.hasAttribute("data-visible")).toBe(false);
    expect(getComputedStyle(control).opacity).toBe("0");
    expect(getComputedStyle(control).pointerEvents).toBe(
      window.matchMedia("(hover: hover)").matches ? "auto" : "none",
    );

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    flushSync(() => window.dispatchEvent(new Event("scroll")));
    expect(control.hasAttribute("data-visible")).toBe(true);
    vi.advanceTimersByTime(500);
    flushSync(() => window.dispatchEvent(new Event("scroll")));
    flushSync(() => vi.advanceTimersByTime(999));
    expect(control.hasAttribute("data-visible")).toBe(true);
    flushSync(() => vi.advanceTimersByTime(1));
    expect(control.hasAttribute("data-visible")).toBe(false);
    expect(getComputedStyle(control).pointerEvents).toBe(
      window.matchMedia("(hover: hover)").matches ? "auto" : "none",
    );
  });

  it("reveals when hovering its hidden area without scrolling and hides on leave", async () => {
    const control = await renderControl();
    expect(control.hasAttribute("data-visible")).toBe(false);
    expect(getComputedStyle(control).opacity).toBe("0");
    await userEvent.hover(control);
    await vi.waitFor(() => expect(getComputedStyle(control).opacity).toBe("1"));
    expect(control.hasAttribute("data-visible")).toBe(false);
    await userEvent.hover(document.body);
    await vi.waitFor(() => expect(getComputedStyle(control).opacity).toBe("0"));
  });

  it("can be revealed by keyboard focus without scrolling", async () => {
    const control = await renderControl();
    const button = control.querySelector("input") as HTMLInputElement;
    expect(getComputedStyle(control).pointerEvents).toBe(
      window.matchMedia("(hover: hover)").matches ? "auto" : "none",
    );
    button.focus({ preventScroll: true });
    await vi.waitFor(() => expect(getComputedStyle(control).opacity).toBe("1"));
    expect(getComputedStyle(control).pointerEvents).toBe("auto");
    expect(document.activeElement).toBe(button);
    button.blur();
    await vi.waitFor(() => expect(getComputedStyle(control).opacity).toBe("0"));
  });

  it("removes the scroll listener and pending timeout on unmount", async () => {
    await renderControl();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const remove = vi.spyOn(window, "removeEventListener");
    flushSync(() => window.dispatchEvent(new Event("scroll")));
    root.unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
