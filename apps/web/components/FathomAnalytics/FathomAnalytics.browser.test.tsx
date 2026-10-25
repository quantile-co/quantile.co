import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FathomAnalytics } from "./FathomAnalytics";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  default: { usePathname: () => route.pathname },
  usePathname: () => route.pathname,
}));

let container: HTMLDivElement;
let root: Root;
const trackPageview = vi.fn();
const domains = [window.location.hostname];

function script() {
  const found = document.querySelector<HTMLScriptElement>("#fathom-script");
  if (!found) throw new Error("Missing Fathom script");
  return found;
}

async function render(allowedDomains = domains) {
  await act(() =>
    root.render(
      <StrictMode>
        <FathomAnalytics siteId="TESTSITE" domains={allowedDomains} />
      </StrictMode>,
    ),
  );
}

function ready() {
  vi.stubGlobal("fathom", { trackPageview });
  script().dispatchEvent(new Event("load"));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fathom", undefined);
  vi.stubGlobal("__fathomClientQueue", []);
  vi.stubGlobal("__fathomIsLoading", false);
  // Exercise the real client without downloading a tracker or sending visits.
  // An inert script still lets us inspect attributes and deliver its load event.
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((name, options) => {
    const element = createElement(name, options);
    if (name === "script") element.setAttribute("type", "application/json");
    return element;
  });
  trackPageview.mockClear();
  route.pathname = "/";
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  document.querySelector("#fathom-script")?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FathomAnalytics", () => {
  it("does not load or track during server rendering", () => {
    expect(
      renderToStaticMarkup(
        <FathomAnalytics siteId="TESTSITE" domains={domains} />,
      ),
    ).toBe("");
    expect(document.querySelector("#fathom-script")).toBeNull();
    expect(window.__fathomClientQueue).toEqual([]);
  });

  it("loads one async script after mounting and counts once in Strict Mode", async () => {
    await render();
    expect(script().src).toBe("https://cdn.usefathom.com/script.js");
    expect(script().async).toBe(true);
    expect(script().dataset.site).toBe("TESTSITE");
    expect(script().dataset.auto).toBe("false");
    expect(script().dataset.honorDnt).toBe("true");
    expect(script().dataset.spa).toBeUndefined();
    expect(trackPageview).not.toHaveBeenCalled();
    ready();
    ready();
    await render();
    expect(trackPageview).toHaveBeenCalledExactlyOnceWith({ url: "/" });
    expect(document.querySelectorAll("#fathom-script")).toHaveLength(1);
  });

  it("tracks path changes and back navigation without query or hash data", async () => {
    await render();
    ready();
    route.pathname = "/brand";
    await render();
    await render();
    route.pathname = "/";
    await render();
    // usePathname does not change for ?query or #anchor updates.
    await render();
    expect(trackPageview.mock.calls).toEqual([
      [{ url: "/" }],
      [{ url: "/brand" }],
      [{ url: "/" }],
    ]);
    expect(document.querySelectorAll("#fathom-script")).toHaveLength(1);
  });

  it("queues pageviews safely while the script is loading", async () => {
    await render();
    route.pathname = "/brand";
    await render();
    expect(trackPageview).not.toHaveBeenCalled();
    expect(document.querySelectorAll("#fathom-script")).toHaveLength(1);
    ready();
    expect(trackPageview.mock.calls).toEqual([
      [{ url: "/" }],
      [{ url: "/brand" }],
    ]);
    expect(window.__fathomClientQueue).toEqual([]);
  });

  it("does not load or queue on an unapproved or suffix-matching host", async () => {
    await render(["example.test", `not-${window.location.hostname}`]);
    expect(document.querySelector("#fathom-script")).toBeNull();
    expect(window.__fathomClientQueue).toEqual([]);
    expect(trackPageview).not.toHaveBeenCalled();
  });

  it("does not interrupt rendering or retry when the tracker is blocked", async () => {
    await render();
    script().dispatchEvent(new Event("error"));
    route.pathname = "/brand";
    await render();
    expect(trackPageview).not.toHaveBeenCalled();
    expect(document.querySelectorAll("#fathom-script")).toHaveLength(1);
    expect(container.textContent).toBe("");
  });
});
