"use client";

import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandSlack,
  IconBrandStripe,
  IconCheck,
  IconCloud,
  IconCreditCard,
  IconGripVertical,
  IconLayoutKanban,
  IconLock,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { useAnimate } from "motion/react-mini";
import { useId, useLayoutEffect } from "react";
import shared from "./BenefitsAnimation.module.css";
import classes from "./BenefitsAnimationOne.module.css";

const tools = [
  {
    name: "GitHub",
    icon: IconBrandGithub,
    origin: "44 45",
    route: "M 0 0 H -2 Q -4 0 -4 -2 V -23 Q -4 -25 -6 -25 H -12",
  },
  {
    name: "Linear",
    icon: IconLayoutKanban,
    origin: "56 45",
    route: "M 0 0 H 2 Q 4 0 4 -2 V -23 Q 4 -25 6 -25 H 12",
  },
  {
    name: "Slack",
    icon: IconBrandSlack,
    origin: "44 55",
    route: "M 0 0 H -2 Q -4 0 -4 2 V 23 Q -4 25 -6 25 H -12",
  },
  {
    name: "Cloud",
    icon: IconCloud,
    origin: "56 55",
    route: "M 0 0 H 2 Q 4 0 4 2 V 23 Q 4 25 6 25 H 12",
  },
] as const;
const issues = [
  { number: "#1642", title: "Add regression evals for tool selection" },
  { number: "#1941", title: "Handle late-arriving events" },
  { number: "#2176", title: "Pin deployment images to immutable digests" },
] as const;
const duration = 12;

export function BenefitsAnimationOne() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const connectionId = useId();

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
      delete element.dataset.animated;
    };
    const start = () => {
      cancel();
      // CSS supplies the completed, static backlog for SSR/reduced motion.
      if (preference.matches) return;
      element.dataset.animated = "true";
      const track = (
        selector: string,
        keyframes: Parameters<typeof animate>[1],
        seconds: number[],
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
      const show = (
        selector: string,
        at: number,
        until = 11.1,
        enter = 0.14,
      ) => {
        track(selector, { opacity: [0, 0, 1, 1, 0, 0] }, [
          0,
          at,
          at + enter,
          until,
          until + 0.2,
          duration,
        ]);
      };
      const swap = (before: string, after: string, at: number) => {
        track(before, { opacity: [1, 1, 0, 0, 1, 1] }, [
          0,
          at,
          at + 0.14,
          11.1,
          11.3,
          duration,
        ]);
        show(after, at);
      };

      // The surfaces never travel or stack. The story is told by payment,
      // permission connections, and a direct backlog reorder.
      track('[data-panel="checkout"]', { opacity: [1, 1, 0, 0, 1, 1] }, [
        0,
        1.7,
        1.94,
        11.25,
        11.77,
        duration,
      ]);
      show('[data-panel="access"]', 1.85, 5.45, 0.52);
      show('[data-panel="backlog"]', 5.6, 11.1, 0.52);

      track(
        "[data-subscribe]",
        {
          transform: [
            "scale(1)",
            "scale(1)",
            "scale(0.98)",
            "scale(1)",
            "scale(1)",
          ],
        },
        [0, 0.7, 0.84, 1.04, duration],
      );
      swap("[data-subscribe-label]", "[data-subscribed-label]", 1.1);
      tools.forEach((_, index) => {
        const at = 2.3 + index * 0.45;
        const selector = `[data-connection="${index}"]`;
        const path = element.querySelector<SVGPathElement>(selector);
        if (!path) return;
        const length = path.getTotalLength();
        // Animate a short highlight in a scaling mask, not the non-scaling
        // visible stroke. Otherwise user-unit dash lengths repeat in screen
        // pixels as the SVG grows, producing different patterns on desktop.
        const beam = length * 0.28;
        const dash = `${beam} ${length + beam}`;
        track(
          selector,
          {
            strokeDasharray: [dash, dash, dash, dash, dash, dash],
            strokeDashoffset: [-length, -length, beam, beam, -length, -length],
          },
          [0, at, at + 0.65, 11.1, 11.3, duration],
          "linear",
        );
        show(`[data-access-check="${index}"]`, at + 0.65);
        track(
          `[data-tool-icon="${index}"]`,
          {
            transform: [
              "translateY(0px) scale(1)",
              "translateY(0px) scale(1)",
              "translateY(-2px) scale(1.12)",
              "translateY(0px) scale(1)",
              "translateY(0px) scale(1)",
            ],
          },
          [0, at + 0.65, at + 0.79, at + 0.99, duration],
        );
      });

      swap("[data-priority-normal]", "[data-priority-high]", 6.45);
      track(
        '[data-issue="0"]',
        {
          transform: [
            "translateY(0%)",
            "translateY(0%)",
            "translateY(100%)",
            "translateY(100%)",
          ],
        },
        [0, 6.7, 7.22, duration],
      );
      track(
        '[data-issue="1"]',
        {
          transform: [
            "translateY(0%)",
            "translateY(0%)",
            "translateY(-100%)",
            "translateY(-100%)",
          ],
        },
        [0, 6.7, 7.22, duration],
      );
      show("[data-assignee]", 7.7);
      track(
        "[data-assignee]",
        { transform: ["scale(0.65)", "scale(0.65)", "scale(1)", "scale(1)"] },
        [0, 7.7, 7.84, duration],
      );
      swap("[data-status-todo]", "[data-status-progress]", 8.1);
      track("[data-backlog-prioritize]", { opacity: [1, 1, 0, 0, 1, 1] }, [
        0,
        7.3,
        7.44,
        11.1,
        11.3,
        duration,
      ]);
      show("[data-backlog-assign]", 7.3, 8.1);
      show("[data-backlog-progress]", 8.1);
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
      ref={scope}
      data-benefits-animation="one"
    >
      <div className={classes.stageArea} data-onboarding-area>
        <div
          className={`${shared.surface} ${classes.panelSurface} ${classes.checkout}`}
          data-panel="checkout"
        >
          <div className={classes.checkoutHeading}>
            <IconBrandStripe />
            <strong>Stripe</strong>
            <IconLock className={classes.lock} />
          </div>
          <div className={classes.checkoutBody}>
            <div className={classes.payment} data-payment>
              <div className={classes.plan}>
                <strong>Engineering capacity</strong>
                <span className={classes.badge}>Monthly</span>
              </div>
              <div className={classes.capacity}>
                <span>Concurrent issues</span>
                <span className={classes.quantity}>
                  <IconMinus />
                  <strong>1</strong>
                  <IconPlus />
                </span>
              </div>
              <div className={classes.paymentMethod}>
                <IconCreditCard />
                <div className={classes.cardHolder} data-card-field="holder">
                  <span className={classes.fieldLabel}>Cardholder</span>
                  <span data-card-name>•••••• ••••••••</span>
                </div>
                <div data-card-field="number">
                  <span className={classes.fieldLabel}>Card number</span>
                  <span data-card-number>•••• •••• •••• ••••</span>
                </div>
                <div data-card-field="expiry">
                  <span className={classes.fieldLabel}>Expiry</span>
                  <span>•• / ••</span>
                </div>
                <div data-card-field="cvv">
                  <span className={classes.fieldLabel}>CVV</span>
                  <span>•••</span>
                </div>
              </div>
            </div>
          </div>
          {/* Illustration only: never a real checkout button or form. */}
          <span className={classes.subscribe} data-subscribe>
            <span data-subscribe-label data-before>
              Subscribe <IconArrowRight />
            </span>
            <span data-subscribed-label>
              <IconCheck /> Subscribed
            </span>
          </span>
        </div>

        <div className={classes.access} data-panel="access">
          <svg
            className={classes.connections}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {tools.map((tool, index) => (
              <g key={tool.name} transform={`translate(${tool.origin})`}>
                <path
                  d={tool.route}
                  className={classes.connectionTrack}
                  vectorEffect="non-scaling-stroke"
                />
                <defs>
                  <mask
                    id={`${connectionId}-${index}`}
                    maskUnits="userSpaceOnUse"
                    x="-15"
                    y="-28"
                    width="30"
                    height="56"
                  >
                    <path
                      d={tool.route}
                      className={classes.connectionMask}
                      data-connection={index}
                    />
                  </mask>
                </defs>
                <path
                  d={tool.route}
                  className={classes.connectionSignal}
                  vectorEffect="non-scaling-stroke"
                  mask={`url(#${connectionId}-${index})`}
                  data-connection-signal={index}
                />
              </g>
            ))}
          </svg>
          <div className={classes.accessHub}>
            <span className={shared.avatar} data-aj />
          </div>
          <div className={classes.tools}>
            {tools.map(({ name, icon: Icon }, index) => (
              <div className={classes.accessRow} key={name}>
                <div className={classes.tool}>
                  <div className={classes.toolHeading}>
                    <Icon data-tool-icon={index} />
                    <strong>{name}</strong>
                  </div>
                  <span
                    className={classes.accessCheck}
                    data-access-check={index}
                  >
                    <IconCheck />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${shared.surface} ${classes.panelSurface} ${classes.backlog}`}
          data-panel="backlog"
        >
          <div className={classes.backlogHeading}>
            <IconLayoutKanban />
            <strong>Issues</strong>
            <span
              className={`${classes.badge} ${classes.swap} ${classes.backlogAction}`}
            >
              <span data-backlog-prioritize data-before>
                Prioritize
              </span>
              <span data-backlog-assign data-before>
                Assign
              </span>
              <span data-backlog-progress>1 in progress</span>
            </span>
          </div>
          <div className={classes.issues}>
            {issues.map((issue, index) => (
              <div
                className={classes.issueSlot}
                data-issue={index}
                key={issue.number}
              >
                <div className={classes.issueCard}>
                  <IconGripVertical className={classes.grip} />
                  <div className={classes.issueCopy}>
                    <strong>{issue.title}</strong>
                    <span className={classes.issueMeta}>
                      <span className={classes.issueNumber}>
                        {issue.number}
                      </span>
                      {index === 1 ? (
                        <>
                          <span className={classes.swap}>
                            <span data-priority-normal data-before>
                              Normal
                            </span>
                            <span data-priority-high>↑ High</span>
                          </span>
                          <span className={classes.swap}>
                            <span data-status-todo data-before>
                              Todo
                            </span>
                            <span data-status-progress>In progress</span>
                          </span>
                        </>
                      ) : (
                        <span>Todo</span>
                      )}
                    </span>
                  </div>
                  {index === 1 && (
                    <span className={shared.avatar} data-aj data-assignee />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
