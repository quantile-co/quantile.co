"use client";

import {
  IconActivity,
  IconBox,
  IconCheck,
  IconClock,
  IconCode,
  IconFileText,
  IconGitCommit,
  IconGitMerge,
  IconGitPullRequest,
  IconHistory,
  IconMessageCircle,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { useAnimate } from "motion/react-mini";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import classes from "./BenefitsAnimation.module.css";

// One illustrative issue, not live customer activity or a delivery-time promise.
const activity = [
  {
    author: "AJ Welch",
    day: "Day 1",
    label: "Investigation",
    updates: [
      ["Found", "Late-event gap reproduced."],
      ["Next", "Bounded replay + AI tests."],
      ["Need", "Your retention policy."],
    ],
    detail: "AI-assisted regression tests",
    icon: IconCode,
    artifact: "tests",
    signals: ["cutoff", "replay", "duplicates"],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 1",
    label: "Code review",
    updates: [
      ["Change", "Configurable lateness threshold."],
      ["Pattern", "Use existing pipeline settings."],
      ["Verify", "Cover events at the cutoff."],
    ],
    detail: "Changes requested",
    icon: IconMessageCircle,
    artifact: "review",
    signals: [],
    duration: 3000,
  },
  {
    author: "AJ Welch",
    day: "Day 2",
    label: "Revision pushed",
    updates: [
      ["Updated", "Your config pattern, reused."],
      ["Tested", "Events exactly at the cutoff."],
      ["Next", "Agree on recovery policy."],
    ],
    detail: "Review comment resolved",
    icon: IconGitCommit,
    artifact: "config",
    signals: ["config", "tests"],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 2",
    label: "Technical discussion",
    updates: [
      ["Discuss", "Retention and replay trade-offs."],
      ["Goal", "Keep live state bounded."],
      ["Format", "Optional 30-minute call."],
    ],
    detail: "Weekly sync · 30 min · Optional",
    icon: IconVideo,
    artifact: "sync",
    signals: [],
    duration: 3200,
  },
  {
    author: "AJ Welch",
    day: "Day 2",
    label: "Technical sync",
    updates: [],
    detail: "30 min · Optional",
    icon: IconVideo,
    artifact: null,
    signals: [],
    duration: 3200,
  },
  {
    author: "AJ Welch",
    day: "Day 3",
    label: "Decision documented",
    updates: [
      ["Decided", "Bound live state; replay older events."],
      ["Added", "Recovery runbook in the PR."],
      ["Blockers", "None — ready for review."],
    ],
    detail: "PR #1979 updated",
    icon: IconFileText,
    artifact: "replay",
    signals: [],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 3",
    label: "Approved",
    updates: [
      ["Reviewed", "Config, cutoff tests, recovery."],
      ["Standards", "Matches our pipeline patterns."],
      ["Decision", "Approved — ready to merge."],
    ],
    detail: "Approved by your team",
    icon: IconCheck,
    artifact: "checks",
    signals: [],
    duration: 2600,
  },
  {
    author: "AJ Welch",
    day: "Day 3",
    label: "Merged",
    updates: [
      ["Shipped", "Late-event handling + replay."],
      ["Handoff", "Recovery runbook included."],
      ["Closed", "Issue #1941."],
    ],
    detail: "PR #1979 merged · Issue #1941 closed",
    icon: IconGitMerge,
    artifact: "merged",
    signals: ["lint", "tests", "build"],
    duration: 3200,
  },
] as const;

type ArtifactKind = Exclude<(typeof activity)[number]["artifact"], null>;

function Artifact({ kind }: { kind: ArtifactKind }) {
  let visual: ReactNode;
  switch (kind) {
    case "tests":
      visual = (
        <>
          <span className={classes.artifactLabel}>edge cases</span>
          <div className={classes.testDots}>
            <span>late</span>
            <span>cutoff</span>
            <span>replay</span>
          </div>
        </>
      );
      break;
    case "review":
      visual = (
        <>
          <div className={classes.reviewNote}>
            <IconMessageCircle />
            <span>threshold?</span>
          </div>
          <span className={classes.reviewLine} />
          <span className={classes.reviewLine} />
        </>
      );
      break;
    case "config":
      visual = (
        <>
          <span className={classes.artifactLabel}>config</span>
          <div className={classes.diffLine}>
            <span>−</span>
            <i />
          </div>
          <div className={classes.diffLine}>
            <span>+</span>
            <i />
          </div>
        </>
      );
      break;
    case "sync":
      visual = (
        <>
          <div className={classes.syncIcon}>
            <IconVideo />
          </div>
          <span className={classes.artifactLabel}>optional sync</span>
        </>
      );
      break;
    case "replay":
      visual = (
        <div className={classes.replayPaths}>
          <span>
            <IconActivity /> live <b>→</b> <IconBox /> bounded
          </span>
          <span>
            <IconClock /> late <b>→</b> <IconHistory /> replay
          </span>
        </div>
      );
      break;
    case "checks":
      visual = (
        <>
          <div className={classes.checkMarks}>
            <IconCheck />
            <IconCheck />
            <IconCheck />
          </div>
          <span className={classes.artifactLabel}>review passed</span>
        </>
      );
      break;
    case "merged":
      visual = (
        <>
          <div className={classes.mergePaths}>
            <span />
            <span />
            <IconGitMerge />
          </div>
          <span className={classes.artifactLabel}>landed</span>
        </>
      );
      break;
  }
  return (
    <div className={classes.artifact} data-artifact-kind={kind}>
      {visual}
    </div>
  );
}

export function BenefitsAnimationTwo() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [sequence, setSequence] = useState(0);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const running = inView && pageVisible && !reducedMotion;
  const displayedSequence = reducedMotion ? 2 : sequence;
  const displayedIndex = displayedSequence % activity.length;
  const previousFrame = useRef<{ index: number; running: boolean } | null>(
    null,
  );

  const position = (index: number) => {
    const age = (displayedIndex - index + activity.length) % activity.length;
    return age <= displayedSequence && age <= 2 ? age : 3;
  };

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (scope.current) observer.observe(scope.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [scope]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setSequence((value) => value + 1),
      activity[displayedIndex].duration,
    );
    return () => window.clearTimeout(timer);
  }, [displayedIndex, running]);

  // Install the entry keyframes in the same commit as the slot change. A
  // passive effect can paint the settled CSS position for one frame first.
  useLayoutEffect(() => {
    const previous = previousFrame.current;
    previousFrame.current = { index: displayedIndex, running };
    // Entering the viewport or resuming a tab must not replay the entry of
    // an already-visible card. Animate only a genuine next-card transition.
    if (
      !running ||
      !scope.current ||
      !previous?.running ||
      previous.index === displayedIndex
    )
      return;
    const cards = Array.from(
      scope.current.querySelectorAll<HTMLElement>("[data-activity]"),
    );
    const viewport = scope.current.querySelector<HTMLElement>(
      "[data-thread-viewport]",
    );
    if (!viewport) return;

    // Each update takes the foreground while its predecessor lifts into the
    // history. Percentage-based exits keep the cards clear of the header.
    const controls = cards.flatMap((card) => {
      const slot = Number(card.dataset.position);
      if (slot > 2) return [];
      const from =
        slot === 0
          ? `translateY(${viewport.clientHeight}px)`
          : slot === 1
            ? "translateY(var(--active-card-y))"
            : "translateY(calc(-100% + 4px))";
      const to =
        slot === 0
          ? "translateY(var(--active-card-y))"
          : slot === 1
            ? "translateY(calc(-100% + 4px))"
            : "translateY(calc(-100% - 48px))";
      return [
        animate(
          card,
          {
            transform: [from, to],
            opacity: [
              slot === 0 ? 0 : slot === 1 ? 1 : 0.22,
              slot === 0 ? 1 : slot === 1 ? 0.22 : 0,
            ],
            visibility: "visible",
          },
          { duration: 0.52, ease: "easeInOut" },
        ),
      ];
    });

    const current = cards[displayedIndex];
    current
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((piece, index) => {
        controls.push(
          animate(
            piece,
            {
              opacity: [0, 1],
              transform: [
                "translateY(7px) scale(0.96)",
                "translateY(0px) scale(1)",
              ],
            },
            { duration: 0.14, delay: 0.4 + index * 0.14, ease: "easeOut" },
          ),
        );
      });
    current
      .querySelectorAll<HTMLElement>("[data-speaking-bar]")
      .forEach((bar, index) => {
        controls.push(
          animate(
            bar,
            {
              transform: [
                "scaleY(0.35)",
                "scaleY(1)",
                "scaleY(0.5)",
                "scaleY(0.8)",
                "scaleY(0.35)",
              ],
            },
            {
              duration: 0.6,
              delay: 0.8 + index * 0.1,
              repeat: 2,
              ease: "easeInOut",
            },
          ),
        );
      });
    const stamp = current.querySelector<HTMLElement>("[data-merge-stamp]");
    if (stamp)
      controls.push(
        animate(
          stamp,
          {
            transform: [
              "scale(0.65) rotate(-15deg)",
              "scale(1.08) rotate(3deg)",
              "scale(1) rotate(0deg)",
            ],
          },
          { duration: 0.4, delay: 0.28, ease: "easeOut" },
        ),
      );

    return () => {
      // Cancel rather than commit styles: a card may already be hidden on a
      // loop or preference change. CSS supplies the settled, static positions.
      for (const control of controls) control.cancel();
      for (const card of cards) {
        card.removeAttribute("style");
        card
          .querySelectorAll<HTMLElement>(
            "[data-reveal], [data-merge-stamp], [data-speaking-bar]",
          )
          .forEach((piece) => {
            piece.removeAttribute("style");
          });
      }
    };
  }, [animate, displayedIndex, running, scope]);

  return (
    <div
      aria-hidden="true"
      className={classes.scene}
      ref={scope}
      data-benefits-animation="two"
    >
      <div className={classes.issueHeader}>
        <span className={classes.issueIcon}>
          <IconGitPullRequest />
        </span>
        <div className={classes.issueCopy}>
          <strong>Handle late-arriving events</strong>
          <span>
            #1941 <span className={classes.separator}>·</span> streaming
          </span>
        </div>
        <span className={classes.prStatus}>
          {displayedIndex === activity.length - 1
            ? "Merged"
            : displayedIndex === activity.length - 2
              ? "Approved"
              : "In progress"}
        </span>
      </div>

      <div className={classes.flow} data-thread-viewport>
        {activity.map((entry, index) => {
          const isMerged = index === activity.length - 1;
          const isCall = entry.label === "Technical sync";
          const DetailIcon = entry.icon;
          return (
            <div
              className={classes.entry}
              data-activity={index}
              data-current={index === displayedIndex || undefined}
              data-position={position(index)}
              data-merged={isMerged || undefined}
              key={entry.label}
            >
              {isMerged ? (
                <div className={classes.mergeHeading}>
                  <span className={classes.mergeStamp} data-merge-stamp>
                    <IconGitMerge />
                  </span>
                  <strong>PR #1979</strong>
                  <span className={classes.mergeOutcome}>Merged</span>
                  <span className={classes.day}>{entry.day}</span>
                </div>
              ) : (
                <div className={classes.messageMeta}>
                  <span
                    className={classes.avatar}
                    data-aj={
                      (!isCall && entry.author === "AJ Welch") || undefined
                    }
                  >
                    {isCall ? (
                      <IconVideo />
                    ) : (
                      entry.author === "Your team" && <IconMessageCircle />
                    )}
                  </span>
                  <strong>{isCall ? "Technical sync" : entry.author}</strong>
                  <span className={classes.label}>
                    {isCall ? "Recovery" : entry.label}
                  </span>
                  <span className={classes.day}>{entry.day}</span>
                </div>
              )}
              {isCall ? (
                <div className={classes.callRoom} data-call-room>
                  <div className={classes.participant} data-reveal>
                    <span className={classes.callPortrait} />
                    <span className={classes.participantName}>AJ Welch</span>
                    <span className={classes.speaking}>
                      {[0, 1, 2].map((bar) => (
                        <span data-speaking-bar key={bar} />
                      ))}
                    </span>
                  </div>
                  <div className={classes.participant} data-reveal>
                    <IconUsers />
                    <span className={classes.participantName}>Your team</span>
                  </div>
                </div>
              ) : (
                <div className={classes.body}>
                  <dl className={classes.updates}>
                    {entry.updates.map(([label, text]) => (
                      <div
                        className={classes.updateRow}
                        data-reveal
                        key={label}
                      >
                        <dt>{label}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                  {entry.artifact && <Artifact kind={entry.artifact} />}
                </div>
              )}
              <div className={classes.result}>
                <div className={classes.detail} data-reveal>
                  <DetailIcon />
                  <span className={classes.detailText}>{entry.detail}</span>
                </div>
                {entry.signals.length > 0 && (
                  <div className={classes.signals}>
                    {entry.signals.map((signal) => (
                      <span key={signal} data-reveal>
                        <IconCheck />
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
