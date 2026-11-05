"use client";

import { Group, Pagination } from "@mantine/core";
import Link from "next/link";

export function PaginationControls({
  page,
  total,
  pathname,
  query,
  anchor,
  label = "Pagination",
}: {
  page: number;
  total: number;
  pathname: string;
  query?: Record<string, string>;
  anchor?: string;
  label?: string;
}) {
  if (total <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    return `${pathname}${params.size ? `?${params}` : ""}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
  }

  return (
    <Group component="nav" aria-label={label} justify="center" py="xl">
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
