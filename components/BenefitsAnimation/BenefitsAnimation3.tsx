"use client";

import { IconPlayerPause } from "@tabler/icons-react";
import { useAnimate } from "motion/react-mini";
import { useId, useLayoutEffect } from "react";
import shared from "./BenefitsAnimation.module.css";
import classes from "./BenefitsAnimation3.module.css";

// Capacity over time, not completed work or usage. Billing annotations use
// the approved monthly rate of $4,995 per concurrent issue.
// Upgrade 75% through the first period: 2 × $4,995 × 25% = $2,497.50.
const route = "M 0 92 H 120 V 24 H 160 V 58 H 388";
const routeLength = 490;
const duration = 8.5;
const pointInterval = 1.4;
const annotationDelay = 0.2;
const callouts = [
  { id: "start", x: 0, y: 92, edge: "top" },
  { id: "upgrade", x: 120, y: 24, edge: "bottom" },
  { id: "downgrade", x: 160, y: 58, edge: "top" },
  { id: "renewal", x: 320, y: 58, edge: "bottom" },
  { id: "pause", x: 388, y: 58, edge: "top" },
] as const;
const journey = [
  { at: 0, x: 0, y: 92, distance: 0 },
  { at: (pointInterval * 120) / 188, x: 120, y: 92, distance: 120 },
  { at: pointInterval, x: 120, y: 24, distance: 188 },
  {
    at: pointInterval + (pointInterval * 40) / 74,
    x: 160,
    y: 24,
    distance: 228,
  },
  { at: pointInterval * 2, x: 160, y: 58, distance: 262 },
  { at: pointInterval * 3, x: 320, y: 58, distance: 422 },
  { at: pointInterval * 4, x: 388, y: 58, distance: 490 },
  { at: duration, x: 388, y: 58, distance: 490 },
] as const;

export function BenefitsAnimation3() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const maskId = useId();

  useLayoutEffect(() => {
    const element = scope.current;
    const plot = element?.querySelector<HTMLElement>("[data-rate-chart]");
    if (!element || !plot) return;
    const lastMonth = element.querySelector('[data-axis-month="4"]');
    // Measure real text boxes so pointers remain attached as fonts, viewport,
    // and card dimensions change. No per-frame JS or React state updates.
    const updatePointers = () => {
      const bounds = plot.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      if (lastMonth) {
        plot.style.setProperty(
          "--period-end-inset",
          `${lastMonth.getBoundingClientRect().width / 2}px`,
        );
      }
      // Offline collision searches reduce to one responsive constraint: keep
      // pause centered unless the preceding billing box needs that space.
      const billing = element.querySelector('[data-callout="downgrade"]');
      const pause = element.querySelector('[data-callout="pause"]');
      if (billing && pause) {
        plot.style.setProperty(
          "--billing-callout-width",
          `${billing.getBoundingClientRect().width}px`,
        );
        plot.style.setProperty(
          "--pause-callout-width",
          `${pause.getBoundingClientRect().width}px`,
        );
      }
      for (const { id, x, y, edge } of callouts) {
        const box = element.querySelector(`[data-callout="${id}"]`);
        const tail = element.querySelector(`[data-tail="${id}"]`);
        if (!box || !tail) continue;
        const rect = box.getBoundingClientRect();
        const tipX = bounds.left + (x / 480) * bounds.width;
        const baseX = Math.max(rect.left + 10, Math.min(tipX, rect.right - 10));
        // Tuck the open base 1px inside the box to hide its border seam.
        const baseY = edge === "top" ? rect.top + 1 : rect.bottom - 1;
        const left = ((baseX - 4 - bounds.left) / bounds.width) * 480;
        const right = ((baseX + 4 - bounds.left) / bounds.width) * 480;
        const vertical = ((baseY - bounds.top) / bounds.height) * 184;
        tail.setAttribute(
          "d",
          `M ${left} ${vertical} L ${x} ${y} L ${right} ${vertical}`,
        );
      }
    };
    // Defer observer-triggered writes: matching the pause box width can resize
    // an observed note, and writing inside the callback would cause a RO loop.
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(updatePointers);
    });
    observer.observe(plot);
    if (lastMonth) observer.observe(lastMonth);
    for (const box of element.querySelectorAll("[data-callout]"))
      observer.observe(box);
    updatePointers();
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
    };
  }, [scope]);

  useLayoutEffect(() => {
    const element = scope.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let controls: ReturnType<typeof animate>[] = [];
    let inView = false;
    const sync = () => {
      for (const control of controls) {
        if (inView && !document.hidden) control.play();
        else control.pause();
      }
    };
    const cancel = () => {
      for (const control of controls) control.cancel();
      controls = [];
    };
    const start = () => {
      cancel();
      // CSS supplies a completed step chart with a preserved remainder.
      if (preference.matches) return;
      const track = (
        selector: string,
        keyframes: Parameters<typeof animate>[1],
        seconds: readonly number[],
        easing: "easeInOut" | "linear" = "easeInOut",
      ) => {
        controls.push(
          animate(selector, keyframes, {
            duration,
            times: seconds.map((second) => second / duration),
            ease: seconds.slice(1).map(() => easing),
            repeat: Number.POSITIVE_INFINITY,
            autoplay: false,
          }),
        );
      };
      const show = (selector: string, from: number) => {
        track(selector, { opacity: [0, 0, 1, 1] }, [
          0,
          from,
          from + 0.14,
          duration,
        ]);
      };
      const times = journey.map((point) => point.at);
      track(
        "[data-rate-reveal]",
        {
          strokeDashoffset: journey.map(
            (point) => routeLength - point.distance,
          ),
        },
        times,
      );
      track(
        "[data-rate-point]",
        {
          left: journey.map((point) => `${(point.x / 480) * 100}%`),
          top: journey.map((point) => `${(point.y / 184) * 100}%`),
        },
        times,
      );
      // The dot, mask, and milestones reset together at the native loop
      // boundary. Axes stay visible; the graph never fades or rewinds.
      // Equal travel time between events, including renewal and pause; every
      // annotation follows its point by the same delay, independent of distance.
      const notes = [
        "[data-start-note]",
        "[data-increase]",
        "[data-decrease]",
        "[data-renewal-note]",
        "[data-pause-note]",
      ];
      callouts.forEach(({ id }, index) => {
        const at = index * pointInterval;
        if (id !== "start" && id !== "pause")
          show(`[data-milestone="${id}"]`, at);
        show(`${notes[index]}, [data-tail="${id}"]`, at + annotationDelay);
      });
      const pauseAt = pointInterval * 4;
      show("[data-banked]", pauseAt);
      show("[data-pause-mark]", pauseAt);
      track("[data-moving-dot]", { opacity: [1, 1, 0, 0] }, [
        0,
        pauseAt,
        pauseAt + 0.14,
        duration,
      ]);
      sync();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    preference.addEventListener("change", start);
    document.addEventListener("visibilitychange", sync);
    start();
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", sync);
      cancel();
    };
  }, [animate, scope]);

  return (
    <div
      aria-hidden="true"
      className={`${shared.scene} ${classes.scene}`}
      data-benefits-animation="three"
      ref={scope}
    >
      <div className={classes.art} data-capacity-art>
        <div className={classes.chart} data-rate-chart>
          <svg
            viewBox="0 0 480 184"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="-4"
                y="0"
                width="488"
                height="184"
              >
                {/* The reveal geometry scales, but the visible stroke does not.
                    A dashed non-scaling stroke would break at narrow widths. */}
                <path
                  className={classes.reveal}
                  d={route}
                  strokeDasharray={`${routeLength} ${routeLength}`}
                  data-rate-reveal
                />
              </mask>
            </defs>
            <path
              className={classes.axes}
              d="M 0 180 H 480"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className={classes.rateLine}
              d={route}
              mask={`url(#${maskId})`}
              vectorEffect="non-scaling-stroke"
              data-rate-line
            />
          </svg>
          <svg
            className={classes.pointers}
            viewBox="0 0 480 184"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {callouts.map(({ id }) => (
              <path key={id} data-tail={id} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <span
            className={`${classes.xTick} ${classes.firstMonth}`}
            data-axis-month="1"
          >
            Month 1
          </span>
          <span
            className={`${classes.xTick} ${classes.secondMonth}`}
            data-axis-month="2"
          >
            Month 2
          </span>
          <span
            className={`${classes.xTick} ${classes.thirdMonth}`}
            data-axis-month="3"
          >
            Month 3
          </span>
          <span
            className={`${classes.xTick} ${classes.lastMonth}`}
            data-axis-month="4"
          >
            Month 4
          </span>
          <span className={classes.startNote} data-start-note>
            <span className={classes.note} data-callout="start">
              <strong>1 concurrent issue</strong>
              <br />
              $4,995 billed
              <br />
              at period start
            </span>
          </span>
          <span
            className={`${classes.milestonePoint} ${classes.startPoint}`}
            data-milestone="start"
          />
          <span
            className={`${classes.milestonePoint} ${classes.upgradePoint}`}
            data-milestone="upgrade"
          />
          <span
            className={`${classes.milestonePoint} ${classes.downgradePoint}`}
            data-milestone="downgrade"
          />
          <span
            className={`${classes.milestonePoint} ${classes.renewalPoint}`}
            data-milestone="renewal"
          />
          <span className={classes.increase}>
            <span className={classes.milestone} data-increase>
              <span className={classes.note} data-callout="upgrade">
                <strong>3 concurrent issues</strong>
                <br />
                25% of period left
                <br />
                +$2,497.50 prorated
              </span>
            </span>
          </span>
          <span className={classes.decrease}>
            <span className={classes.milestone} data-decrease>
              <span className={classes.note} data-callout="downgrade">
                <strong>2 concurrent issues</strong>
                <br />
                $9,990 billed
                <br />
                at period start
              </span>
            </span>
          </span>
          <span className={classes.renewalNote} data-renewal-note>
            <span className={classes.note} data-callout="renewal">
              <strong>2 concurrent issues</strong>
              <br />
              $9,990 billed
              <br />
              at period start
            </span>
          </span>
          <span className={classes.pauseNote} data-pause-note>
            <span className={classes.note} data-callout="pause">
              <strong>
                Subscription
                <br />
                paused
              </strong>
              <br />
              Time banked
            </span>
          </span>
          <span className={classes.banked} data-banked>
            <svg
              className={classes.savedSegment}
              viewBox="0 0 100 2"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M 0 1 H 100" vectorEffect="non-scaling-stroke" />
            </svg>
            <span
              className={`${classes.milestonePoint} ${classes.periodEndPoint}`}
              data-period-end-point
            />
          </span>
          <span className={classes.point} data-rate-point>
            <span className={classes.dot} data-moving-dot />
            <span className={classes.pause} data-pause-mark>
              <IconPlayerPause />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
