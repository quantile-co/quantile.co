import { Button } from "@mantine/core";
import classes from "./CTAButton.module.css";

export function CTAButton() {
  return (
    <Button
      autoContrast
      className={classes.button}
      component="a"
      data-site-cta="booking"
      href="https://cal.com/aj-welch/book-a-call"
      rel="noopener noreferrer"
      size="xs"
      target="_blank"
      variant="filled"
    >
      Book a call
    </Button>
  );
}
