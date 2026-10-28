import { Button } from "@mantine/core";
import type { ReactNode } from "react";

function CheckoutForm({ children }: { children: ReactNode }) {
  return (
    <form action="/api/stripe/checkout" method="post">
      {children}
    </form>
  );
}

export function CheckoutAction({
  size,
  siteCta,
}: {
  size: "xs" | "md";
  siteCta?: "section";
}) {
  return (
    <CheckoutForm>
      <Button
        autoContrast
        data-site-cta={siteCta}
        size={size}
        type="submit"
        variant="filled"
      >
        Start building
      </Button>
    </CheckoutForm>
  );
}
