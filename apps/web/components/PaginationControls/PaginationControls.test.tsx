import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PaginationControls } from "./PaginationControls";

it("preserves filters while replacing the page and omitting page one", () => {
  const query = { q: "data & AI", page: "99" };
  const html = renderToStaticMarkup(
    <MantineProvider>
      <PaginationControls
        page={2}
        total={3}
        pathname="/resources"
        query={query}
        anchor="results"
        label="Resource pages"
      />
    </MantineProvider>,
  );

  expect(html).toContain('aria-label="Resource pages"');
  expect(html).toContain('href="/resources?q=data+%26+AI#results"');
  expect(html).toContain('href="/resources?q=data+%26+AI&amp;page=2#results"');
  expect(html).toContain('href="/resources?q=data+%26+AI&amp;page=3#results"');
  expect(html).not.toContain("page=99");
  expect(query).toEqual({ q: "data & AI", page: "99" });
});

it("works without newsletter-specific query parameters, anchors or labels", () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <PaginationControls page={1} total={2} pathname="/resources" />
    </MantineProvider>,
  );

  expect(html).toContain('aria-label="Pagination"');
  expect(html).toContain('href="/resources"');
  expect(html).toContain('href="/resources?page=2"');
});

it.each([0, 1])("omits controls for %i pages", (total) => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <PaginationControls page={1} total={total} pathname="/resources" />
    </MantineProvider>,
  );

  expect(html).not.toContain("<nav");
});
