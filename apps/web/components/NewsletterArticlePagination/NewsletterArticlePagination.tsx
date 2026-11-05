"use client";

import { Group, Pagination } from "@mantine/core";
import Link from "next/link";

export function NewsletterArticlePagination({
  page,
  total,
  pathname,
  sort = "newest",
}: {
  page: number;
  total: number;
  pathname: "/" | "/newsletter";
  sort?: string;
}) {
  if (total <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    if (sort === "oldest") params.set("sort", "oldest");
    if (target > 1) params.set("page", String(target));
    return `${pathname}${params.size ? `?${params}` : ""}#articles`;
  }

  return (
    <Group component="nav" aria-label="Article pages" justify="center" py="xl">
      <Pagination
        value={page}
        total={total}
        getItemProps={(number) => ({
          component: Link,
          href: href(number),
          "aria-label": `Page ${number}`,
        })}
        getControlProps={(control) => ({
          component: Link,
          href: href(
            control === "previous"
              ? Math.max(1, page - 1)
              : Math.min(total, page + 1),
          ),
          "aria-label": control === "previous" ? "Previous page" : "Next page",
        })}
      />
    </Group>
  );
}
