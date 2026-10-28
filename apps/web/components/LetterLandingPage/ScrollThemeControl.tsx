"use client";

import { type ReactNode, useEffect, useState } from "react";
import classes from "./LetterLandingPage.module.css";

export function ScrollThemeControl({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: number | undefined;
    const reveal = () => {
      window.clearTimeout(timeout);
      setVisible(true);
      timeout = window.setTimeout(() => setVisible(false), 1000);
    };

    window.addEventListener("scroll", reveal, { passive: true });
    return () => {
      window.removeEventListener("scroll", reveal);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={classes.themeSwitcher} data-visible={visible || undefined}>
      {children}
    </div>
  );
}
