"use client";

import { useAnimate } from "motion/react-mini";
import { useEffect, useState } from "react";
import classes from "./FractionalWorkstream.module.css";

const tasks = [
  {
    issue: "#1642",
    title: "Fix Airflow retry handling",
    tags: ["fix", "airflow"],
    file: "dags/orders.py",
    pullRequestNumber: "#1671",
    pullRequest: "Retry handling fixed",
  },
  {
    issue: "#1668",
    title: "Backfill missing order dates",
    tags: ["dq", "orders"],
    file: "jobs/orders_backfill.sql",
    pullRequestNumber: "#1695",
    pullRequest: "Order dates backfilled",
  },
  {
    issue: "#1691",
    title: "Add schema inference",
    tags: ["feature", "ingestion"],
    file: "ingestion/schema.py",
    pullRequestNumber: "#1720",
    pullRequest: "Schema inference added",
  },
  {
    issue: "#1717",
    title: "Optimize BQ slot utilization",
    tags: ["perf", "bigquery"],
    file: "infra/bigquery.tf",
    pullRequestNumber: "#1748",
    pullRequest: "Slot utilization optimized",
  },
  {
    issue: "#1743",
    title: "Configure & deploy Langfuse",
    tags: ["observability", "langfuse"],
    file: "agents/tracing.py",
    pullRequestNumber: "#1774",
    pullRequest: "Langfuse configured",
  },
  {
    issue: "#1769",
    title: "Make event ingestion idempotent",
    tags: ["reliability", "events"],
    file: "ingestion/events.py",
    pullRequestNumber: "#1803",
    pullRequest: "Idempotent ingestion added",
  },
  {
    issue: "#1794",
    title: "Reduce dashboard query latency",
    tags: ["perf", "clickhouse"],
    file: "marts/dashboard.sql",
    pullRequestNumber: "#1828",
    pullRequest: "Dashboard queries optimized",
  },
  {
    issue: "#1820",
    title: "Ingest ERP data into warehouse",
    tags: ["ingestion", "airbyte"],
    file: "sources/erp.yaml",
    pullRequestNumber: "#1853",
    pullRequest: "ERP ingestion connected",
  },
  {
    issue: "#1846",
    title: "Validate schemas across event producers",
    tags: ["contracts", "kafka"],
    file: "events/schemas.avsc",
    pullRequestNumber: "#1879",
    pullRequest: "Event schemas validated",
  },
  {
    issue: "#1867",
    title: "Model customer history with SCD2",
    tags: ["modeling", "snowflake"],
    file: "models/customer_history.sql",
    pullRequestNumber: "#1902",
    pullRequest: "Customer history modeled",
  },
  {
    issue: "#1892",
    title: "Configure CDC with Debezium",
    tags: ["cdc", "debezium"],
    file: "connectors/postgres.yaml",
    pullRequestNumber: "#1927",
    pullRequest: "CDC connector configured",
  },
  {
    issue: "#1916",
    title: "Model multi-touch revenue attribution",
    tags: ["analytics", "dbt"],
    file: "models/attribution.sql",
    pullRequestNumber: "#1948",
    pullRequest: "Attribution model added",
  },
  {
    issue: "#1941",
    title: "Automate GDPR data deletion",
    tags: ["privacy", "snowflake"],
    file: "privacy/deletions.py",
    pullRequestNumber: "#1979",
    pullRequest: "GDPR deletion automated",
  },
  {
    issue: "#1965",
    title: "Process fraud detection signals with Flink",
    tags: ["streaming", "flink"],
    file: "streaming/fraud.py",
    pullRequestNumber: "#1998",
    pullRequest: "Fraud detection deployed",
  },
  {
    issue: "#1989",
    title: "Sync customer segments to Salesforce",
    tags: ["activation", "hightouch"],
    file: "activation/segments.sql",
    pullRequestNumber: "#2025",
    pullRequest: "Customer segments synced",
  },
  {
    issue: "#2014",
    title: "Convert data lake tables to Iceberg",
    tags: ["migration", "iceberg"],
    file: "lakehouse/migrate.py",
    pullRequestNumber: "#2050",
    pullRequest: "Lake tables converted",
  },
  {
    issue: "#2036",
    title: "Define semantic metrics in Looker",
    tags: ["analytics", "looker"],
    file: "models/metrics.lkml",
    pullRequestNumber: "#2072",
    pullRequest: "Semantic metrics defined",
  },
  {
    issue: "#2051",
    title: "Eliminate skew in Spark joins",
    tags: ["perf", "spark"],
    file: "jobs/session_rollup.py",
    pullRequestNumber: "#2089",
    pullRequest: "Spark skew eliminated",
  },
  {
    issue: "#2066",
    title: "Build agent evaluation pipeline",
    tags: ["evals", "agents"],
    file: "agents/evaluate.py",
    pullRequestNumber: "#2101",
    pullRequest: "Agent evaluations added",
  },
  {
    issue: "#2078",
    title: "Handle out-of-order streaming events",
    tags: ["streaming", "beam"],
    file: "streaming/windowing.py",
    pullRequestNumber: "#2112",
    pullRequest: "Late events handled",
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

export function FractionalWorkstream() {
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
        setActiveTaskIndex(index);
        await nextFrame();
        if (isCancelled()) return;

        await resetPanels();
        await pause(completedCount === 0 ? 450 : 180);
        if (isCancelled()) return;

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

      <span className={`${classes.columnSurface} ${classes.todoSurface}`} />
      <span className={`${classes.columnSurface} ${classes.activeSurface}`} />
      <span className={`${classes.columnSurface} ${classes.doneSurface}`} />

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
          <span className={classes.fileIcon} />
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
