import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import RootLayout from "./layout";
import NotFound from "./not-found";

it("offers a way home and theme controls", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <NotFound />
    </RootLayout>,
  );
  expect(html).toContain(">Page not found.</h1>");
  expect(html).toContain("<header");
  expect(html).toContain("<footer");
  expect(html.match(/data-site-cta="booking"/g)).toHaveLength(1);
  expect(html.match(/aria-label="Quantile home"/g)).toHaveLength(2);
  expect(html).toContain("Select a display theme");
  expect(html).toContain('href="/">Back to home');
  expect(html).toContain('href="#main-content"');
  expect(html).toContain('id="main-content"');
  expect(html).not.toContain("<form");
});
