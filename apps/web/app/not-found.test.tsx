import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import NotFound from "./not-found";

it("offers a way home without obsolete navigation or forms", () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <NotFound />
    </MantineProvider>,
  );
  expect(html).toContain(">Page not found.</h1>");
  expect(html).toContain('href="/">Back to home');
  expect(html).toContain('href="#main-content"');
  expect(html).toContain('id="main-content"');
  expect(html).not.toMatch(/<form|<header|<footer|billing|checkout/i);
});
