"use client";

import {
  IconCheck,
  IconCode,
  IconFileText,
  IconGitCommit,
  IconGitMerge,
  IconGitPullRequest,
  IconMessageCircle,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { useAnimate } from "motion/react-mini";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import classes from "./BenefitsAnimation.module.css";

// Illustrative client dialogue, not live activity, quoted comments, or a delivery-time promise.
// Technical inspiration: https://github.com/apache/beam/issues/18677
// https://github.com/apache/flink/pull/2093 and https://github.com/apache/flink/pull/18118
const activity = [
  {
    author: "AJ Welch",
    day: "Day 1",
    label: "Investigation",
    message:
      "I’ve reproduced the overlapping sessions. A late event creates a new session after the earlier window state has been cleared.",
    points: [
      "The regression test advances the watermark past window expiry.",
      "I’m checking events just before, at, and after the cutoff.",
    ],
    detail: "Regression tests added",
    icon: IconCode,
    signals: [],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 1",
    label: "Code review",
    message:
      "Thanks for tracking this down. Could we use our existing allowed lateness setting and cover an event exactly at the expiry boundary? I’d also like to keep the results unchanged for events arriving on time.",
    points: [],
    detail: "Changes requested",
    icon: IconMessageCircle,
    signals: [],
    duration: 3000,
  },
  {
    author: "AJ Welch",
    day: "Day 2",
    label: "Revision pushed",
    message:
      "I’ve updated the PR to use your existing setting. The regression test now fails without the fix and passes with it.",
    points: [
      "Events within allowed lateness still merge into the session.",
      "Events past the limit go to a side output so we can recover them.",
    ],
    detail: "Review comment resolved",
    icon: IconGitCommit,
    signals: ["tests"],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 2",
    label: "Technical discussion",
    message:
      "How much more state would we keep if we increased allowed lateness? Could we compare that with replaying older events?",
    points: [
      "Roughly how many events would we need to replay?",
      "Do we retain the source data long enough to recover them?",
    ],
    detail: "Weekly sync · 30 min · Optional",
    icon: IconVideo,
    signals: [],
    duration: 3200,
  },
  {
    author: "AJ Welch",
    day: "Day 2",
    label: "Technical sync",
    message: "",
    points: [],
    detail: "30 min · Optional",
    icon: IconVideo,
    signals: [],
    duration: 3200,
  },
  {
    author: "AJ Welch",
    day: "Day 3",
    label: "Decision documented",
    message:
      "We’ll keep the current allowed lateness setting and recover older events separately. That lets us keep the existing window state cleanup behavior.",
    points: [
      "We’ll save the side output so those events are available for replay.",
      "I’ve documented the replay limits and checks for duplicate writes in the PR.",
    ],
    detail: "PR #1979 updated",
    icon: IconFileText,
    signals: [],
    duration: 3600,
  },
  {
    author: "Your team",
    day: "Day 3",
    label: "Approved",
    message:
      "Thanks, the regression test and recovery steps look good to me. This is approved from our side once the required checks pass.",
    points: [],
    detail: "Approved by your team",
    icon: IconCheck,
    signals: [],
    duration: 2600,
  },
  {
    author: "AJ Welch",
    day: "Day 3",
    label: "Merged",
    message:
      "All checks passed, so I’ve merged this. The recovery steps are in the PR for your team. Replay tests also cover duplicate writes.",
    points: [],
    detail: "PR #1979 merged · Issue #1941 closed",
    icon: IconGitMerge,
    signals: ["lint", "tests", "build"],
    duration: 3200,
  },
] as const;

export function BenefitsAnimation2() {
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
      // Establish motion promptly on first viewing; subsequent loops use the
      // normal cadence. Offscreen and reduced-motion views still stay still.
      sequence === 0 ? 1200 : activity[displayedIndex].duration,
    );
    return () => window.clearTimeout(timer);
  }, [displayedIndex, running, sequence]);

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
      className={`${classes.scene} ${classes.conversation}`}
      ref={scope}
      data-benefits-animation="two"
    >
      <div className={classes.issueHeader}>
        <span className={classes.issueIcon}>
          <IconGitPullRequest />
        </span>
        <div className={classes.issueCopy}>
          <strong>Handle late arriving events</strong>
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
                <div className={classes.messageContent} data-message-body>
                  <p className={classes.message} data-message data-reveal>
                    {entry.message}
                  </p>
                  {entry.points.length > 0 && (
                    <ul className={classes.messageList}>
                      {entry.points.map((point) => (
                        <li key={point} data-reveal>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
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
