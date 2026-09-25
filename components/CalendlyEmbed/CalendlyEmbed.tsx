"use client";

import { useComputedColorScheme } from "@mantine/core";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import classes from "./CalendlyEmbed.module.css";

const lightCalendlyUrl =
  "https://calendly.com/aj-quantile/30min?hide_gdpr_banner=1&background_color=fafafa&text_color=09090b&primary_color=09090b";
const darkCalendlyUrl =
  "https://calendly.com/aj-quantile/30min?hide_gdpr_banner=1&background_color=09090b&text_color=fafafa&primary_color=fafafa";
const calendlyRenderDelay = 1500;
const calendlyLoadMargin = "1500px 0px";

type CalendlyApi = {
  initInlineWidget: (options: {
    parentElement: HTMLElement;
    url: string;
  }) => void;
};

declare global {
  interface Window {
    Calendly?: CalendlyApi;
  }
}

function useCalendlyVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = ref.current;

    if (!container || visible) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: calendlyLoadMargin },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

function useCalendlyFrame(active: boolean, url: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    const container = ref.current;

    if (!active || !container) {
      return;
    }

    let iframe: HTMLIFrameElement | null = null;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;
    const connectToIframe = () => {
      iframe = container.querySelector("iframe");
    };
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === "https://calendly.com" &&
        event.source === iframe?.contentWindow &&
        event.data?.event === "calendly.event_type_viewed"
      ) {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => setLoadedUrl(url), calendlyRenderDelay);
      }
    };
    const observer = new MutationObserver(connectToIframe);

    connectToIframe();
    observer.observe(container, { childList: true, subtree: true });
    window.addEventListener("message", handleMessage);

    return () => {
      clearTimeout(renderTimer);
      observer.disconnect();
      window.removeEventListener("message", handleMessage);
    };
  }, [active, url]);

  return { loaded: loadedUrl === url, ref };
}

type CalendlyFrameProps = {
  active: boolean;
  scriptReady: boolean;
  url: string;
};

function CalendlyFrame({ active, scriptReady, url }: CalendlyFrameProps) {
  const { loaded, ref } = useCalendlyFrame(active, url);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const widget = widgetRef.current;

    if (!active || !scriptReady || !widget || !window.Calendly) {
      return;
    }

    widget.replaceChildren();
    window.Calendly.initInlineWidget({ parentElement: widget, url });
  }, [active, scriptReady, url]);

  return (
    <div
      aria-busy={active && !loaded ? true : undefined}
      className={classes.embed}
      ref={ref}
    >
      {!loaded && (
        <div
          aria-live={active ? "polite" : undefined}
          className={classes.placeholder}
          role={active ? "status" : undefined}
        >
          Calendly loading...
        </div>
      )}
      <div className={classes.widget} ref={widgetRef} />
    </div>
  );
}

export function CalendlyEmbed() {
  const load = useCalendlyVisibility();
  const colorScheme = useComputedColorScheme("light");
  const [scriptReady, setScriptReady] = useState(false);
  const url = colorScheme === "dark" ? darkCalendlyUrl : lightCalendlyUrl;

  return (
    <div className={classes.root} ref={load.ref}>
      <CalendlyFrame
        active={load.visible}
        scriptReady={scriptReady}
        url={url}
      />
      {load.visible ? (
        <Script
          onReady={() => setScriptReady(true)}
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="afterInteractive"
        />
      ) : null}
    </div>
  );
}
