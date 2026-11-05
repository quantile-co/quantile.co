import { MantineProvider } from "@mantine/core";
import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { Header } from "./Header";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

it.each([
  ["/", "/"],
  ["/newsletter", "/newsletter"],
  ["/newsletter/placeholder-01", "/newsletter"],
  ["/consulting", "/consulting"],
  ["/brand", null],
  ["/newsletter-other", null],
])("marks the current navigation destination for %s", (pathname, href) => {
  vi.mocked(usePathname).mockReturnValue(pathname);
  const html = renderToStaticMarkup(
    <MantineProvider>
      <Header />
    </MantineProvider>,
  );
  const currentLinks =
    html.match(/<a\b[^>]*aria-current="(?:page|location)"[^>]*>/g) ?? [];
  expect(currentLinks).toHaveLength(href ? 1 : 0);
  if (href) expect(currentLinks[0]).toContain(`href="${href}"`);
});
