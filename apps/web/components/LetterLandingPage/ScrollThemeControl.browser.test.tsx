import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ScrollThemeControl } from "./ScrollThemeControl";

let container: HTMLDivElement;
let root: Root;

async function renderControl() {
  container = document.createElement("div");
  container.style.setProperty("--site-page-padding", "20px");
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() =>
    root.render(
      <ScrollThemeControl>
        <button type="button">Theme</button>
      </ScrollThemeControl>,
    ),
  );
  await vi.waitFor(() =>
    expect(container.querySelector("button")).not.toBeNull(),
  );
  await userEvent.hover(document.body);
  return container.firstElementChild as HTMLElement;
}

afterEach(() => {
  root?.unmount();
  container?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Scroll-revealed theme control", () => {
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
    const button = control.querySelector("button") as HTMLButtonElement;
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
    expect(vi.getTimerCount()).toBe(0);
  });
});
