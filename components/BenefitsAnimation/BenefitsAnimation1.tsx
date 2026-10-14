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
import classes from "./BenefitsAnimation1.module.css";

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
  { number: "#1941", title: "Handle late arriving events" },
  { number: "#2176", title: "Pin deployment images to immutable digests" },
] as const;
const duration = 12.49;

export function BenefitsAnimation1() {
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
        until = 11.64,
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
          11.64,
          11.84,
          duration,
        ]);
        show(after, at);
      };
      const highlight = (selector: string, from: number, until: number) => {
        // A visual cue within the aria-hidden illustration, not DOM focus.
        track(
          selector,
          {
            outlineColor: [
              "transparent",
              "transparent",
              "var(--onboarding-focus-outline)",
              "var(--onboarding-focus-outline)",
              "transparent",
              "transparent",
            ],
          },
          [0, from, from + 0.18, until, until + 0.18, duration],
        );
      };
      const fill = (field: string, from: number, to: number) => {
        track(
          `[data-fill="${field}"]`,
          {
            clipPath: [
              "inset(0 100% 0 0)",
              "inset(0 100% 0 0)",
              "inset(0 0% 0 0)",
              "inset(0 0% 0 0)",
              "inset(0 100% 0 0)",
              "inset(0 100% 0 0)",
            ],
          },
          [0, from, to, 11.64, 11.84, duration],
          "linear",
        );
      };

      // The surfaces never travel or stack. The story is told by payment,
      // permission connections, and a direct backlog reorder.
      track('[data-panel="checkout"]', { opacity: [1, 1, 0, 0, 1, 1] }, [
        0,
        3.75,
        3.99,
        11.79,
        12.29,
        duration,
      ]);
      show('[data-panel="access"]', 3.9, 8.15, 0.52);
      show('[data-panel="backlog"]', 8.25, 11.64, 0.45);

      // The capacity choice gets its own beat before any payment details.
      // These are illustrative values, never a real Checkout form.
      highlight("[data-quantity-control]", 0.1, 1.1);
      highlight("[data-payment-method]", 1.28, 2.55);
      highlight("[data-subscribe]", 2.7, 3.53);
      track(
        "[data-quantity-control]",
        {
          transform: [
            "translateY(0px) scale(1)",
            "translateY(0px) scale(1)",
            "translateY(0.5px) scale(0.97)",
            "translateY(-0.5px) scale(1.01)",
            "translateY(0px) scale(1)",
            "translateY(0px) scale(1)",
          ],
          boxShadow: [
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0 0 rgb(9 9 11 / 0%)",
            "0 0.5rem 1.25rem rgb(9 9 11 / 3%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
          ],
        },
        [0, 0.3, 0.55, 0.8, 1.1, duration],
      );
      track(
        "[data-quantity-plus]",
        {
          transform: [
            "scale(1)",
            "scale(1)",
            "translateY(1px) scale(0.78)",
            "scale(1.3)",
            "scale(1)",
            "scale(1)",
          ],
        },
        [0, 0.3, 0.55, 0.8, 1.1, duration],
      );
      swap("[data-quantity-zero]", "[data-quantity-one]", 0.8);
      track(
        "[data-quantity-one]",
        {
          transform: [
            "translateY(4px)",
            "translateY(4px)",
            "translateY(0px)",
            "translateY(0px)",
            "translateY(4px)",
            "translateY(4px)",
          ],
        },
        [0, 0.8, 1.01, 11.64, 11.84, duration],
      );
      // Masked placeholders fill in sequence within fixed-width slots.
      fill("holder", 1.47, 1.7);
      fill("number", 1.74, 2.13);
      fill("expiry", 2.17, 2.34);
      fill("cvv", 2.38, 2.55);

      track(
        "[data-subscribe]",
        {
          transform: [
            "translateY(0px) scale(1)",
            "translateY(0px) scale(1)",
            "translateY(0.75px) scale(0.965)",
            "translateY(-0.4px) scale(1.015)",
            "translateY(0px) scale(1)",
            "translateY(0px) scale(1)",
          ],
          boxShadow: [
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0 0 rgb(9 9 11 / 0%)",
            "0 0.75rem 1.5rem rgb(9 9 11 / 5%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
            "0 0.375rem 1rem rgb(9 9 11 / 2%)",
          ],
        },
        [0, 3, 3.14, 3.26, 3.42, duration],
      );
      swap("[data-subscribe-label]", "[data-subscribed-label]", 3.4);
      tools.forEach((_, index) => {
        // Bounce, send the highlight, and finish the check before the next
        // card starts. The 0.72s spacing leaves a gap after the 0.69s check.
        const at = 4.35 + index * 0.72;
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
          [0, at + 0.25, at + 0.55, 11.64, 11.84, duration],
          "linear",
        );
        show(`[data-access-check="${index}"]`, at);
        track(
          `[data-tool-card="${index}"]`,
          {
            borderColor: [
              "var(--site-divider-color)",
              "var(--site-divider-color)",
              "var(--site-surface-outline)",
              "var(--site-surface-outline)",
              "var(--site-divider-color)",
              "var(--site-divider-color)",
            ],
          },
          [0, at, at + 0.14, 8.15, 8.35, duration],
        );
        track(
          `[data-tool-card="${index}"]`,
          {
            transform: [
              "translateY(0px) scale(1)",
              "translateY(0px) scale(1)",
              "translateY(-3px) scale(1.05)",
              "translateY(0px) scale(1)",
              "translateY(0px) scale(1)",
            ],
          },
          [0, at, at + 0.1, at + 0.24, duration],
        );
      });
      track(
        "[data-aj-hub]",
        {
          transform: [
            "scale(1)",
            "scale(1)",
            "scale(1.08)",
            "scale(1)",
            "scale(1)",
          ],
        },
        [0, 7.25, 7.39, 7.62, duration],
      );

      swap("[data-priority-normal]", "[data-priority-high]", 8.95);
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
        [0, 9.2, 9.65, duration],
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
        [0, 9.2, 9.65, duration],
      );
      show("[data-assignee]", 10);
      track(
        "[data-assignee]",
        { transform: ["scale(0.65)", "scale(0.65)", "scale(1)", "scale(1)"] },
        [0, 10, 10.14, duration],
      );
      swap("[data-status-todo]", "[data-status-progress]", 10.35);
      track("[data-backlog-prioritize]", { opacity: [1, 1, 0, 0, 1, 1] }, [
        0,
        9.8,
        9.94,
        11.64,
        11.84,
        duration,
      ]);
      show("[data-backlog-assign]", 9.8, 10.35);
      show("[data-backlog-progress]", 10.35);
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
                <span className={classes.quantity} data-quantity-control>
                  <IconMinus />
                  <span className={classes.quantityValue}>
                    <strong data-quantity-zero data-before>
                      0
                    </strong>
                    <strong data-quantity-one>1</strong>
                  </span>
                  <IconPlus data-quantity-plus />
                </span>
              </div>
              <div className={classes.paymentMethod} data-payment-method>
                <IconCreditCard />
                <div className={classes.cardHolder} data-card-field="holder">
                  <span className={classes.fieldLabel}>Cardholder</span>
                  <span data-card-name data-fill="holder">
                    •••••• ••••••••
                  </span>
                </div>
                <div data-card-field="number">
                  <span className={classes.fieldLabel}>Card number</span>
                  <span data-card-number data-fill="number">
                    •••• •••• •••• ••••
                  </span>
                </div>
                <div data-card-field="expiry">
                  <span className={classes.fieldLabel}>Expiry</span>
                  <span data-fill="expiry">•• / ••</span>
                </div>
                <div data-card-field="cvv">
                  <span className={classes.fieldLabel}>CVV</span>
                  <span data-fill="cvv">•••</span>
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
              <span className={classes.subscribeCheck}>
                <IconCheck />
              </span>
              Subscribed
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
            <span className={shared.avatar} data-aj data-aj-hub />
          </div>
          <div className={classes.tools}>
            {tools.map(({ name, icon: Icon }, index) => (
              <div className={classes.accessRow} key={name}>
                <div className={classes.tool} data-tool-card={index}>
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
