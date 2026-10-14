"use client";

import { IconFileText } from "@tabler/icons-react";
import { useAnimate } from "motion/react-mini";
import { useEffect, useState } from "react";
import classes from "./HeroAnimation.module.css";

const tasks = [
  {
    issue: "#1642",
    title: "Add regression evals for tool selection",
    tags: ["evals", "agents"],
    file: "evals.py",
    pullRequestNumber: "#1671",
    pullRequest: "Tool selection evals added",
  },
  {
    issue: "#2051",
    title: "Account for null keys in order enrichment",
    tags: ["modeling", "nulls"],
    file: "orders.sql",
    pullRequestNumber: "#2089",
    pullRequest: "Null keys accounted for",
  },
  {
    issue: "#1769",
    title: "Mitigate skew due to hot keys",
    tags: ["perf", "skew"],
    file: "Sessions.java",
    pullRequestNumber: "#1803",
    pullRequest: "Hot key skew mitigated",
  },
  {
    issue: "#1867",
    title: "Derive last touch channel for attribution model",
    tags: ["modeling", "attribution"],
    file: "attribution.sql",
    pullRequestNumber: "#1902",
    pullRequest: "Last touch channel derived",
  },
  {
    issue: "#2098",
    title: "Route failed messages to a DLQ",
    tags: ["streaming", "dlq"],
    file: "DLQRouter.java",
    pullRequestNumber: "#2135",
    pullRequest: "Failed messages routed to DLQ",
  },
  {
    issue: "#2176",
    title: "Pin deployment images to immutable digests",
    tags: ["infra", "images"],
    file: "images.yaml",
    pullRequestNumber: "#2204",
    pullRequest: "Deployment images pinned",
  },
  {
    issue: "#1691",
    title: "Retry preempted workflow pods",
    tags: ["orchestration", "pods"],
    file: "pipeline.py",
    pullRequestNumber: "#1720",
    pullRequest: "Workflow retries added",
  },
  {
    issue: "#1916",
    title: "Reconcile schema drift across files",
    tags: ["storage", "schema"],
    file: "Schema.java",
    pullRequestNumber: "#1948",
    pullRequest: "Schema drift reconciled",
  },
  {
    issue: "#1846",
    title: "Rank unscored RAG results last",
    tags: ["rag", "ranking"],
    file: "rank.py",
    pullRequestNumber: "#1879",
    pullRequest: "Unscored results ranked last",
  },
  {
    issue: "#1820",
    title: "Detect out-of-band resource changes",
    tags: ["infra", "drift"],
    file: "resources.tf",
    pullRequestNumber: "#1853",
    pullRequest: "Out-of-band changes detected",
  },
  {
    issue: "#1965",
    title: "Reduce memory use in rolling aggregations",
    tags: ["perf", "memory"],
    file: "metrics.py",
    pullRequestNumber: "#1998",
    pullRequest: "Rolling memory reduced",
  },
  {
    issue: "#1941",
    title: "Handle late arriving events",
    tags: ["streaming", "lateness"],
    file: "Pipeline.java",
    pullRequestNumber: "#1979",
    pullRequest: "Late arrivals handled",
  },
  {
    issue: "#2078",
    title: "Rewrite lookups with LAG/LEAD",
    tags: ["query", "window"],
    file: "lookups.sql",
    pullRequestNumber: "#2112",
    pullRequest: "Window lookups simplified",
  },
  {
    issue: "#2066",
    title: "Flatten nested API payloads",
    tags: ["ingestion", "api"],
    file: "Mapper.java",
    pullRequestNumber: "#2101",
    pullRequest: "Nested payloads flattened",
  },
  {
    issue: "#2151",
    title: "Redact sensitive fields before trace export",
    tags: ["privacy", "traces"],
    file: "tracing.py",
    pullRequestNumber: "#2182",
    pullRequest: "Trace exports redacted",
  },
  {
    issue: "#2014",
    title: "Restore remote cache hits in multi-target builds",
    tags: ["ci", "cache"],
    file: "builds.yaml",
    pullRequestNumber: "#2050",
    pullRequest: "Remote build cache restored",
  },
  {
    issue: "#2036",
    title: "Enforce per run token budgets",
    tags: ["agents", "budget"],
    file: "Budget.java",
    pullRequestNumber: "#2072",
    pullRequest: "Token budgets enforced",
  },
  {
    issue: "#2124",
    title: "Batch document embeddings during indexing",
    tags: ["perf", "embeddings"],
    file: "indexing.py",
    pullRequestNumber: "#2158",
    pullRequest: "Embedding requests batched",
  },
  {
    issue: "#1743",
    title: "Reestablish CDC after slot invalidation",
    tags: ["cdc", "postgres"],
    file: "postgres.yaml",
    pullRequestNumber: "#1774",
    pullRequest: "CDC replication restored",
  },
  {
    issue: "#1892",
    title: "Backfill missing daily partitions",
    tags: ["backfill", "daily"],
    file: "backfill.py",
    pullRequestNumber: "#1927",
    pullRequest: "Daily partitions backfilled",
  },
  {
    issue: "#1989",
    title: "Capture lineage for computed columns",
    tags: ["lineage", "columns"],
    file: "Columns.java",
    pullRequestNumber: "#2025",
    pullRequest: "Computed column lineage captured",
  },
  {
    issue: "#1717",
    title: "Push down time range predicates",
    tags: ["query", "pushdown"],
    file: "events.sql",
    pullRequestNumber: "#1748",
    pullRequest: "Time range filters pushed down",
  },
  {
    issue: "#1794",
    title: "Preserve errors in agent traces",
    tags: ["observability", "agents"],
    file: "tracing.py",
    pullRequestNumber: "#1828",
    pullRequest: "Agent errors traced",
  },
  {
    issue: "#1668",
    title: "Dedupe rows in SCD2 snapshots",
    tags: ["modeling", "scd2"],
    file: "history.sql",
    pullRequestNumber: "#1695",
    pullRequest: "Snapshot rows deduplicated",
  },
] as const;

const codeLines = ["1", "2", "3", "4"] as const;
const checks = ["lint", "tests", "build"] as const;
const queueDepth = 5;

const queueCardFilter = (slot: number) => {
  if (slot <= 2) return "none";
  if (slot === 3) return "opacity(0.32)";
  if (slot === 4) return "opacity(0.08)";
  return "opacity(0.02)";
};

const pause = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const nextFrame = () =>
  new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const wrapTaskIndex = (index: number) => (index + tasks.length) % tasks.length;

const initialPosition = (index: number) =>
  index < queueDepth ? `todo-${index + 1}` : undefined;

export function HeroAnimation() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const activeTask = tasks[activeTaskIndex];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;
    const cssValue = (property: string) => {
      if (!scope.current) return "0";
      return getComputedStyle(scope.current).getPropertyValue(property).trim();
    };
    const cardSelector = (index: number) =>
      `[data-task-card='${wrapTaskIndex(index)}']`;

    const resetPanels = () =>
      Promise.all([
        animate(
          "[data-active-panel], [data-merged-panel]",
          {
            transform: "translateY(6px) scale(0.98)",
            visibility: "hidden",
          },
          { duration: 0 },
        ),
        animate(
          "[data-code-line]",
          { transform: "scaleX(0.22)", visibility: "hidden" },
          { duration: 0 },
        ),
        animate(
          "[data-check]",
          { transform: "scale(0.86)", visibility: "hidden" },
          { duration: 0 },
        ),
        animate(
          "[data-merge-mark]",
          { transform: "scale(0.6)", visibility: "hidden" },
          { duration: 0 },
        ),
      ]);

    const resetCards = () =>
      Promise.all(
        tasks.map((_, index) => {
          const position = initialPosition(index);
          const slot = position?.at(-1);

          return animate(
            cardSelector(index),
            {
              filter: position
                ? queueCardFilter(Number(slot))
                : "opacity(0.005)",
              top: position
                ? cssValue(`--todo-card-${slot}-top`)
                : cssValue("--todo-card-entry-top"),
              transform: position ? "scale(1)" : "scale(0.94)",
              translate: "0px",
              visibility: position ? "visible" : "hidden",
            },
            { duration: 0 },
          );
        }),
      );

    const resetAssignees = () =>
      animate(
        "[data-assignee]",
        {
          opacity: 0,
          transform: "translateY(-50%) scale(0.6)",
          visibility: "hidden",
        },
        { duration: 0 },
      );

    const run = async () => {
      await Promise.all([resetCards(), resetPanels(), resetAssignees()]);

      let completedCount = 0;
      let index = 0;
      while (!isCancelled()) {
        if (completedCount > 0) {
          setActiveTaskIndex(index);
          await nextFrame();
          if (isCancelled()) return;

          await resetPanels();
          await pause(180);
          if (isCancelled()) return;
        }

        const nextTodoIndex = wrapTaskIndex(index + queueDepth);
        const doneOldestIndex = wrapTaskIndex(index - queueDepth);

        await Promise.all([
          animate(
            `[data-assignee='${index}']`,
            {
              opacity: 1,
              transform: "translateY(-50%) scale(1)",
              visibility: "visible",
            },
            { duration: 0.14, ease: "easeOut" },
          ),
          animate(
            cardSelector(nextTodoIndex),
            {
              filter: "opacity(0.005)",
              top: cssValue("--todo-card-entry-top"),
              transform: "scale(1)",
              translate: "0px",
              visibility: "visible",
            },
            { duration: 0 },
          ),
        ]);
        if (isCancelled()) return;

        await Promise.all([
          animate(
            cardSelector(index),
            {
              top: cssValue("--in-progress-card-top"),
              translate: cssValue("--in-progress-card-offset"),
            },
            { duration: 0.52, ease: "easeInOut" },
          ),
          ...Array.from({ length: queueDepth - 1 }, (_, offset) =>
            animate(
              cardSelector(index + offset + 1),
              {
                filter: queueCardFilter(offset + 1),
                top: cssValue(`--todo-card-${offset + 1}-top`),
              },
              { duration: 0.52, ease: "easeInOut" },
            ),
          ),
          animate(
            cardSelector(nextTodoIndex),
            {
              filter: queueCardFilter(queueDepth),
              top: cssValue(`--todo-card-${queueDepth}-top`),
            },
            { duration: 0.52, ease: "easeInOut" },
          ),
        ]);
        if (isCancelled()) return;

        await animate(
          "[data-active-panel]",
          {
            transform: "translateY(0px) scale(1)",
            visibility: "visible",
          },
          { duration: 0.22, ease: "easeOut" },
        );
        if (isCancelled()) return;

        for (const line of codeLines) {
          await animate(
            `[data-code-line='${line}']`,
            { transform: "scaleX(1)", visibility: "visible" },
            { duration: 0.14, ease: "easeOut" },
          );
          if (isCancelled()) return;
        }

        for (const check of checks) {
          await animate(
            `[data-check='${check}']`,
            { transform: "scale(1)", visibility: "visible" },
            { duration: 0.14, ease: "easeOut" },
          );
          if (isCancelled()) return;
        }

        await pause(475);
        if (isCancelled()) return;

        await Promise.all([
          animate(
            "[data-active-panel]",
            {
              transform: "translateY(-4px) scale(0.98)",
              visibility: "hidden",
            },
            { duration: 0.12, ease: "easeIn" },
          ),
          animate(
            "[data-code-line], [data-check]",
            { visibility: "hidden" },
            { duration: 0.12 },
          ),
        ]);
        if (isCancelled()) return;

        await Promise.all([
          animate(
            "[data-merged-panel]",
            {
              transform: "translateY(0px) scale(1)",
              visibility: "visible",
            },
            { duration: 0.18, ease: "easeOut" },
          ),
          animate(
            "[data-merge-mark]",
            { transform: "scale(1)", visibility: "visible" },
            { duration: 0.18, ease: "easeOut" },
          ),
        ]);

        await pause(600);
        if (isCancelled()) return;

        await Promise.all([
          animate(
            "[data-merged-panel]",
            {
              transform: "translateY(-4px) scale(0.98)",
              visibility: "hidden",
            },
            { duration: 0.18, ease: "easeIn" },
          ),
          animate(
            "[data-merge-mark]",
            { transform: "scale(0.6)", visibility: "hidden" },
            { duration: 0.18, ease: "easeIn" },
          ),
        ]);
        if (isCancelled()) return;

        const doneShiftCount = Math.min(completedCount, queueDepth - 1);
        const doneIsOverflowing = completedCount >= queueDepth;
        await Promise.all([
          animate(
            cardSelector(index),
            {
              top: cssValue("--done-card-1-top"),
              translate: cssValue("--done-card-offset"),
            },
            { duration: 0.52, ease: "easeInOut" },
          ),
          ...Array.from({ length: doneShiftCount }, (_, offset) =>
            animate(
              cardSelector(index - offset - 1),
              {
                filter: queueCardFilter(offset + 2),
                top: cssValue(`--done-card-${offset + 2}-top`),
              },
              { duration: 0.52, ease: "easeInOut" },
            ),
          ),
          ...(doneIsOverflowing
            ? [
                animate(
                  cardSelector(doneOldestIndex),
                  {
                    filter: "opacity(0.005)",
                    top: cssValue("--done-card-exit-top"),
                  },
                  { duration: 0.52, ease: "easeInOut" },
                ),
              ]
            : []),
        ]);
        if (isCancelled()) return;

        await Promise.all([
          ...(doneIsOverflowing
            ? [
                animate(
                  cardSelector(doneOldestIndex),
                  { visibility: "hidden" },
                  { duration: 0 },
                ),
              ]
            : []),
          animate(
            `[data-assignee='${index}']`,
            {
              opacity: 0,
              transform: "translateY(-50%) scale(0.6)",
              visibility: "hidden",
            },
            { duration: 0.12, ease: "easeIn" },
          ),
        ]);

        completedCount += 1;
        index = wrapTaskIndex(index + 1);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [animate, scope]);

  return (
    <div aria-hidden="true" className={classes.scene} ref={scope}>
      <span className={`${classes.columnLabel} ${classes.todoLabel}`}>
        Todo
      </span>
      <span className={`${classes.columnLabel} ${classes.activeLabel}`}>
        In progress
      </span>
      <span className={`${classes.columnLabel} ${classes.doneLabel}`}>
        Done
      </span>

      {tasks.map((task, index) => (
        <div
          className={`${classes.taskCard} ${classes.movingCard}`}
          data-initial-position={initialPosition(index)}
          data-task-card={String(index)}
          key={task.issue}
        >
          <span className={classes.issueCopy}>
            <span className={classes.issueTitle}>{task.title}</span>
            <span className={classes.issueMeta}>
              <span className={classes.issueNumber}>{task.issue}</span>
              <span className={classes.issueTags}>
                {task.tags.map((tag, tagIndex) => (
                  <span
                    className={`${classes.issueTag} ${tagIndex > 0 ? classes.optionalIssueTag : ""}`}
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </span>
          </span>
          <span className={classes.assignee} data-assignee={String(index)} />
        </div>
      ))}

      <div className={classes.activePanel} data-active-panel>
        <div className={classes.fileHeader}>
          <IconFileText aria-hidden="true" className={classes.fileIcon} />
          <span className={classes.fileName}>{activeTask.file}</span>
          <span className={classes.changeCount}>+18</span>
        </div>
        <div className={classes.code}>
          {codeLines.map((line) => (
            <span className={classes.codeRow} data-code-line={line} key={line}>
              <span className={classes.plus}>+</span>
              <span className={classes.codeLine} />
            </span>
          ))}
        </div>
        <div className={classes.checks}>
          {checks.map((check) => (
            <span className={classes.check} data-check={check} key={check}>
              <span className={classes.smallCheck}>✓</span>
              {check}
            </span>
          ))}
        </div>
      </div>

      <div className={classes.mergedPanel} data-merged-panel>
        <span className={classes.mergeMark} data-merge-mark>
          ✓
        </span>
        <span className={classes.pullRequest}>
          PR {activeTask.pullRequestNumber}
        </span>
        <strong className={classes.mergeTitle}>{activeTask.pullRequest}</strong>
        <span className={classes.mergeMeta}>All checks passed</span>
        <span className={classes.mergedBadge}>Merged</span>
      </div>
    </div>
  );
}
