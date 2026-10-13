import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroAnimation } from "./HeroAnimation";

const approvedTitles = [
  "Add regression evals for tool selection",
  "Rank unscored RAG results last",
  "Enforce per-run token budgets",
  "Dedupe rows in SCD2 snapshots",
  "Derive last-touch channel for attribution model",
  "Account for null keys in order enrichment",
  "Retry preempted workflow pods",
  "Backfill missing daily partitions",
  "Flatten nested API payloads",
  "Push down time-range predicates",
  "Reconcile schema drift across files",
  "Rewrite lookups with LAG/LEAD",
  "Reestablish CDC after slot invalidation",
  "Handle late arrivals in session windows",
  "Route failed messages to a DLQ",
  "Mitigate skew due to hot keys",
  "Reduce memory use in rolling aggregations",
  "Batch document embeddings during indexing",
  "Preserve errors in agent traces",
  "Capture lineage for computed columns",
  "Redact sensitive fields before trace export",
  "Detect out-of-band resource changes",
  "Restore remote cache hits in multi-target builds",
  "Pin deployment images to immutable digests",
];

describe("HeroAnimation", () => {
  it("shows each of the 24 approved tasks once", () => {
    const html = renderToStaticMarkup(<HeroAnimation />);
    const cardCount = [...html.matchAll(/data-task-card="\d+"/g)].length;

    expect(cardCount).toBe(approvedTitles.length);
    expect(html).toContain("tabler-icon-file-text");
    expect(html).toContain(">evals.py</span>");
    for (const title of approvedTitles) {
      expect(html).toContain(`>${title}</span>`);
    }
  });
});
