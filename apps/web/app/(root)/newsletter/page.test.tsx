import { expect, it, vi } from "vitest";
import { site } from "@/lib/metadata";
import { generateMetadata } from "./page";

vi.mock("server-only", () => ({}));

it("keeps pagination self-canonical and only noindexes alternative sorting", async () => {
  for (const sort of ["newest", "oldest"]) {
    const metadata = await generateMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ page: "2", sort, utm_source: "preview" }),
    });
    expect(metadata.alternates?.canonical).toBe(
      `${site.url}/newsletter?${sort === "oldest" ? "sort=oldest&" : ""}page=2`,
    );
    expect(metadata.robots).toEqual(
      sort === "oldest" ? { index: false, follow: true } : undefined,
    );
  }
});
