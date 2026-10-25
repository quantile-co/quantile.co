import type { ComponentPropsWithoutRef } from "react";
import classes from "./SkipLink.module.css";

export function SkipLink(props: ComponentPropsWithoutRef<"a">) {
  return <a className={classes.link} {...props} />;
}
