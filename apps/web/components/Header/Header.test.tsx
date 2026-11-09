import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Header } from "./Header";

it("links the wordmark home and renders the injected action", () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <Header
        action={<a href="https://cal.com/aj-welch/book-a-call">Book a call</a>}
      />
    </MantineProvider>,
  );
  expect(html).toContain('aria-label="Quantile home"');
  expect(html).toContain('href="/"');
  expect(html).toContain(
    'href="https://cal.com/aj-welch/book-a-call">Book a call</a>',
  );
  expect(html).not.toContain("Newsletter");
  expect(html).not.toContain(">Consulting</a>");
});
